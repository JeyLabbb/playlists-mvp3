import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { CHECKOUT_ENABLED } from '../../../../lib/flags';
import { sendConfirmationEmail } from '../../../../lib/resend';

// Helper to log payments to Supabase via telemetry API
async function logPayment(userEmail, stripePaymentIntentId, stripeCustomerId, amount, plan, status = 'completed') {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
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
      try {
        // Mark user as Founder using direct KV access
        const kv = await import('@vercel/kv');
        const profileKey = `jey_user_profile:${session.customer_details.email}`;
        
        // Get existing profile
        const existingProfile = await kv.kv.get(profileKey) || {};
        
        // Update with Founder status
        const updatedProfile = {
          ...existingProfile,
          email: session.customer_details.email,
          plan: 'founder',
          founderSince: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await kv.kv.set(profileKey, updatedProfile);
        console.info('[STRIPE] User marked as Founder:', session.customer_details.email, updatedProfile);
        
        // Payment logging moved to AFTER email is sent
      } catch (error) {
        console.error('[STRIPE] Error marking user as Founder:', error);
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
          
          // Log payment to Supabase AFTER email is sent
          console.log(`[STRIPE] ===== LOGGING PAYMENT TO SUPABASE (AFTER EMAIL) =====`);
          console.log(`[STRIPE] Email: ${session.customer_details.email}`);
          console.log(`[STRIPE] Amount: ${session.amount_total}`);
          console.log(`[STRIPE] Plan: founder`);
          
          try {
            const logResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'payment',
                payload: {
                  email: session.customer_details.email,
                  stripePaymentIntentId: session.payment_intent,
                  stripeCustomerId: session.customer,
                  amount: session.amount_total,
                  plan: 'founder',
                  status: 'completed'
                }
              })
            });
            
            if (logResponse.ok) {
              const logResult = await logResponse.json();
              console.log(`[STRIPE] ===== PAYMENT LOGGED TO SUPABASE (AFTER EMAIL) =====`, logResult);
            } else {
              console.error(`[STRIPE] Failed to log payment (after email):`, await logResponse.text());
            }
          } catch (logError) {
            console.error(`[STRIPE] Error logging payment (after email):`, logError);
          }
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
