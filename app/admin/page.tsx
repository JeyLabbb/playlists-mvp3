'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente a la página de debug
    router.push('/admin/debug/db');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          🔐 Admin Panel
        </h1>
        <p style={{ color: '#6b7280' }}>
          Redirigiendo al panel de administración...
        </p>
      </div>
    </div>
  );
}
