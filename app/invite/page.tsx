'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthActions } from '../../lib/auth/clientActions';
import Link from 'next/link';

function InvitePageContent() {
  const searchParams = useSearchParams();
  const refEmail = searchParams.get('ref');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthActions();

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
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0B0F14' }}
    >
      <div className="max-w-md mx-auto text-center px-4">
        <div 
          className="rounded-2xl shadow-2xl p-8"
          style={{ 
            backgroundColor: '#0F141B',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Logo */}
          <div className="mb-8">
            <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
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
          <h1 
            className="text-3xl font-bold mb-4"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            ¡Te han invitado!
          </h1>
          
          <p 
            className="mb-6"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              opacity: 0.8
            }}
          >
            Un amigo te ha invitado a probar PLEIA, la IA que crea playlists perfectas para Spotify.
          </p>

          {/* Referrer Info */}
          {refEmail && (
            <div 
              className="rounded-lg p-4 mb-6"
              style={{ 
                backgroundColor: 'rgba(54, 226, 180, 0.1)',
                border: '1px solid rgba(54, 226, 180, 0.2)'
              }}
            >
              <p 
                className="text-sm mb-1"
                style={{ 
                  color: '#36E2B4',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500
                }}
              >
                Invitado por:
              </p>
              <p 
                className="text-sm"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400
                }}
              >
                {refEmail}
              </p>
            </div>
          )}

          {/* Benefits */}
          <div 
            className="rounded-lg p-4 mb-6"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <h3 
              className="text-lg font-semibold mb-3"
              style={{ 
                color: '#EAF2FF',
                fontFamily: 'Space Grotesk, sans-serif'
              }}
            >
              ¿Qué obtienes?
            </h3>
            <ul className="text-left space-y-2">
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" style={{ color: '#36E2B4' }} viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span style={{ color: '#EAF2FF', fontFamily: 'Inter, sans-serif' }}>5 usos gratis</span>
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" style={{ color: '#36E2B4' }} viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span style={{ color: '#EAF2FF', fontFamily: 'Inter, sans-serif' }}>Playlists ilimitadas por 5€ (menos que un cubata)</span>
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" style={{ color: '#36E2B4' }} viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span style={{ color: '#EAF2FF', fontFamily: 'Inter, sans-serif' }}>Integración con Spotify</span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#1DB954',
              color: '#FFFFFF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              border: 'none'
            }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          {/* Footer */}
          <div 
            className="mt-6 pt-4"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <p 
              className="text-xs"
              style={{ 
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                opacity: 0.6
              }}
            >
              Al entrar, aceptas nuestros{' '}
              <Link href="/terms" style={{ color: '#5B8CFF' }}>Términos</Link>
              {' '}y{' '}
              <Link href="/privacy" style={{ color: '#5B8CFF' }}>Privacidad</Link>
            </p>
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
        style={{ backgroundColor: '#0B0F14' }}
      >
        <div className="text-white">Cargando...</div>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}
