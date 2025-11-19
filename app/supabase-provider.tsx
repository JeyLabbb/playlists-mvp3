'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState, type ReactNode } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabase/browser';

type Props = {
  initialSession: any;
  children: ReactNode;
};

export default function SupabaseProvider({ initialSession, children }: Props) {
  const [supabaseClient] = useState(() => createSupabaseBrowserClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}

