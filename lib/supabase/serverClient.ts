import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function createSupabaseServerClient() {
  return createServerComponentClient({
    cookies: async () => await cookies(),
  });
}

