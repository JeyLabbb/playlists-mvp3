import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const { session_id } = await req.json();
  if (!session_id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const checkout = await stripe.checkout.sessions.retrieve(session_id);
  if (!checkout.customer) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: checkout.customer as string,
    return_url: process.env.STRIPE_SUCCESS_URL!,
  });

  return NextResponse.json({ ok: true, url: portal.url });
}
