import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function createSupabaseRouteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables for route client');
  }

  const cookieStore = await cookies();

  return createRouteHandlerClient({
    cookies: async () => cookieStore,
  });
}

