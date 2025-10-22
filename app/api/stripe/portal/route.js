import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';

export async function POST(req) {
  try {
    const { session_id } = await req.json();
    console.log('[PORTAL] Request received for session:', session_id);
    
    if (!session_id) {
      return NextResponse.json({ ok: false, error: 'No session_id provided' }, { status: 400 });
    }

    if (!stripe) {
      console.log('[PORTAL] Stripe not configured');
      return NextResponse.json({ ok: false, error: 'Stripe not configured' }, { status: 503 });
    }

    console.log('[PORTAL] Retrieving checkout session...');
    const checkout = await stripe.checkout.sessions.retrieve(session_id);
    console.log('[PORTAL] Checkout session:', { id: checkout.id, customer: checkout.customer, status: checkout.status });
    
    if (!checkout.customer) {
      console.log('[PORTAL] No customer found in session');
      return NextResponse.json({ ok: false, error: 'No customer found in session' }, { status: 400 });
    }

    console.log('[PORTAL] Creating billing portal session...');
    const portal = await stripe.billingPortal.sessions.create({
      customer: checkout.customer,
      return_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/checkout/success',
    });

    console.log('[PORTAL] Portal session created:', portal.url);
    return NextResponse.json({ ok: true, url: portal.url });
  } catch (error) {
    console.error('[PORTAL] Error details:', error);
    return NextResponse.json({ ok: false, error: `Failed to create portal session: ${error.message}` }, { status: 500 });
  }
}
