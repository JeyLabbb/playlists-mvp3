'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { APP_NAME } from '../../lib/features';

type Props = {
  redirectTo: string;
};

export default function LoginView({ redirectTo }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthError(null);
    setError(null);

    setLoading(true);

    try {
      // 🚨 CRITICAL: En producción, SIEMPRE usar la URL de producción
      // Forzar producción si no estamos explícitamente en desarrollo local
      const getOrigin = () => {
        if (typeof window === 'undefined') {
          console.log('[LOGIN] getOrigin: window undefined, using production URL');
          return 'https://playlists.jeylabbb.com';
        }
        
        const origin = window.location.origin;
        const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.');
        const isVercelPreview = origin.includes('vercel.app') || origin.includes('vercel.dev');
        const hasProductionUrl = !!process.env.NEXT_PUBLIC_SITE_URL;
        
        console.log('[LOGIN] getOrigin detection:', {
          origin,
          isLocalhost,
          isVercelPreview,
          hasProductionUrl,
          NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
        });
        
        // Si es localhost Y no hay VERCEL_URL, es desarrollo local
        if (isLocalhost && !isVercelPreview) {
          console.log('[LOGIN] ✅ Using localhost for local development:', origin);
          return origin;
        }
        
        // En cualquier otro caso (producción, staging, Vercel preview, etc.), usar producción
        const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playlists.jeylabbb.com';
        console.log('[LOGIN] ✅ Using production URL:', productionUrl);
        return productionUrl;
      };
      
      const callbackUrl = `${getOrigin()}/auth/callback?redirect=${encodeURIComponent(redirectTo || '/')}`;
      console.log('[LOGIN] 📋 Callback URL construida:', callbackUrl);

      const response = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          redirectTo: callbackUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        setOauthError(data.error || `No se pudo iniciar sesión con ${provider === 'google' ? 'Google' : 'Apple'}`);
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      setOauthError(`Error de conexión con ${provider === 'google' ? 'Google' : 'Apple'}`);
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo iniciar sesión');
      } else {
        if (typeof window !== 'undefined') {
          window.location.href = redirectTo || '/';
        } else {
          router.push(redirectTo || '/');
          router.refresh();
        }
      }
    } catch (err) {
      setError('Error de conexión al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#0E131A] border border-white/10 shadow-[0_0_20px_rgba(91,140,255,0.18)]">
            <Image src="/logo-pleia-star.png" alt="PLEIA" width={72} height={72} priority />
          </div>
          <h1 className="text-3xl font-bold mt-4 tracking-tight">{APP_NAME}</h1>
        </div>
        <p className="text-sm text-white/70 mb-6">
          Inicia sesión para crear playlists con IA.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {oauthError && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {oauthError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/40"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/40"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-2 text-center text-xs uppercase tracking-wide text-white/40">
          <span className="h-px flex-1 bg-white/10" />
          o continúa con
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 disabled:opacity-60"
          >
            <Image src="/icons/google.svg" alt="Google" width={20} height={20} />
            Iniciar sesión con Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-white/60">
          ¿No tienes cuenta?{' '}
          <Link
            href="/register"
            className="text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            Crear una cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}

