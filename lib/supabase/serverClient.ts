import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerComponentClient({
    cookies: () => cookieStore as any,
  });
}

