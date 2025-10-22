import { NextResponse } from 'next/server';
import { stripe, PRICES, URLS } from '@/lib/stripe';
import { CHECKOUT_ENABLED } from '@/lib/flags';

export async function POST(req) {
  if (!CHECKOUT_ENABLED) {
    return NextResponse.json({ ok: false, reason: 'disabled' }, { status: 403 });
  }
  
  const { plan } = await req.json();
  const price = plan === 'founder' ? PRICES.founder : PRICES.monthly;
  
  if (!price) {
    return NextResponse.json({ ok: false, reason: 'invalid_plan' }, { status: 400 });
  }

  const mode = plan === 'founder' ? 'payment' : 'subscription';

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price, quantity: 1 }],
    success_url: URLS.success + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: URLS.cancel,
    // opcional: metadata con userId si lo tienes
  });

  return NextResponse.json({ ok: true, url: session.url });
}
