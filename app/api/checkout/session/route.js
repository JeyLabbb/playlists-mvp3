import { NextResponse } from 'next/server';
import { stripe, PRICES, URLS } from '../../../../lib/stripe';
import { CHECKOUT_ENABLED } from '../../../../lib/flags';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/config';

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

  // 🚨 CRITICAL: Obtener email del usuario autenticado
  let userEmail = null;
  try {
    // @ts-ignore - NextAuth types issue
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email.toLowerCase();
      console.log('[CHECKOUT SESSION] ✅ Usuario autenticado:', userEmail);
    } else {
      console.log('[CHECKOUT SESSION] ⚠️ No hay usuario autenticado');
    }
  } catch (authError) {
    console.error('[CHECKOUT SESSION] ⚠️ Error obteniendo sesión:', authError);
  }

  try {
    const mode = plan === 'founder' ? 'payment' : 'subscription';

    const sessionConfig = {
      mode,
      line_items: [{ price, quantity: 1 }],
      success_url: URLS.success + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: URLS.cancel,
      customer_creation: 'always', // Always create a customer
    };

    // 🚨 CRITICAL: Añadir metadata con el email del usuario autenticado
    if (userEmail) {
      sessionConfig.metadata = {
        user_email: userEmail, // Email del usuario autenticado (no el de Stripe)
      };
      console.log('[CHECKOUT SESSION] 📧 Metadata añadida con user_email:', userEmail);
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

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
