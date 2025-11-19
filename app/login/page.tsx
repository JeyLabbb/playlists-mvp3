import { redirect } from 'next/navigation';
import LoginView from './LoginView';
import { createSupabaseServerClient } from '../../lib/supabase/serverClient';
import { HUB_MODE } from '../../lib/features';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[]>>;
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  const redirectTo =
    typeof resolvedParams.redirect === 'string' ? resolvedParams.redirect : '/';

  return <LoginView redirectTo={redirectTo} />;
}

