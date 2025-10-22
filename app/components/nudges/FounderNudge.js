'use client';

import { useState, useEffect } from 'react';
import { CHECKOUT_ENABLED, SHOW_MONTHLY } from '../../../lib/flags';

export default function FounderNudge() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasFounderPlan, setHasFounderPlan] = useState(false);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    // Check if user has Founder plan
    const checkFounderPlan = async () => {
      try {
        const response = await fetch('/api/usage/check');
        if (response.ok) {
          const data = await response.json();
          // If user has unlimited access, they likely have Founder plan
          if (data.hasUnlimitedAccess || data.plan === 'founder') {
            setHasFounderPlan(true);
            return;
          }
        }
      } catch (error) {
        console.log('[FOUNDER_NUDGE] Could not check plan status:', error);
      }
    };

    checkFounderPlan();

    // Check if user has already seen the nudge in this session
    const hasSeenNudge = sessionStorage.getItem('pleia-founder-nudge-seen');
    if (!hasSeenNudge && !hasFounderPlan) {
      // Show nudge after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [hasFounderPlan]);

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
        throw new Error(data.reason || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error al procesar el pago. Inténtalo de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  // Don't show if user has Founder plan or has been dismissed
  if (!isVisible || isDismissed || hasFounderPlan) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 animate-in slide-in-from-bottom-2 duration-300">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="pr-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm font-['Space_Grotesk']">
                Fíjate
              </h3>
              <p className="text-sm text-gray-600 font-['Inter']">
                Por 5€ tienes acceso ilimitado (Founder Pass).
              </p>
            </div>
          </div>

          {/* Pricing Plans */}
          <div className="space-y-3 mb-4">
            {/* Founder Pass */}
            <div className="border border-green-200 rounded-lg p-3 bg-green-50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm font-['Space_Grotesk']">
                    Founder Pass
                  </h4>
                  <p className="text-xs text-gray-600 font-['Inter']">
                    Acceso vitalicio
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">5€</div>
                  <div className="text-xs text-gray-600">pago único</div>
                </div>
              </div>
              
              <button
                onClick={() => handleSubscribe('founder')}
                disabled={!CHECKOUT_ENABLED || loading === 'founder'}
                className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  CHECKOUT_ENABLED
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                } ${loading === 'founder' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading === 'founder' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
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
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm font-['Space_Grotesk']">
                      PLEIA Monthly
                    </h4>
                    <p className="text-xs text-gray-600 font-['Inter']">
                      Suscripción mensual
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">2.99€</div>
                    <div className="text-xs text-gray-600">/mes</div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSubscribe('monthly')}
                  disabled={!CHECKOUT_ENABLED || loading === 'monthly'}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    CHECKOUT_ENABLED
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  } ${loading === 'monthly' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading === 'monthly' ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
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
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors font-['Inter']"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}