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


