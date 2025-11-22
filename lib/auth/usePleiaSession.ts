'use client';

import { useMemo } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';

type PleiaSession = {
  user: {
    email: string;
    name?: string | null;
    image?: string | null;
    id?: string | null;
    [key: string]: any;
  };
};

type PleiaSessionResult = {
  data: PleiaSession | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
};

export function usePleiaSession(): PleiaSessionResult {
  try {
    const { session, isLoading } = useSessionContext();

    if (isLoading) {
      return { data: null, status: 'loading' };
    }

    if (session?.user) {
      const data: PleiaSession = {
        user: {
          email: session.user.email ?? '',
          name: session.user.user_metadata?.full_name || session.user.email || null,
          image: session.user.user_metadata?.avatar_url || null,
          id: session.user.id,
          metadata: session.user.user_metadata,
        },
      };

      return { data, status: 'authenticated' };
    }

    return { data: null, status: 'unauthenticated' };
  } catch (error) {
    // If SessionContext is not available (e.g., SupabaseProvider not mounted), return unauthenticated
    console.warn('[PLEIA-SESSION] SessionContext not available:', error);
    return { data: null, status: 'unauthenticated' };
  }
}

