import { NextResponse } from 'next/server';
import { stripe, PRICES, URLS } from '../../../../lib/stripe';
import { CHECKOUT_ENABLED } from '../../../../lib/flags';
import { getPleiaServerUser } from '../../../../lib/auth/serverUser';

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

  // 🚨 CRITICAL: Obtener email del usuario autenticado desde Supabase (no NextAuth)
  let userEmail = null;
  try {
    const pleiaUser = await getPleiaServerUser();
    if (pleiaUser?.email) {
      userEmail = pleiaUser.email.toLowerCase();
      console.log('[CHECKOUT SESSION] ✅ Usuario autenticado (Supabase):', userEmail);
    } else {
      console.log('[CHECKOUT SESSION] ⚠️ No hay usuario autenticado en Supabase');
    }
  } catch (authError) {
    console.error('[CHECKOUT SESSION] ⚠️ Error obteniendo sesión de Supabase:', authError);
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
