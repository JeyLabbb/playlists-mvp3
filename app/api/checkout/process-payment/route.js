import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

/**
 * 🚨 CRITICAL: Este endpoint procesa el pago desde el session_id de Stripe
 * PRIORIDAD: Usa el email del usuario autenticado (si existe), sino usa el email de Stripe
 * Se llama desde la página de success cuando el usuario completa el pago
 */
export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('[PROCESS-PAYMENT] Processing payment for session:', sessionId);

    // Get session details from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!stripeSession) {
      return NextResponse.json({ error: 'Stripe session not found' }, { status: 404 });
    }

    // 🚨 CRITICAL: PRIORIDAD 1 - Intentar obtener el usuario autenticado
    let userEmail = null;
    let isAuthenticatedUser = false;
    
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        userEmail = session.user.email.toLowerCase();
        isAuthenticatedUser = true;
        console.log('[PROCESS-PAYMENT] ✅ Using authenticated user email:', userEmail);
      }
    } catch (authError) {
      console.log('[PROCESS-PAYMENT] No authenticated session found, will use Stripe email');
    }
    
    // 🚨 CRITICAL: PRIORIDAD 2 - Si no hay usuario autenticado, usar email de Stripe como fallback
    if (!userEmail) {
      userEmail = (stripeSession.customer_details?.email || stripeSession.customer_email)?.toLowerCase();
      if (!userEmail) {
        return NextResponse.json({ error: 'No email found in Stripe session and user not authenticated' }, { status: 400 });
      }
      console.log('[PROCESS-PAYMENT] ⚠️ Using Stripe email (no authenticated user):', userEmail);
    }

    const normalizedEmail = userEmail;

    console.log('[PROCESS-PAYMENT] Payment details:', {
      id: stripeSession.id,
      email: normalizedEmail,
      isAuthenticatedUser: isAuthenticatedUser,
      stripeEmail: stripeSession.customer_details?.email || stripeSession.customer_email,
      amount_total: stripeSession.amount_total,
      payment_status: stripeSession.payment_status
    });

    // Get line items to check if it's a Founder Pass
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const isFounderPass = lineItems.data.some(item => 
      item.price?.id === process.env.STRIPE_PRICE_FOUNDER
    );

    console.log('[PROCESS-PAYMENT] Is Founder Pass:', isFounderPass);

    if (isFounderPass) {
      // 🚨 CRITICAL: Actualizar Supabase directamente usando el email de Stripe
      const now = new Date().toISOString();
      
      try {
        // 🚨 CRITICAL: Actualizar plan en Supabase primero
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const supabaseAdmin = getSupabaseAdmin();
        
        // Verificar plan actual antes de actualizar
        const { data: beforeUpdate } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, max_uses, founder_source')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        console.log('[PROCESS-PAYMENT] Plan BEFORE update:', {
          email: normalizedEmail,
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
            founder_source: 'purchase' // 'purchase' o 'referral'
          })
          .eq('email', normalizedEmail);
        
        if (updateError) {
          console.error('[PROCESS-PAYMENT] ❌ Error updating plan in Supabase:', updateError);
          throw updateError;
        }
        
        // Verificar que se actualizó correctamente
        await new Promise(resolve => setTimeout(resolve, 200));
        const { data: afterUpdate } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, max_uses, founder_source')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (afterUpdate?.plan === 'founder' && afterUpdate?.max_uses === null) {
          console.log('[PROCESS-PAYMENT] ✅ Plan updated to founder in Supabase (verified):', {
            email: normalizedEmail,
            plan: afterUpdate.plan,
            max_uses: afterUpdate.max_uses,
            founder_source: afterUpdate.founder_source || 'purchase'
          });
          
          // 🚨 CRITICAL: Registrar pago en Supabase
          try {
            function getBaseUrl() {
              return process.env.NEXT_PUBLIC_SITE_URL ||
                process.env.NEXTAUTH_URL ||
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://playlists.jeylabbb.com');
            }
            
            const baseUrl = getBaseUrl();
            const logResponse = await fetch(`${baseUrl}/api/telemetry/ingest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'payment',
                payload: {
                  email: normalizedEmail,
                  stripePaymentIntentId: stripeSession.payment_intent || stripeSession.id,
                  stripeCustomerId: stripeSession.customer || null,
                  amount: stripeSession.amount_total || 500,
                  plan: 'founder',
                  status: 'completed'
                }
              })
            });
            
            if (logResponse.ok) {
              const logResult = await logResponse.json();
              console.log('[PROCESS-PAYMENT] ✅ Payment logged to Supabase:', logResult);
            } else {
              console.error('[PROCESS-PAYMENT] ⚠️ Failed to log payment to Supabase:', await logResponse.text());
            }
          } catch (logError) {
            console.error('[PROCESS-PAYMENT] ❌ Error logging payment to Supabase:', logError);
          }
          
          // 🚨 CRITICAL: Actualizar KV DESPUÉS de Supabase (KV es solo caché)
          const kv = await import('@vercel/kv');
          const profileKey = `jey_user_profile:${normalizedEmail}`;
          const existingProfile = await kv.kv.get(profileKey) || {};
          const updatedProfile = {
            ...existingProfile,
            email: normalizedEmail,
            plan: 'founder',
            founderSince: now,
            updatedAt: now
          };
          await kv.kv.set(profileKey, updatedProfile);
          console.log('[PROCESS-PAYMENT] ✅ KV updated after Supabase update');
          
          // 🚨 CRITICAL: SOLO ENVIAR EMAIL DESPUÉS de verificar que Supabase se actualizó correctamente
          // Solo enviar si el plan cambió de free a founder
          if (beforeUpdate?.plan !== 'founder') {
            try {
              const { sendFounderWelcomeEmail } = await import('@/lib/newsletter/workflows');
              const emailSent = await sendFounderWelcomeEmail(normalizedEmail, {
                origin: 'checkout_success_page'
              });
              
              if (emailSent) {
                console.log('[PROCESS-PAYMENT] ✅ Founder welcome email sent to:', normalizedEmail);
              } else {
                console.warn('[PROCESS-PAYMENT] ⚠️ Failed to send founder welcome email to:', normalizedEmail);
              }
            } catch (emailError) {
              console.error('[PROCESS-PAYMENT] ❌ Error sending founder welcome email:', emailError);
            }
          }
          
          // También enviar email de confirmación de pago
          try {
            const { sendConfirmationEmail } = await import('../../../../lib/resend');
            const planName = 'Founder Pass';
            const amount = (stripeSession.amount_total / 100).toFixed(2);
            const date = new Date(stripeSession.created * 1000).toLocaleDateString('es-ES');
            
            const emailSent = await sendConfirmationEmail(normalizedEmail, {
              planName,
              amount,
              date,
              sessionId: stripeSession.id
            });
            
            if (emailSent) {
              console.log('[PROCESS-PAYMENT] ✅ Confirmation email sent to:', normalizedEmail);
            } else {
              console.warn('[PROCESS-PAYMENT] ⚠️ Failed to send confirmation email to:', normalizedEmail);
            }
          } catch (emailError) {
            console.error('[PROCESS-PAYMENT] ❌ Error sending confirmation email:', emailError);
          }
          
          return NextResponse.json({ 
            success: true, 
            message: 'Payment processed and account updated',
            isFounder: true,
            email: normalizedEmail,
            profile: afterUpdate
          });
        } else {
          console.error('[PROCESS-PAYMENT] ❌ Plan not updated correctly in Supabase! Still:', {
            plan: afterUpdate?.plan,
            max_uses: afterUpdate?.max_uses
          });
          throw new Error('Plan update verification failed');
        }
      } catch (error) {
        console.error('[PROCESS-PAYMENT] ❌ Error processing payment:', error);
        return NextResponse.json({ 
          error: 'Failed to process payment', 
          details: error.message 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Not a Founder Pass purchase',
      email: normalizedEmail,
      isFounderPass
    });

  } catch (error) {
    console.error('[PROCESS-PAYMENT] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process payment', 
      details: error.message 
    }, { status: 500 });
  }
}

