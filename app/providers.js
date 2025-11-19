'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabase/browser';

export default function Providers({ children }) {
  const [supabaseClient] = useState(() => createSupabaseBrowserClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
}
