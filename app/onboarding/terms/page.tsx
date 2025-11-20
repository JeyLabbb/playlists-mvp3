import { redirect } from 'next/navigation';
import TermsForm from './TermsForm';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { findUsageUser } from '@/lib/billing/usage';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[]>>;
};

export const dynamic = 'force-dynamic';

export default async function TermsOnboardingPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const redirectParam =
    typeof params.redirect === 'string'
      ? params.redirect
      : Array.isArray(params.redirect)
        ? params.redirect[0]
        : '/';

  // Redirigimos siempre al nuevo flujo unificado de creación de cuenta
  const target = `/onboarding/create?redirect=${encodeURIComponent(redirectParam || '/')}`;
  redirect(target);
}



  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent('/onboarding/terms?redirect=' + encodeURIComponent(redirectParam))}`);
  }

  const usageUser = await findUsageUser({
    userId: user.id,
    email: user.email ?? undefined,
  });

  if (!usageUser) {
    redirect(`/onboarding/create?redirect=${encodeURIComponent(redirectParam || '/')}`);
  }

  if (usageUser.terms_accepted_at) {
    redirect(redirectParam || '/');
  }

  return (
    <TermsForm
      redirectTo={redirectParam || '/'}
      initialMarketingOptIn={!!usageUser.marketing_opt_in}
      email={user.email ?? 'sin-email'}
      displayName={
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        undefined
      }
    />
  );
}


