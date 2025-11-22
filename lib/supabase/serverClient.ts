import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function createSupabaseServerClient() {
  // For Next.js 15, cookies() is async, but createServerComponentClient expects
  // a function that returns cookies synchronously. We need to await cookies()
  // and then pass a function that returns the awaited cookieStore.
  const cookieStore = await cookies();
  
  return createServerComponentClient({
    cookies: () => cookieStore as any,
  });
}

