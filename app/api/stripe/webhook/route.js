import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { CHECKOUT_ENABLED } from '@/lib/flags';

export const config = { api: { bodyParser: false } }; // si hiciera falta, en app router usa buffer

export async function POST(req: Request) {
  if (!CHECKOUT_ENABLED) {
    return NextResponse.json({}, { status: 403 });
  }

  const sig = req.headers.get('stripe-signature');
  const whsec = process.env.STRIPE_WEBHOOK_SECRET!;
  const buf = Buffer.from(await req.arrayBuffer());

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig!, whsec);
  } catch (err: any) {
    console.error('Webhook signature failed', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  // Logs mínimos (no mutar usuarios aún)
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as any;
    console.info('[STRIPE] checkout.session.completed', {
      id: s.id, 
      customer: s.customer, 
      email: s.customer_details?.email, 
      amount_total: s.amount_total
    });
  }
  if (event.type === 'invoice.payment_succeeded') {
    console.info('[STRIPE] invoice.payment_succeeded', event.data.object['id']);
  }

  return NextResponse.json({ received: true });
}
