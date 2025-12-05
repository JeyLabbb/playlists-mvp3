'use client';

import { SessionProvider } from 'next-auth/react';
import SupabaseProvider from './supabase-provider';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <SupabaseProvider initialSession={null}>
        {children}
      </SupabaseProvider>
    </SessionProvider>
  );
}
