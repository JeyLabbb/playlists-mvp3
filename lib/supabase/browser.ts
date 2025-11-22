import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseBrowserClient() {
  // createPagesBrowserClient automatically reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  // from environment variables. If they're missing, it will throw an error.
  try {
    return createPagesBrowserClient();
  } catch (error) {
    console.error('[SUPABASE-BROWSER] Failed to create browser client:', error);
    throw error;
  }
}

