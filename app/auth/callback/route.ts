import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { findUsageUser } from '@/lib/billing/usage';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawRedirect = url.searchParams.get('redirect') || '/';
  const redirectParam = rawRedirect.startsWith('/') ? rawRedirect : '/';
  const code = url.searchParams.get('code');
  const errorDescription = url.searchParams.get('error_description');

  const supabase = await createSupabaseRouteClient();

  if (errorDescription) {
    console.error('[AUTH] OAuth error:', errorDescription);
    const fallback = new URL('/login', url.origin);
    fallback.searchParams.set('redirect', redirectParam);
    fallback.searchParams.set('error', 'oauth_failed');
    return NextResponse.redirect(fallback);
  }

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('[AUTH] Error exchanging OAuth code:', exchangeError);
      const fallback = new URL('/login', url.origin);
      fallback.searchParams.set('redirect', redirectParam);
      fallback.searchParams.set('error', 'oauth_exchange_failed');
      return NextResponse.redirect(fallback);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user?.email) {
    const fallback = new URL('/login', url.origin);
    fallback.searchParams.set('redirect', redirectParam);
    return NextResponse.redirect(fallback);
  }

  const usageUser = await findUsageUser({
    email: user.email,
    userId: user.id,
  });

  // 🚨 CRITICAL: Log detallado para debugging
  console.log('[AUTH-CALLBACK] ===== CHECKING USER ACCOUNT STATUS =====');
  console.log('[AUTH-CALLBACK] User ID:', user.id);
  console.log('[AUTH-CALLBACK] Email:', user.email);
  console.log('[AUTH-CALLBACK] Usage user found:', !!usageUser);
  console.log('[AUTH-CALLBACK] Account status:', {
    hasTerms: !!usageUser?.terms_accepted_at,
    hasUsername: !!usageUser?.username,
    username: usageUser?.username,
    terms_accepted_at: usageUser?.terms_accepted_at,
    hasCompleteAccount: !!(usageUser?.terms_accepted_at && usageUser?.username),
  });

  // 🚨 CRITICAL: Solo redirigir directamente si tiene cuenta PLEIA completa
  // Cuenta completa = terms_accepted_at Y username (no null)
  // Si solo tiene terms_accepted_at pero username es null, es solo newsletter, mostrar onboarding
  const hasCompleteAccount = usageUser?.terms_accepted_at && usageUser?.username;

  if (!hasCompleteAccount) {
    console.log('[AUTH-CALLBACK] ⚠️ Account incomplete, redirecting to onboarding');
    const onboarding = new URL('/onboarding/create', url.origin);
    onboarding.searchParams.set('redirect', redirectParam);
    return NextResponse.redirect(onboarding);
  }

  console.log('[AUTH-CALLBACK] ✅ Account complete, redirecting to:', redirectParam);
  return NextResponse.redirect(new URL(redirectParam, url.origin));
}
