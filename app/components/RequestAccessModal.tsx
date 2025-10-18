'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function RequestAccessModal({ open, onClose }: Props) {
  const { status } = useSession();
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Polling de sesión para cerrar modal cuando se autentica
  useEffect(() => {
    if (status === 'authenticated') {
      try {
        localStorage.setItem('ea_done', '1');
        localStorage.removeItem('ea_pending');
      } catch {}
      // Oculta modal y limpia query de callback
      router.replace('/');
    }
  }, [status, router]);

  // Solo mostrar si no está autenticado (removed ea_done check for easier testing)
  const shouldOpen = 
    typeof window !== 'undefined' &&
    status !== 'authenticated' &&
    open;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/allowlist/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email })
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setFullName('');
          setEmail('');
        }, 2000);
      } else {
        setError('No se pudo enviar la solicitud. Inténtalo de nuevo.');
      }
    } catch (err) {
      setError('No se pudo enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAlreadyRequested = () => {
    try { 
      localStorage.setItem('ea_pending', '1'); 
    } catch {}
    // IMPORTANT: fuerza volver a 127.0.0.1 (debe coincidir con Spotify redirect URI)
    const baseUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'http://127.0.0.1:3000';
    signIn('spotify', { callbackUrl: `${baseUrl}/?from=oauth` });
  };

  if (!shouldOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-night)' }}>
        <div className="relative rounded-2xl border p-5" style={{ background: 'var(--color-slate)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">Solicitar acceso al Early Access</h3>
              <p className="mt-1 text-sm text-gray-text-secondary">
                Para entrar con Spotify necesitamos activar tu email primero.
              </p>
            </div>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-spotify-green rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Solicitud enviada</h4>
              <p className="text-gray-text-secondary">
                Te avisaremos cuando te activemos.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full rounded-lg border p-3 text-white placeholder-gray-500 outline-none focus:border-spotify-green"
                  style={{ background: 'var(--color-slate)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email de tu cuenta de Spotify
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-lg border p-3 text-white placeholder-gray-500 outline-none focus:border-spotify-green"
                  style={{ background: 'var(--color-slate)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  required
                />
                <p className="mt-1 text-xs text-gray-text-secondary">
                  Usa el mismo email de tu cuenta de Spotify.
                </p>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                    color: '#0B0F12',
                    border: 'none',
                    fontFamily: 'var(--font-body)',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(71, 200, 209, 0.3)'
                  }}
                >
                  {submitting ? 'Enviando...' : 'Solicitar acceso'}
                </button>
                
                <button
                  type="button"
                  onClick={handleAlreadyRequested}
                  className="w-full px-6 py-3 rounded-xl font-medium transition-all duration-200"
                  style={{
                    background: 'transparent',
                    color: 'var(--color-accent-mixed)',
                    border: '1px solid var(--color-accent-mixed)',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  Ya he solicitado acceso
                </button>
                
                <p className="text-xs text-gray-text-secondary text-center mt-2">
                  (Si aún no te hemos activado, no funcionará)
                </p>
                
                <p className="text-xs text-gray-text-secondary text-center mt-3 px-2">
                  Si Spotify te pide un código, complétalo. Si no vuelves automáticamente, regresa a esta página y pulsa de nuevo Iniciar sesión; te reconocerá y entrarás directo.
                </p>
                
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-gray-text-secondary hover:text-white transition-colors mt-2"
                >
                  Cerrar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
