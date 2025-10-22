import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { CHECKOUT_ENABLED } from '../../../../lib/flags';
import { resend } from '../../../../lib/resend';

export const config = { api: { bodyParser: false } }; // si hiciera falta, en app router usa buffer

export async function POST(req) {
  if (!CHECKOUT_ENABLED) {
    return NextResponse.json({}, { status: 403 });
  }

  const sig = req.headers.get('stripe-signature');
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  const buf = Buffer.from(await req.arrayBuffer());

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, whsec);
  } catch (err) {
    console.error('Webhook signature failed', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.info('[STRIPE] checkout.session.completed', {
      id: session.id, 
      customer: session.customer, 
      email: session.customer_details?.email, 
      amount_total: session.amount_total
    });

    // Check if this is a Founder Pass and mark user accordingly
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const isFounderPass = lineItems.data.some(item => 
        item.price?.id === process.env.STRIPE_PRICE_FOUNDER
      );
      
      if (isFounderPass && session.customer_details?.email) {
        // Mark user as Founder in their profile
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: session.customer_details.email,
            plan: 'founder',
            founderSince: new Date().toISOString()
          }),
        });
        console.info('[STRIPE] User marked as Founder:', session.customer_details.email);
      }
    } catch (error) {
      console.error('[STRIPE] Error marking user as Founder:', error);
    }

    // Send confirmation email
    if (session.customer_details?.email && resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'PLEIA <noreply@pleia.com>',
          to: session.customer_details.email,
          subject: '¡Pago confirmado! - PLEIA',
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0F14; color: #EAF2FF; padding: 40px;">
              <div style="background: #0F141B; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="width: 60px; height: 60px; background: rgba(54, 226, 180, 0.1); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                    <span style="color: #36E2B4; font-size: 24px;">✓</span>
                  </div>
                  <h1 style="color: #EAF2FF; font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; margin: 0;">
                    ¡Pago confirmado!
                  </h1>
                </div>
                
                <div style="margin-bottom: 30px;">
                  <p style="color: #EAF2FF; font-size: 16px; line-height: 1.6; margin: 0;">
                    Gracias por tu compra. Tu acceso a PLEIA está ahora activo.
                  </p>
                </div>

                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                  <h3 style="color: #EAF2FF; font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
                    Detalles del pago
                  </h3>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #EAF2FF; opacity: 0.8;">ID de sesión:</span>
                    <span style="color: #EAF2FF; font-family: monospace; font-size: 12px;">${session.id}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #EAF2FF; opacity: 0.8;">Importe:</span>
                    <span style="color: #36E2B4; font-weight: 600;">${(session.amount_total / 100).toFixed(2)}€</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #EAF2FF; opacity: 0.8;">Fecha:</span>
                    <span style="color: #EAF2FF;">${new Date(session.created * 1000).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>

                <div style="text-align: center;">
                  <a href="https://pleia.com" style="display: inline-block; background: #36E2B4; color: #0B0F14; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Ir a PLEIA
                  </a>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                  <p style="color: #EAF2FF; opacity: 0.7; font-size: 14px; margin: 0; text-align: center;">
                    Si tienes alguna pregunta, puedes contactarnos en jeylabbb@gmail.com
                  </p>
                </div>
              </div>
            </div>
          `,
        });
        console.info('[EMAIL] Confirmation email sent to:', session.customer_details.email);
      } catch (emailError) {
        console.error('[EMAIL] Failed to send confirmation email:', emailError);
      }
    }
  }
  
  if (event.type === 'invoice.payment_succeeded') {
    console.info('[STRIPE] invoice.payment_succeeded', event.data.object['id']);
  }

  return NextResponse.json({ received: true });
}
