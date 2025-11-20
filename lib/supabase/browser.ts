import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('[SUPABASE] Missing environment variables for browser client');
    throw new Error('Missing Supabase environment variables for browser client');
  }

  return createPagesBrowserClient({
    supabaseUrl: url,
    supabaseKey: anonKey,
  });
}

