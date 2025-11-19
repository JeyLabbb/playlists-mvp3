'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  redirectTo: string;
  initialMarketingOptIn?: boolean;
  email: string;
  displayName?: string | null;
};

export default function TermsForm({
  redirectTo,
  initialMarketingOptIn = false,
  email,
  displayName,
}: Props) {
  const router = useRouter();
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!acceptsTerms) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marketingOptIn }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo guardar tu configuración.');
      }

      router.push(redirectTo || '/');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar tu configuración.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-semibold mb-3 text-center">Completa tu cuenta PLEIA</h1>
        <p className="text-white/70 text-sm mb-6 text-center">
          {displayName ? `Hola ${displayName}, ` : ''}
          necesitamos que confirmes tus datos y aceptes nuestros términos antes de generar playlists.
        </p>

        <div className="mb-6 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/50">Email</span>
            <span className="font-medium text-white">{email}</span>
          </div>
          {displayName && (
            <div className="flex items-center justify-between gap-4 mt-2">
              <span className="text-white/50">Nombre</span>
              <span className="font-medium text-white">{displayName}</span>
            </div>
          )}
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acceptsTerms}
                onChange={(event) => setAcceptsTerms(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/30 bg-black/60 text-white focus:ring-white"
              />
              <span className="leading-5 text-white/80">
                He leído y acepto los{' '}
                <a
                  href="https://playlists.jeylabbb.com/terms"
                  target="_blank"
                  className="text-emerald-300 underline"
                >
                  Términos y Condiciones
                </a>{' '}
                y la{' '}
                <a
                  href="https://playlists.jeylabbb.com/privacy"
                  target="_blank"
                  className="text-emerald-300 underline"
                >
                  Política de Privacidad
                </a>
                .
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(event) => setMarketingOptIn(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/30 bg-black/60 text-white focus:ring-white"
              />
              <span className="leading-5 text-white/70">
                Deseo recibir novedades, promociones y comunicaciones comerciales de PLEIA.
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : 'Continuar'}
          </button>
        </form>
      </div>
    </main>
  );
}


