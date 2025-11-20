import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseBrowserClient() {
  // createPagesBrowserClient automatically reads from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  // No need to pass them explicitly
  return createPagesBrowserClient();
}

