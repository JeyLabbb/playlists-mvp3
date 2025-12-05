'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthActions } from '../../lib/auth/clientActions';
import { usePleiaSession } from '../../lib/auth/usePleiaSession';
import { useUsageStatus } from '../../lib/hooks/useUsageStatus';

function InvitePageContent() {
  const searchParams = useSearchParams();
  const refEmail = searchParams.get('ref');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthActions();
  const { data: sessionData } = usePleiaSession();
  const sessionUser = sessionData?.user || null;
  const {
    remaining,
    maxUses,
    current,
    unlimited,
    isLoading: usageLoading,
    refresh: refreshUsage,
  } = useUsageStatus({
    disabled: !sessionUser,
    refreshInterval: sessionUser ? 45000 : 0,
  });

  const remainingLabel = useMemo(() => {
    if (!sessionUser) return '5';
    if (unlimited) return '∞';
    if (typeof remaining === 'number') {
      return Math.max(0, remaining).toString();
    }
    if (typeof maxUses === 'number' && typeof current === 'number') {
      return Math.max(0, maxUses - current).toString();
    }
    return '—';
  }, [sessionUser, unlimited, remaining, maxUses, current]);

  // Save referral to localStorage when component mounts
  useEffect(() => {
    if (refEmail) {
      console.log('[INVITE] Saving referral to localStorage:', refEmail);
      localStorage.setItem('pleia-referral', refEmail);
    }
  }, [refEmail]);

  const handleSignIn = () => {
    setLoading(true);
    // Include the referral in the callback URL so it can be processed after login
    const callbackUrl = refEmail ? `/?ref=${encodeURIComponent(refEmail)}` : '/';
    login(callbackUrl);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ 
        background: 'radial-gradient(120% 140% at 0% 0%, rgba(91,140,255,0.15) 0%, rgba(11,15,20,0.95) 45%, rgba(11,15,20,1) 100%)'
      }}
    >
      <div className="w-full max-w-lg mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl shadow-[0_40px_120px_rgba(15,20,27,0.65)]"
          style={{
            background:
              'radial-gradient(120% 140% at 0% 0%, rgba(91,140,255,0.25) 0%, rgba(15,20,27,0.92) 45%, rgba(12,17,24,0.98) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="relative p-8 sm:p-10 md:p-12 flex flex-col gap-8">
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <svg width="140" height="46" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <title>PLEIA — Logo completo</title>
                <defs>
                  <linearGradient id="gradStar" x1="176" y1="176" x2="336" y2="336" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#36E2B4"></stop>
                    <stop offset="1" stopColor="#5B8CFF"></stop>
                  </linearGradient>
                </defs>
                <text x="60" y="26" textAnchor="middle" fontFamily="Space Grotesk, Inter, system-ui" fontSize="18" fontWeight="600" letterSpacing="0.02em" fill="#F5F7FA">PLEIA</text>
                <g transform="translate(60, 10) scale(0.08)">
                  <path d=" M256 136 L276 210 L352 230 L276 250 L256 324 L236 250 L160 230 L236 210 Z" fill="url(#gradStar)"></path>
                </g>
              </svg>
            </div>

            {/* Invitation Message */}
            <div className="text-center space-y-4">
              <h1 
                className="text-3xl sm:text-4xl font-bold"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: '1.1'
                }}
              >
                ¡Te han invitado!
              </h1>
              
              <p 
                className="text-base sm:text-lg leading-relaxed"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.85
                }}
              >
                Crea playlists perfectas con IA. Sin complicaciones, sin logins externos. Solo música que te encanta.
              </p>
            </div>

            {/* Referrer Info */}
            {refEmail && (
              <div 
                className="rounded-2xl p-5"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(54, 226, 180, 0.15) 0%, rgba(91, 140, 255, 0.15) 100%)',
                  border: '1px solid rgba(54, 226, 180, 0.25)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <p 
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ 
                    color: '#36E2B4',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    letterSpacing: '0.1em'
                  }}
                >
                  Invitado por:
                </p>
                <p 
                  className="text-sm sm:text-base"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500
                  }}
                >
                  {refEmail}
                </p>
              </div>
            )}

            {/* Benefits */}
            <div 
              className="rounded-2xl p-6"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <h3 
                className="text-xl font-semibold mb-5"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                ¿Qué obtienes?
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(54, 226, 180, 0.2)' }}>
                    <svg className="w-4 h-4" fill="currentColor" style={{ color: '#36E2B4' }} viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span 
                    className="text-base leading-relaxed"
                    style={{ 
                      color: '#EAF2FF', 
                      fontFamily: 'Inter, sans-serif',
                      opacity: 0.9
                    }}
                  >
                    <strong style={{ color: '#36E2B4', fontWeight: 600 }}>
                      {sessionUser ? `${remainingLabel} usos disponibles` : '5 usos gratis'}
                    </strong>
                    {!sessionUser && ' al registrarte'}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(54, 226, 180, 0.2)' }}>
                    <svg className="w-4 h-4" fill="currentColor" style={{ color: '#36E2B4' }} viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span 
                    className="text-base leading-relaxed"
                    style={{ 
                      color: '#EAF2FF', 
                      fontFamily: 'Inter, sans-serif',
                      opacity: 0.9
                    }}
                  >
                    Playlists <strong style={{ color: '#36E2B4', fontWeight: 600 }}>ilimitadas</strong> por 5€ (menos que un cubata)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(54, 226, 180, 0.2)' }}>
                    <svg className="w-4 h-4" fill="currentColor" style={{ color: '#36E2B4' }} viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span 
                    className="text-base leading-relaxed"
                    style={{ 
                      color: '#EAF2FF', 
                      fontFamily: 'Inter, sans-serif',
                      opacity: 0.9
                    }}
                  >
                    Integración perfecta con <strong style={{ color: '#5B8CFF', fontWeight: 600 }}>Spotify</strong>
                  </span>
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            {sessionUser ? (
              <button
                onClick={() => {
                  refreshUsage();
                  window.location.href = '/';
                }}
                className="w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-[0_8px_30px_rgba(54,226,180,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #36E2B4 0%, #2BC49A 100%)',
                  color: '#0B0F14',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(54, 226, 180, 0.25)',
                }}
              >
                Ir a crear playlists con la IA de PLEIA
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-[0_8px_30px_rgba(54,226,180,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #36E2B4 0%, #2BC49A 100%)',
                  color: '#0B0F14',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(54, 226, 180, 0.25)',
                }}
              >
                {loading ? 'Entrando...' : 'Entrar con tu cuenta PLEIA'}
              </button>
            )}

            {/* Footer */}
            <div 
              className="pt-6"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <p 
                className="text-xs text-center leading-relaxed"
                style={{ 
                  color: 'rgba(234, 242, 255, 0.6)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                }}
              >
                Al entrar, aceptas nuestros{' '}
                <Link 
                  href="https://playlists.jeylabbb.com/terms" 
                  className="hover:underline transition-colors"
                  style={{ color: '#5B8CFF' }}
                >
                  Términos
                </Link>
                {' '}y{' '}
                <Link 
                  href="https://playlists.jeylabbb.com/privacy" 
                  className="hover:underline transition-colors"
                  style={{ color: '#5B8CFF' }}
                >
                  Privacidad
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          background: 'radial-gradient(120% 140% at 0% 0%, rgba(91,140,255,0.15) 0%, rgba(11,15,20,0.95) 45%, rgba(11,15,20,1) 100%)'
        }}
      >
        <div className="text-white" style={{ fontFamily: 'Inter, sans-serif' }}>Cargando...</div>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}
