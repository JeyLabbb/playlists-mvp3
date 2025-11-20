import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function createSupabaseServerClient() {
  try {
    return createServerComponentClient({
      cookies: async () => await cookies(),
    });
  } catch (error) {
    console.error('[SUPABASE] Error creating server client:', error);
    throw error;
  }
}

