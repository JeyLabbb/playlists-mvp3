'use client';

import { useState } from 'react';
import { CHECKOUT_ENABLED, SHOW_MONTHLY } from '../../../lib/flags';

export default function PaywallModal({ isOpen, onClose, remaining, onBuyFounder }) {
  const [loading, setLoading] = useState(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(11, 15, 20, 0.6)' }}
      />
      
      {/* Modal */}
      <div 
        className="relative rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8"
        style={{ 
          backgroundColor: '#0F141B',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#EAF2FF'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 
            className="text-3xl font-bold mb-3"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            Acceso ilimitado a playlists
          </h2>
          
          <p 
            className="text-lg"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              opacity: 0.8
            }}
          >
            Has llegado al límite gratuito de este periodo.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="space-y-4 mb-8">
          {/* Founder Pass */}
          <div 
            className="rounded-xl p-6 transition-all duration-200 hover:scale-[1.02]"
            style={{ 
              backgroundColor: 'rgba(54, 226, 180, 0.1)',
              border: '1px solid rgba(54, 226, 180, 0.2)',
              boxShadow: '0 4px 20px rgba(54, 226, 180, 0.1)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 
                  className="text-xl font-semibold"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 600
                  }}
                >
                  Founder Pass
                </h3>
                <p 
                  className="text-sm"
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
                  className="text-2xl font-bold"
                  style={{ 
                    color: '#36E2B4',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700
                  }}
                >
                  5€
                </div>
                <div 
                  className="text-sm"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    opacity: 0.7
                  }}
                >
                  pago único
                </div>
              </div>
            </div>
            
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

          {/* Monthly Plan */}
          <div 
            className="rounded-xl p-6 transition-all duration-200"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 
                  className="text-xl font-semibold"
                  style={{ 
                    color: '#EAF2FF',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 600
                  }}
                >
                  PLEIA Monthly
                </h3>
                <p 
                  className="text-sm"
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
                  className="text-2xl font-bold"
                  style={{ 
                    color: '#5B8CFF',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700
                  }}
                >
                  2.99€
                </div>
                <div 
                  className="text-sm"
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
              disabled={true}
              className="w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 opacity-50 cursor-not-allowed"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div className="flex items-center justify-center">
                <span className="mr-2">Próximamente</span>
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{ 
                    backgroundColor: 'rgba(91, 140, 255, 0.2)',
                    color: '#5B8CFF'
                  }}
                >
                  Soon
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <a
            href="/pricing"
            className="text-sm underline transition-colors hover:opacity-80"
            style={{ 
              color: '#5B8CFF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400
            }}
          >
            Ver planes completos
          </a>
        </div>
      </div>
    </div>
  );
}