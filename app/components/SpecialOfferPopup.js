'use client';

import { useState, useEffect } from 'react';
import { usePleiaSession } from '../../lib/auth/usePleiaSession';
import { useProfile } from '../../lib/useProfile';
import { REFERRALS_ENABLED, canInvite } from '../../lib/referrals';

const STORAGE_KEY = 'pleia_special_offer_popup_seen_v2'; // Nueva versión para que todos vean la oferta

export default function SpecialOfferPopup() {
  // Hooks deben llamarse incondicionalmente y en el mismo orden
  const { data: session, status } = usePleiaSession();
  const { isEarlyFounderCandidate, isFounder, ready: profileReady } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Solo ejecutar en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (status !== 'authenticated' || !profileReady) {
      return;
    }

    // Solo mostrar si:
    // 1. Referrals están habilitados
    // 2. NO es founder todavía
    // 3. No ha visto el popup antes
    // 🎉 OFERTA ESPECIAL: Ahora TODOS los usuarios pueden invitar (canInvite siempre true)
    if (
      REFERRALS_ENABLED &&
      !isFounder &&
      status === 'authenticated' &&
      session?.user?.email
    ) {
      // Verificar si ya vio el popup
      try {
        const seen = localStorage.getItem(STORAGE_KEY);
        if (!seen) {
          // Mostrar después de un pequeño delay para que la página cargue
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 2000);
          return () => {
            clearTimeout(timer);
          };
        } else {
          setHasSeen(true);
        }
      } catch (e) {
        console.error('[SPECIAL-OFFER] Error checking localStorage:', e);
      }
    }
    
    // Return undefined si no hay cleanup necesario
    return undefined;
  }, [mounted, status, profileReady, isEarlyFounderCandidate, isFounder, session?.user?.email]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      setHasSeen(true);
    } catch (e) {
      console.error('[SPECIAL-OFFER] Error saving to localStorage:', e);
    }
  };

  const handleGoToPricing = () => {
    handleClose();
    if (typeof window !== 'undefined') {
      window.location.href = '/pricing';
    }
  };

  // No renderizar en el servidor o si ya se vio
  if (!mounted || !isOpen || hasSeen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        onClick={handleClose}
        style={{ backgroundColor: 'rgba(11, 15, 20, 0.8)' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-auto rounded-3xl shadow-[0_40px_120px_rgba(54,226,180,0.4)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            'linear-gradient(135deg, rgba(54,226,180,0.15) 0%, rgba(15,20,27,0.95) 50%, rgba(12,17,24,0.98) 100%)',
          border: '2px solid rgba(54, 226, 180, 0.4)',
          boxShadow: '0 0 40px rgba(54, 226, 180, 0.3)',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 cursor-pointer"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.14)',
            color: '#EAF2FF',
          }}
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 animate-pulse" style={{
              backgroundColor: 'rgba(54, 226, 180, 0.2)',
              border: '2px solid #36E2B4',
              boxShadow: '0 0 20px rgba(54, 226, 180, 0.5)'
            }}>
              <span className="text-xl">🎉</span>
              <span
                className="text-sm font-bold"
                style={{
                  color: '#36E2B4',
                  fontFamily: 'Space Grotesk, sans-serif'
                }}
              >
                NUEVA ACTUALIZACIÓN · PLEIA PULSE
              </span>
            </div>
            <h2
              className="text-2xl font-bold mb-3"
              style={{
                color: '#EAF2FF',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700
              }}
            >
              Un agente más inteligente, diseñado con tu feedback
            </h2>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-6">
            <p
              className="text-base leading-relaxed text-center"
              style={{
                color: 'rgba(234, 242, 255, 0.9)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Acabamos de lanzar <strong>PLEIA Pulse</strong>: un agente más inteligente, pensado para que pruebes prompts nuevos y nos ayudes a mejorarlo con tu feedback.
            </p>

            <div
              className="rounded-xl p-5 text-center"
              style={{
                backgroundColor: 'rgba(54, 226, 180, 0.1)',
                border: '1px solid rgba(54, 226, 180, 0.3)',
              }}
            >
              <p
                className="text-lg font-semibold mb-2"
                style={{
                  color: '#36E2B4',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                Para celebrarlo, te regalamos <strong>playlists ilimitadas para siempre</strong>
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                Invitando a <span className="diagonal-strike">3</span>{' '}
                <strong style={{ color: '#36E2B4', fontSize: '1.3em' }}>1</strong> amigo
              </p>
              <p
                className="text-sm mt-2"
                style={{
                  color: 'rgba(234, 242, 255, 0.8)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Solo necesitas que 1 persona se cree una cuenta PLEIA usando tu enlace
              </p>
            </div>

            <p
              className="text-sm text-center"
              style={{
                color: 'rgba(234, 242, 255, 0.7)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              ✅ <strong>100% Gratis</strong> • ✅ <strong>Usos Ilimitados</strong> • ✅ <strong>De Por Vida</strong>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGoToPricing}
              className="w-full py-3 px-6 rounded-xl font-semibold transition-all hover:scale-[1.02] hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #36E2B4, #2FCFA4)',
                color: '#0B0F14',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 600,
                boxShadow: '0 8px 25px rgba(54, 226, 180, 0.35)',
              }}
            >
              Ver Oferta Completa
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2 px-6 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(234, 242, 255, 0.8)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

