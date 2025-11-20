import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseBrowserClient() {
  return createPagesBrowserClient();
}

