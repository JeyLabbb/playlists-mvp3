'use client';

import { useState, useEffect } from 'react';
import { CHECKOUT_ENABLED, SHOW_MONTHLY } from '../../../lib/flags';
import { useProfile } from '../../../lib/useProfile';

export default function FounderNudge() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const { isFounder } = useProfile();

  useEffect(() => {
    // Only show nudge if user is NOT a Founder and hasn't seen it
    if (!isFounder) {
      const hasSeenNudge = sessionStorage.getItem('pleia-founder-nudge-seen');
      if (!hasSeenNudge) {
        // Show nudge after a short delay
        setTimeout(() => {
          setIsVisible(true);
        }, 3000);
      }
    }
  }, [isFounder]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('pleia-founder-nudge-seen', 'true');
  };

  const handleSubscribe = async (plan) => {
    if (!CHECKOUT_ENABLED) {
      alert('Los pagos estarán disponibles próximamente');
      return;
    }

    setLoading(plan);
    
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        if (data.reason === 'stripe_not_configured') {
          alert('Los pagos estarán disponibles próximamente. Stripe no está configurado.');
        } else {
          throw new Error(data.reason || 'Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error al procesar el pago. Inténtalo de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  // Don't show if user has Founder plan or has been dismissed
  if (!isVisible || isDismissed || isFounder) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      <div 
        className="rounded-2xl shadow-lg p-4 animate-in slide-in-from-bottom-2 duration-300"
        style={{ 
          backgroundColor: '#0F141B',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#EAF2FF'
          }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="pr-6">
          <div className="flex items-start gap-3 mb-4">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: '#36E2B4' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 
                className="font-semibold text-sm"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                TE QUEDAN SOLO {usageData?.remaining || 0} USOS
              </h3>
              <p 
                className="text-sm"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.8
                }}
              >
                Por 5€ tienes acceso ilimitado (Founder Pass).
              </p>
            </div>
          </div>

          {/* Pricing Plans */}
          <div className="space-y-3 mb-4">
            {/* Founder Pass */}
            <div 
              className="rounded-lg p-3"
              style={{ 
                backgroundColor: 'rgba(54, 226, 180, 0.1)',
                border: '1px solid rgba(54, 226, 180, 0.2)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 
                    className="font-semibold text-sm"
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: 600
                    }}
                  >
                    Founder Pass
                  </h4>
                  <p 
                    className="text-xs"
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      opacity: 0.7
                    }}
                  >
                    Acceso vitalicio
                  </p>
                </div>
                <div className="text-right">
                  <div 
                    className="text-lg font-bold"
                    style={{ 
                      color: '#36E2B4',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: 700
                    }}
                  >
                    5€
                  </div>
                  <div 
                    className="text-xs font-bold"
                    style={{ 
                      color: '#36E2B4',
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: 700,
                      opacity: 0.9
                    }}
                  >
                    PAGO ÚNICO
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleSubscribe('founder')}
                disabled={!CHECKOUT_ENABLED || loading === 'founder'}
                className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  CHECKOUT_ENABLED
                    ? 'hover:shadow-lg hover:scale-[1.02]'
                    : 'opacity-50 cursor-not-allowed'
                } ${loading === 'founder' ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: CHECKOUT_ENABLED ? '#36E2B4' : 'rgba(255, 255, 255, 0.1)',
                  color: CHECKOUT_ENABLED ? '#0B0F14' : '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  border: 'none'
                }}
              >
                {loading === 'founder' ? (
                  <div className="flex items-center justify-center">
                    <div 
                      className="animate-spin rounded-full h-3 w-3 border-b-2 mr-2"
                      style={{ borderColor: '#0B0F14' }}
                    ></div>
                    Procesando...
                  </div>
                ) : CHECKOUT_ENABLED ? (
                  'Comprar ahora'
                ) : (
                  'Próximamente'
                )}
              </button>
            </div>

            {/* Monthly Plan (if enabled) */}
            {SHOW_MONTHLY && (
              <div 
                className="rounded-lg p-3"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 
                      className="font-semibold text-sm"
                      style={{ 
                        color: '#EAF2FF',
                        fontFamily: 'Space Grotesk, sans-serif',
                        fontWeight: 600
                      }}
                    >
                      PLEIA Monthly
                    </h4>
                    <p 
                      className="text-xs"
                      style={{ 
                        color: '#EAF2FF',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        opacity: 0.7
                      }}
                    >
                      Suscripción mensual
                    </p>
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-lg font-bold"
                      style={{ 
                        color: '#5B8CFF',
                        fontFamily: 'Space Grotesk, sans-serif',
                        fontWeight: 700
                      }}
                    >
                      2.99€
                    </div>
                    <div 
                      className="text-xs"
                      style={{ 
                        color: '#EAF2FF',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        opacity: 0.7
                      }}
                    >
                      /mes
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSubscribe('monthly')}
                  disabled={!CHECKOUT_ENABLED || loading === 'monthly'}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    CHECKOUT_ENABLED
                      ? 'hover:shadow-lg hover:scale-[1.02]'
                      : 'opacity-50 cursor-not-allowed'
                  } ${loading === 'monthly' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: CHECKOUT_ENABLED ? '#5B8CFF' : 'rgba(255, 255, 255, 0.1)',
                    color: CHECKOUT_ENABLED ? '#0B0F14' : '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    border: 'none'
                  }}
                >
                  {loading === 'monthly' ? (
                    <div className="flex items-center justify-center">
                      <div 
                        className="animate-spin rounded-full h-3 w-3 border-b-2 mr-2"
                        style={{ borderColor: '#0B0F14' }}
                      ></div>
                      Procesando...
                    </div>
                  ) : CHECKOUT_ENABLED ? (
                    'Suscribirse'
                  ) : (
                    'Próximamente'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-sm transition-colors"
              style={{ 
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                opacity: 0.7
              }}
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}