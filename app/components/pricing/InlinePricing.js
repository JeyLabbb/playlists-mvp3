'use client';

import { useState, useEffect } from 'react';
import { CHECKOUT_ENABLED, SHOW_MONTHLY } from '../../../lib/flags';

export default function InlinePricing() {
  const [loading, setLoading] = useState(null);
  const [usage, setUsage] = useState(null);
  const [devResetLoading, setDevResetLoading] = useState(false);

  // Load usage data
  useEffect(() => {
    const loadUsage = async () => {
      try {
        const response = await fetch('/api/usage/check');
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (error) {
        console.error('Error loading usage:', error);
      }
    };
    
    loadUsage();
  }, []);

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

  const handleDevReset = async () => {
    if (process.env.NODE_ENV === 'production') return;
    
    setDevResetLoading(true);
    try {
      const response = await fetch('/api/usage/reset', { method: 'POST' });
      if (response.ok) {
        // Reload usage data
        const usageResponse = await fetch('/api/usage/check');
        if (usageResponse.ok) {
          const data = await usageResponse.json();
          setUsage(data);
        }
      }
    } catch (error) {
      console.error('Error resetting usage:', error);
    } finally {
      setDevResetLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-['Space_Grotesk']">
            Desbloquea PLEIA
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto font-['Inter']">
            Crea playlists ilimitadas con IA avanzada
          </p>
          {usage && (
            <div className="mt-4 inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-blue-700 font-medium text-sm font-['Inter']">
                Tienes {usage.remaining} usos gratis restantes
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Founder Pass */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 font-['Space_Grotesk']">
                Founder Pass
              </h3>
              <p className="text-gray-600 mb-6 font-['Inter']">
                Acceso vitalicio
              </p>
              
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">5€</span>
                <span className="text-gray-600 ml-2">pago único</span>
              </div>

              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-['Inter']">Playlists ilimitadas</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-['Inter']">Modo avanzado IA</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-['Inter']">Soporte prioritario</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-['Inter']">Actualizaciones futuras</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('founder')}
                disabled={!CHECKOUT_ENABLED || loading === 'founder'}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  CHECKOUT_ENABLED
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                } ${loading === 'founder' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading === 'founder' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md p-8 hover:shadow-lg transition-shadow">
            {!SHOW_MONTHLY && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                  Próximamente
                </span>
              </div>
            )}
            
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 font-['Space_Grotesk']">
                PLEIA Monthly
              </h3>
              <p className="text-gray-600 mb-6 font-['Inter']">
                Suscripción mensual
              </p>
              
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">2.99€</span>
                <span className="text-gray-600 ml-2">/mes</span>
              </div>

              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-['Inter']">Playlists ilimitadas</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-['Inter']">Modo avanzado IA</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-['Inter']">Soporte por email</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 font-['Inter']">Cancelar cuando quieras</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe('monthly')}
                disabled={!CHECKOUT_ENABLED || !SHOW_MONTHLY || loading === 'monthly'}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  CHECKOUT_ENABLED && SHOW_MONTHLY
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                } ${loading === 'monthly' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading === 'monthly' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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

        {/* Dev Reset Button (only in development) */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="text-center mt-8">
            <button
              onClick={handleDevReset}
              disabled={devResetLoading}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500/10 to-cyan-500/10 hover:from-green-500/20 hover:to-cyan-500/20 border border-green-500/30 hover:border-green-500/50 rounded-lg text-sm font-medium text-green-700 hover:text-green-800 transition-all duration-200 font-['Inter'] shadow-sm hover:shadow-md"
            >
              {devResetLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                  Reseteando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset usos (dev)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
