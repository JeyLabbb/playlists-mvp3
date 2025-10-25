import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { sendConfirmationEmail } from '../../../../lib/resend';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('[DEV-WEBHOOK] Simulating webhook for session:', sessionId);

    // Get session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log('[DEV-WEBHOOK] Session details:', {
      id: session.id,
      email: session.customer_details?.email,
      amount_total: session.amount_total,
      payment_status: session.payment_status
    });

    // Get line items to check if it's a Founder Pass
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const isFounderPass = lineItems.data.some(item => 
      item.price?.id === process.env.STRIPE_PRICE_FOUNDER
    );

    console.log('[DEV-WEBHOOK] Is Founder Pass:', isFounderPass);

    if (isFounderPass && session.customer_details?.email) {
      // Mark user as Founder using direct KV access
      try {
        const kv = await import('@vercel/kv');
        const profileKey = `userprofile:${session.customer_details.email}`;
        
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
        console.log('[DEV-WEBHOOK] User marked as Founder:', session.customer_details.email, updatedProfile);
      } catch (error) {
        console.error('[DEV-WEBHOOK] Error marking user as Founder:', error);
      }

      // Send confirmation email
      try {
        const planName = 'Founder Pass';
        const amount = (session.amount_total / 100).toFixed(2);
        const date = new Date(session.created * 1000).toLocaleDateString('es-ES');
        
        const emailSent = await sendConfirmationEmail(session.customer_details.email, {
          planName,
          amount,
          date,
          sessionId: session.id
        });
        
        if (emailSent) {
          console.log('[DEV-WEBHOOK] founder_confirmation sent', session.customer_details.email);
        } else {
          console.error('[DEV-WEBHOOK] Failed to send confirmation email to:', session.customer_details.email);
        }
      } catch (emailError) {
        console.error('[DEV-WEBHOOK] Error sending confirmation email:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook simulation completed',
      isFounderPass,
      email: session.customer_details?.email
    });
  } catch (error) {
    console.error('[DEV-WEBHOOK] Error:', error);
    return NextResponse.json({ error: 'Failed to simulate webhook' }, { status: 500 });
  }
}
