'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState, type ReactNode } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabase/browser';

type Props = {
  initialSession: any;
  children: ReactNode;
};

export default function SupabaseProvider({ initialSession, children }: Props) {
  const [supabaseClient] = useState(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (error) {
      console.error('[SUPABASE-PROVIDER] Failed to create browser client:', error);
      // Return a minimal mock client to prevent crashes
      // The app will still work, just without Supabase auth
      return null as any;
    }
  });

  // If client creation failed, just render children without SessionContextProvider
  if (!supabaseClient) {
    console.warn('[SUPABASE-PROVIDER] Supabase client not available, rendering without auth context');
    return <>{children}</>;
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}

