import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { CHECKOUT_ENABLED } from '../../../../lib/flags';
import { sendConfirmationEmail } from '../../../../lib/resend';

// Helper to get base URL for internal API calls
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://playlists.jeylabbb.com');
}

// Helper to log payments to Supabase via telemetry API
async function logPayment(userEmail, stripePaymentIntentId, stripeCustomerId, amount, plan, status = 'completed') {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'payment',
        payload: {
          email: userEmail,
          stripePaymentIntentId: stripePaymentIntentId,
          stripeCustomerId: stripeCustomerId,
          amount: amount,
          plan: plan,
          status: status
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PAYMENT] Error logging payment:', errorText);
      return { ok: false, error: errorText };
    } else {
      const result = await response.json();
      console.log(`[PAYMENT] logged payment for ${userEmail}`, result);
      return result;
    }
  } catch (error) {
    console.error('[PAYMENT] Error in logPayment:', error);
    return { ok: false, error: error.message };
  }
}

export const config = { api: { bodyParser: false } }; // si hiciera falta, en app router usa buffer

export async function POST(req) {
  console.log('[STRIPE WEBHOOK] ===== WEBHOOK RECEIVED =====');
  
  if (!CHECKOUT_ENABLED) {
    console.log('[STRIPE WEBHOOK] Checkout disabled');
    return NextResponse.json({}, { status: 403 });
  }

  const sig = req.headers.get('stripe-signature');
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  const buf = Buffer.from(await req.arrayBuffer());

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, whsec);
    console.log('[STRIPE WEBHOOK] Event type:', event.type);
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Webhook signature failed', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.info('[STRIPE] checkout.session.completed', session.customer_details?.email || session.customer_email);

    // Get line items once for both Founder marking and email
    let lineItems = null;
    let isFounderPass = false;
    let isMonthly = false;
    
    try {
      lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      isFounderPass = lineItems.data.some(item => 
        item.price?.id === process.env.STRIPE_PRICE_FOUNDER
      );
      isMonthly = lineItems.data.some(item => 
        item.price?.id === process.env.STRIPE_PRICE_MONTHLY
      );
    } catch (error) {
      console.error('[STRIPE] Error fetching line items:', error);
    }

    // Debug logging
    console.log('[STRIPE] Debug info:', {
      isFounderPass,
      isMonthly,
      customerEmail: session.customer_details?.email,
      lineItemsCount: lineItems?.data?.length || 0,
      founderPriceId: process.env.STRIPE_PRICE_FOUNDER
    });

    // Check if this is a Founder Pass and mark user accordingly
    if (isFounderPass && session.customer_details?.email) {
      const userEmail = session.customer_details.email.toLowerCase();
      const now = new Date().toISOString();
      
      try {
        // 🚨 CRITICAL: Actualizar plan en Supabase primero
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const supabaseAdmin = getSupabaseAdmin();
        
        // Verificar plan actual antes de actualizar
        const { data: beforeUpdate } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, max_uses, founder_source')
          .eq('email', userEmail)
          .maybeSingle();
        
        console.log('[STRIPE] Plan BEFORE update:', {
          email: userEmail,
          planBefore: beforeUpdate?.plan,
          needsUpdate: beforeUpdate?.plan !== 'founder'
        });
        
        // 🚨 CRITICAL: Actualizar plan en Supabase con founder_source = 'purchase'
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            plan: 'founder',
            max_uses: null, // Unlimited
            updated_at: now,
            // 🚨 NEW: Marcar que el founder se obtuvo mediante compra
            founder_source: 'purchase' // 'purchase' o 'referral'
          })
          .eq('email', userEmail);
        
        if (updateError) {
          console.error('[STRIPE] ❌ Error updating plan in Supabase:', updateError);
        } else {
          // Verificar que se actualizó correctamente
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: afterUpdate } = await supabaseAdmin
            .from('users')
            .select('id, email, plan, max_uses, founder_source')
            .eq('email', userEmail)
            .maybeSingle();
          
            if (afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null) {
            console.log('[STRIPE] ✅ Plan updated to founder in Supabase (verified):', {
              email: userEmail,
              plan: afterUpdate.plan,
              max_uses: afterUpdate.max_uses,
              founder_source: afterUpdate.founder_source || 'purchase'
            });
            
            // 🚨 CRITICAL: Registrar pago en Supabase DESPUÉS de actualizar el plan
            try {
              const baseUrl = getBaseUrl();
              const logResponse = await fetch(`${baseUrl}/api/telemetry/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'payment',
                  payload: {
                    email: userEmail,
                    stripePaymentIntentId: session.payment_intent || session.id,
                    stripeCustomerId: session.customer || null,
                    amount: session.amount_total || 500, // 5€ en centavos
                    plan: 'founder',
                    status: 'completed'
                  }
                })
              });
              
              if (logResponse.ok) {
                const logResult = await logResponse.json();
                console.log('[STRIPE] ✅ Payment logged to Supabase:', logResult);
              } else {
                console.error('[STRIPE] ⚠️ Failed to log payment to Supabase:', await logResponse.text());
              }
            } catch (logError) {
              console.error('[STRIPE] ❌ Error logging payment to Supabase:', logError);
            }
            
            // 🚨 CRITICAL: Actualizar KV DESPUÉS de Supabase (KV es solo caché, Supabase es la fuente de verdad)
            const kv = await import('@vercel/kv');
            const profileKey = `jey_user_profile:${userEmail}`;
            const existingProfile = await kv.kv.get(profileKey) || {};
            const updatedProfile = {
              ...existingProfile,
              email: userEmail,
              plan: 'founder',
              founderSince: now,
              updatedAt: now
            };
            await kv.kv.set(profileKey, updatedProfile);
            console.info('[STRIPE] ✅ KV updated after Supabase update');
            
            // 🚨 CRITICAL: SOLO ENVIAR EMAIL DESPUÉS de verificar que Supabase se actualizó correctamente
            // Solo enviar si el plan cambió de free a founder
            if (beforeUpdate?.plan !== 'founder') {
              try {
                const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
                const emailSent = await sendFounderWelcomeEmail(userEmail, {
                  origin: 'stripe_payment_completed'
                });
                
                if (emailSent) {
                  console.log('[STRIPE] ✅ Founder welcome email sent to:', userEmail);
                } else {
                  console.warn('[STRIPE] ⚠️ Failed to send founder welcome email to:', userEmail);
                }
              } catch (emailError) {
                console.error('[STRIPE] ❌ Error sending founder welcome email:', emailError);
                // No fallar el proceso si falla el email
              }
            } else {
              console.log('[STRIPE] ℹ️ User already had founder plan, skipping welcome email');
            }
          } else {
            console.error('[STRIPE] ❌ Plan not updated correctly in Supabase! Still:', {
              plan: afterUpdate?.plan,
              max_uses: afterUpdate?.max_uses
            });
          }
        }
        
      } catch (error) {
        console.error('[STRIPE] ❌ Error marking user as Founder:', error);
      }
    }

    // Send confirmation email
    if (session.customer_details?.email) {
      try {
        const planName = isFounderPass ? 'Founder Pass' : isMonthly ? 'PLEIA Monthly' : 'Plan';
        const amount = (session.amount_total / 100).toFixed(2);
        const date = new Date(session.created * 1000).toLocaleDateString('es-ES');
        
        const emailSent = await sendConfirmationEmail(session.customer_details.email, {
          planName,
          amount,
          date,
          sessionId: session.id
        });
        
        if (emailSent) {
          console.info('[MAIL] founder_confirmation sent', session.customer_details.email);
          // 🚨 NOTE: El pago ya se registró en Supabase después de actualizar el plan (ver código anterior)
        } else {
          console.error('[EMAIL] Failed to send confirmation email to:', session.customer_details.email);
        }
      } catch (emailError) {
        console.error('[EMAIL] Error sending confirmation email:', emailError);
      }
    }
  }
  
  if (event.type === 'invoice.payment_succeeded') {
    console.info('[STRIPE] invoice.payment_succeeded', event.data.object['id']);
  }

  return NextResponse.json({ received: true });
}
