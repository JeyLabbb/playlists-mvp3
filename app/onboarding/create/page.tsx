import { redirect } from 'next/navigation';
import CreateAccountForm from './CreateAccountForm';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { findUsageUser } from '@/lib/billing/usage';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[]>>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0; // 🚨 CRITICAL: No cachear esta página para evitar datos obsoletos

function suggestUsername(email: string, userId: string) {
  const localPart = email.split('@')[0] || 'pleia';
  const sanitizedLocal = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'pleia';
  const suffix = userId.replace(/[^a-z0-9]/gi, '').slice(0, 4) || 'user';
  return `${sanitizedLocal}-${suffix}`.slice(0, 24);
}

export default async function CreateAccountPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const rawRedirect =
    typeof params.redirect === 'string'
      ? params.redirect
      : Array.isArray(params.redirect)
        ? params.redirect[0]
        : '/';
  const redirectTo = rawRedirect.startsWith('/') ? rawRedirect : '/';

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    redirect(`/login?redirect=${encodeURIComponent('/onboarding/create?redirect=' + encodeURIComponent(redirectTo))}`);
  }

  const usageUser = await findUsageUser({
    userId: user.id,
    email: user.email,
  });

  // 🚨 CRITICAL: Log detallado para debugging
  console.log('[ONBOARDING-CREATE] ===== CHECKING USER ACCOUNT STATUS =====');
  console.log('[ONBOARDING-CREATE] User ID:', user.id);
  console.log('[ONBOARDING-CREATE] Email:', user.email);
  console.log('[ONBOARDING-CREATE] Usage user found:', !!usageUser);
  console.log('[ONBOARDING-CREATE] Account status:', {
    hasTerms: !!usageUser?.terms_accepted_at,
    hasUsername: !!usageUser?.username,
    username: usageUser?.username,
    terms_accepted_at: usageUser?.terms_accepted_at,
    hasCompleteAccount: !!(usageUser?.terms_accepted_at && usageUser?.username),
  });

  // 🚨 CRITICAL: Solo redirigir si tiene cuenta PLEIA completa (terms_accepted_at Y username)
  // Si solo tiene terms_accepted_at pero username es null, es solo newsletter, mostrar onboarding
  if (usageUser?.terms_accepted_at && usageUser?.username) {
    console.log('[ONBOARDING-CREATE] ✅ Account complete, redirecting to:', redirectTo || '/');
    redirect(redirectTo || '/');
  } else {
    console.log('[ONBOARDING-CREATE] ⚠️ Account incomplete, showing onboarding form');
  }

  // Ya no usamos la pantalla antigua de /onboarding/terms:
  // siempre completamos cuenta + términos desde esta pantalla.

  const defaultName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    '';

  const defaultUsername = suggestUsername(user.email, user.id);

  return (
    <CreateAccountForm
      email={user.email}
      defaultName={defaultName}
      defaultUsername={defaultUsername}
      redirectTo={redirectTo}
    />
  );
}


