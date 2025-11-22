import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function createSupabaseRouteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables for route client');
  }

  // For Next.js 15, cookies() is async, but createRouteHandlerClient expects
  // a function that returns cookies synchronously. We need to await cookies()
  // and then pass a function that returns the awaited cookieStore.
  const cookieStore = await cookies();

  return createRouteHandlerClient({
    cookies: () => cookieStore as any,
  });
}

