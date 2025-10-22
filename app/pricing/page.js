'use client';

import { useState } from 'react';
import { CHECKOUT_ENABLED, SHOW_MONTHLY } from '../../lib/flags';

export default function PricingPage() {
  const [loading, setLoading] = useState(null);

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
        throw new Error(data.reason || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error al procesar el pago. Inténtalo de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: '#0B0F14' }}
    >
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-6"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            Elige tu plan PLEIA
          </h1>
          <p 
            className="text-xl max-w-2xl mx-auto"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              opacity: 0.8
            }}
          >
            Desbloquea el poder de la IA para crear playlists perfectas. 
            Acceso vitalicio o suscripción mensual.
          </p>
          {!CHECKOUT_ENABLED && (
            <div 
              className="mt-6 inline-flex items-center rounded-lg px-4 py-2"
              style={{ 
                backgroundColor: 'rgba(91, 140, 255, 0.1)',
                border: '1px solid rgba(91, 140, 255, 0.2)'
              }}
            >
              <span 
                className="font-medium text-sm"
                style={{ 
                  color: '#5B8CFF',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Próximamente
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Founder Pass */}
          <div 
            className="relative rounded-2xl p-8 transition-all duration-200 hover:scale-[1.02]"
            style={{ 
              backgroundColor: '#0F141B',
              border: '1px solid rgba(54, 226, 180, 0.2)',
              boxShadow: '0 4px 20px rgba(54, 226, 180, 0.1)'
            }}
          >
            <div className="text-center">
              <h3 
                className="text-2xl font-bold mb-2"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Founder Pass
              </h3>
              <p 
                className="mb-6"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Acceso vitalicio
              </p>
              
              <div className="mb-6">
                <span 
                  className="text-5xl font-bold"
                  style={{ 
                    color: '#36E2B4',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700
                  }}
                >
                  5€
                </span>
                <span 
                  className="ml-2"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    opacity: 0.7
                  }}
                >
                  pago único
                </span>
              </div>

              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#36E2B4' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Playlists ilimitadas
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#36E2B4' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Compatibilidad con Spotify
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#36E2B4' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Updates y mejoras constantes
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#36E2B4' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Soporte prioritario
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('founder')}
                disabled={!CHECKOUT_ENABLED || loading === 'founder'}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  CHECKOUT_ENABLED
                    ? 'hover:shadow-lg hover:scale-[1.02]'
                    : 'opacity-50 cursor-not-allowed'
                }`}
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
                      className="animate-spin rounded-full h-5 w-5 border-b-2 mr-2"
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
          </div>

          {/* Monthly Plan */}
          <div 
            className="relative rounded-2xl p-8 transition-all duration-200"
            style={{ 
              backgroundColor: '#0F141B',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
          >
            {!SHOW_MONTHLY && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: 'rgba(91, 140, 255, 0.2)',
                    color: '#5B8CFF',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  Próximamente
                </span>
              </div>
            )}
            
            <div className="text-center">
              <h3 
                className="text-2xl font-bold mb-2"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                PLEIA Monthly
              </h3>
              <p 
                className="mb-6"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Suscripción mensual
              </p>
              
              <div className="mb-6">
                <span 
                  className="text-5xl font-bold"
                  style={{ 
                    color: '#5B8CFF',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700
                  }}
                >
                  2.99€
                </span>
                <span 
                  className="ml-2"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    opacity: 0.7
                  }}
                >
                  /mes
                </span>
              </div>

              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#5B8CFF' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Playlists ilimitadas
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#5B8CFF' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Compatibilidad con Spotify
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#5B8CFF' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Updates y mejoras constantes
                  </span>
                </li>
                <li className="flex items-center">
                  <svg 
                    className="w-5 h-5 mr-3 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: '#5B8CFF' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span 
                    style={{ 
                      color: '#EAF2FF',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    Cancelar cuando quieras
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('monthly')}
                disabled={!CHECKOUT_ENABLED || !SHOW_MONTHLY || loading === 'monthly'}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  CHECKOUT_ENABLED && SHOW_MONTHLY
                    ? 'hover:shadow-lg hover:scale-[1.02]'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: CHECKOUT_ENABLED && SHOW_MONTHLY ? '#5B8CFF' : 'rgba(255, 255, 255, 0.1)',
                  color: CHECKOUT_ENABLED && SHOW_MONTHLY ? '#0B0F14' : '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  border: 'none'
                }}
              >
                {loading === 'monthly' ? (
                  <div className="flex items-center justify-center">
                    <div 
                      className="animate-spin rounded-full h-5 w-5 border-b-2 mr-2"
                      style={{ borderColor: '#0B0F14' }}
                    ></div>
                    Procesando...
                  </div>
                ) : CHECKOUT_ENABLED && SHOW_MONTHLY ? (
                  'Suscribirse'
                ) : (
                  'Próximamente'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div 
          className="mt-20 rounded-2xl p-8"
          style={{ 
            backgroundColor: '#0F141B',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <h2 
            className="text-3xl font-bold text-center mb-12"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            ¿Qué incluye?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: '#36E2B4' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 
                className="text-xl font-semibold mb-3"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Playlists ilimitadas
              </h3>
              <p 
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Crea tantas playlists como quieras sin restricciones
              </p>
            </div>

            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(91, 140, 255, 0.1)' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: '#5B8CFF' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 
                className="text-xl font-semibold mb-3"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Compatibilidad con Spotify
              </h3>
              <p 
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Integración completa con tu cuenta de Spotify
              </p>
            </div>

            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: '#36E2B4' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 
                className="text-xl font-semibold mb-3"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600
                }}
              >
                Updates y mejoras constantes
              </h3>
              <p 
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                Nuevas funciones y mejoras regulares
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

