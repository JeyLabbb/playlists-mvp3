import { NextResponse } from 'next/server';
import { stripe, PRICES, URLS } from '../../../../lib/stripe';
import { CHECKOUT_ENABLED } from '../../../../lib/flags';

export async function POST(req) {
  if (!CHECKOUT_ENABLED) {
    return NextResponse.json({ ok: false, reason: 'disabled' }, { status: 403 });
  }
  
  if (!stripe) {
    return NextResponse.json({ ok: false, reason: 'stripe_not_configured' }, { status: 503 });
  }
  
  const { plan } = await req.json();
  const price = plan === 'founder' ? PRICES.founder : PRICES.monthly;
  
  if (!price || price.includes('placeholder')) {
    return NextResponse.json({ ok: false, reason: 'stripe_not_configured' }, { status: 503 });
  }

  try {
    const mode = plan === 'founder' ? 'payment' : 'subscription';

        const session = await stripe.checkout.sessions.create({
          mode,
          line_items: [{ price, quantity: 1 }],
          success_url: URLS.success + '?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: URLS.cancel,
          customer_creation: 'always', // Always create a customer
          // opcional: metadata con userId si lo tienes
        });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error('[STRIPE] Error creating session:', error);
    
    // Check if it's an authentication error (invalid API key)
    if (error.type === 'StripeAuthenticationError') {
      return NextResponse.json({ ok: false, reason: 'stripe_not_configured' }, { status: 503 });
    }
    
    return NextResponse.json({ ok: false, reason: 'stripe_error' }, { status: 500 });
  }
}
