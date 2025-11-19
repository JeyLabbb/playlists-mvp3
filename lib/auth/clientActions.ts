'use client';

import { useCallback } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { useProfile } from '../useProfile';

function buildRedirectPath(base: string, redirectTo: string) {
  const query = encodeURIComponent(redirectTo || '/');
  return `${base}?redirect=${query}`;
}

export function useAuthActions() {
  const { supabaseClient } = useSessionContext();
  const { mutate: mutateProfile } = useProfile();

  const login = useCallback(
    (redirectTo = '/') => {
      const path = buildRedirectPath('/login', redirectTo);
      if (typeof window !== 'undefined') {
        window.location.href = path;
      }
    },
    [],
  );

  const logout = useCallback(
    async (redirectTo = '/') => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paywall:hide', { detail: { source: 'logout' } }));
        window.dispatchEvent(new CustomEvent('paywall:dismissed'));
      }

      const tasks: Promise<any>[] = [];
      if (supabaseClient) {
        tasks.push(supabaseClient.auth.signOut().catch((error) => {
          console.warn('[AUTH] Supabase signOut failed:', error);
        }));
      }

      tasks.push(
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch((error) => {
          console.warn('[AUTH] API logout failed:', error);
        }),
      );

      await Promise.all(tasks);

      mutateProfile?.(null, false);

      if (typeof window !== 'undefined') {
        window.location.href = redirectTo || '/';
      }
    },
    [supabaseClient, mutateProfile],
  );

  return { login, logout };
}

