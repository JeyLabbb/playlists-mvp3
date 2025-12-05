import { redirect } from 'next/navigation';
import RegisterView from './RegisterView';
import { createSupabaseServerClient } from '../../lib/supabase/serverClient';

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[]>>;
};

export const dynamic = 'force-dynamic';

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
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

  return <RegisterView redirectTo={redirectTo} />;
}

