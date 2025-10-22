import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'No session_id provided' }, { status: 400 });
    }

    if (!stripe) {
      return NextResponse.json({ ok: false, error: 'Stripe not configured' }, { status: 503 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Get line items to check the price
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    
    // Check if this is a Founder Pass by looking at the price
    // Founder Pass is typically a one-time payment (mode: payment) with amount 500 (5€)
    const isFounderPass = session.mode === 'payment' && 
                         session.amount_total === 500 && 
                         lineItems.data.length > 0;
    
    return NextResponse.json({ 
      ok: true, 
      isFounderPass,
      session: {
        id: session.id,
        status: session.status,
        customer: session.customer,
        mode: session.mode
      }
    });
  } catch (error) {
    console.error('[STRIPE] Session info error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to get session info' }, { status: 500 });
  }
}
