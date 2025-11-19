"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  email: string;
  defaultName?: string | null;
  defaultUsername?: string | null;
  redirectTo: string;
};

function sanitizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
}

export default function CreateAccountForm({
  email,
  defaultName = '',
  defaultUsername = '',
  redirectTo,
}: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultName || '');
  const [username, setUsername] = useState(defaultUsername || '');
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!acceptsTerms) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    const sanitizedUsername = username ? sanitizeUsername(username) : '';
    if (!sanitizedUsername) {
      setError('Elige un nombre de usuario válido (solo letras, números, guiones y puntos).');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          displayName: displayName?.trim() || null,
          username: sanitizedUsername,
          marketingOptIn,
          termsAccepted: acceptsTerms,
          redirectTo,
        }),
      });

      const json = await response.json().catch(() => ({}));
      
      // 🚨 CRITICAL: Log detallado para debugging
      console.log('[ONBOARDING-FORM] ===== AUTH COMPLETE RESPONSE =====');
      console.log('[ONBOARDING-FORM] Response status:', response.status);
      console.log('[ONBOARDING-FORM] Response ok:', response.ok);
      console.log('[ONBOARDING-FORM] JSON response:', json);
      
      if (!response.ok || !json?.ok) {
        console.log('[ONBOARDING-FORM] ❌ Error response:', json?.error);
        if (response.status === 409 && json?.error === 'already_completed') {
          console.log('[ONBOARDING-FORM] Account already completed, redirecting to:', json?.redirectTo || redirectTo || '/');
          router.replace(json?.redirectTo || redirectTo || '/');
          return;
        }
        if (json?.error === 'username_taken') {
          setError('Ese nombre de usuario ya está en uso. Prueba con otro.');
        } else if (json?.error === 'validation_error' && json?.message) {
          setError(json.message);
        } else {
          setError(json?.error || 'No se pudo crear tu cuenta. Inténtalo de nuevo.');
        }
        return;
      }

      // 🚨 CRITICAL: Log éxito
      console.log('[ONBOARDING-FORM] ✅ Account created successfully:', {
        username: json.username,
        termsAcceptedAt: json.termsAcceptedAt,
        hasCompleteAccount: json.hasCompleteAccount,
        redirectTo: json.redirectTo || redirectTo || '/',
      });

      // 🚨 CRITICAL: Si la cuenta está completa, añadir un pequeño delay antes de redirigir
      // para asegurar que la base de datos se haya actualizado completamente
      if (json.hasCompleteAccount !== false) {
        console.log('[ONBOARDING-FORM] Account is complete, waiting 200ms before redirect...');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 🚨 CRITICAL: Forzar recarga completa de la página para evitar problemas de caché
      // Usar window.location.href en lugar de router.replace para forzar una recarga completa
      const finalRedirect = json.redirectTo || redirectTo || '/';
      console.log('[ONBOARDING-FORM] Redirecting to:', finalRedirect);
      window.location.href = finalRedirect;
    } catch (err) {
      console.error('[ONBOARDING] Failed to complete account:', err);
      setError('Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-semibold mb-2 text-center">Bienvenido a PLEIA</h1>
        <p className="text-white/70 text-sm mb-6 text-center">
          Antes de crear tu cuenta, confirma tus datos y acepta los términos.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <label className="block text-xs uppercase tracking-wide text-white/40 mb-2">
              Email
            </label>
            <div className="text-white font-medium text-sm break-words">{email}</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-4">
              <span className="text-xs uppercase tracking-wide text-white/40">
                Nombre para mostrar
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ej. Sofía Ramirez"
                maxLength={80}
                className="w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:ring-emerald-400/60 transition"
              />
            </label>

            <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-4">
              <span className="text-xs uppercase tracking-wide text-white/40">
                Nombre de usuario
              </span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="tu-usuario"
                maxLength={24}
                required
                className="w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:ring-emerald-400/60 transition"
              />
              <span className="text-[11px] text-white/40">
                Usa letras, números, guiones o puntos. Máximo 24 caracteres.
              </span>
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/30 bg-black/40 text-emerald-400 focus:ring-emerald-400"
                checked={acceptsTerms}
                onChange={(event) => setAcceptsTerms(event.target.checked)}
              />
              <span className="text-white/80">
                Acepto los{' '}
                <a
                  href="https://playlists.jeylabbb.com/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 underline"
                >
                  términos y condiciones
                </a>{' '}
                y la{' '}
                <a
                  href="https://playlists.jeylabbb.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 underline"
                >
                  política de privacidad
                </a>
                .
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/30 bg-black/40 text-emerald-400 focus:ring-emerald-400"
                checked={marketingOptIn}
                onChange={(event) => setMarketingOptIn(event.target.checked)}
              />
              <span className="text-white/60">
                Quiero recibir novedades, playlists y descuentos exclusivos de PLEIA.
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:via-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creando cuenta…' : 'Crear cuenta y continuar'}
          </button>

          <p className="text-center text-xs text-white/40">
            Si ya tienes una cuenta,{' '}
            <a href={`/login?redirect=${encodeURIComponent(redirectTo || '/')}`} className="text-emerald-300 underline">
              inicia sesión aquí
            </a>
            .
          </p>
        </form>
      </div>
    </main>
  );
}


