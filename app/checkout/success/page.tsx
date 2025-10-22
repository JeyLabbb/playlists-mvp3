'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      // Check if this is a Founder Pass (one-time payment) or Monthly subscription
      const sessionResponse = await fetch(`/api/stripe/session-info?session_id=${sessionId}`);
      const sessionData = await sessionResponse.json();
      
      if (sessionData.isFounderPass) {
        // Founder Pass - redirect to profile page
        window.location.href = '/me';
      } else {
        // Monthly subscription - use billing portal
        const response = await fetch('/api/stripe/portal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await response.json();

        if (response.ok && data.url) {
          window.location.href = data.url;
        } else {
          console.error('Portal error:', data);
          if (data.error === 'No customer found in session') {
            alert('Esta sesión de pago no tiene información de cliente. Esto puede ocurrir si el pago aún no se ha procesado completamente. Inténtalo de nuevo en unos minutos.');
          } else if (data.error === 'Stripe not configured') {
            alert('El sistema de pagos no está configurado correctamente.');
          } else {
            alert(`Error al abrir el portal de facturación: ${data.error || 'Error desconocido'}`);
          }
        }
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      alert('Error al procesar la solicitud. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
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
          {/* Success Icon */}
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: '#36E2B4' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 
            className="text-3xl font-bold mb-4"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            ¡Pago completado!
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
            ✅ Pago completado. Revisa tu email.
          </p>

          {sessionId && (
            <div 
              className="rounded-lg p-4 mb-6"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <p 
                className="text-sm mb-1"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                ID de Sesión:
              </p>
              <p 
                className="text-xs font-mono break-all"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'monospace',
                  opacity: 0.8
                }}
              >
                {sessionId}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleManageBilling}
              disabled={loading || !sessionId}
              className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: loading || !sessionId ? 'rgba(255, 255, 255, 0.1)' : '#5B8CFF',
                color: '#0B0F14',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                border: 'none'
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div 
                    className="animate-spin rounded-full h-5 w-5 border-b-2 mr-2"
                    style={{ borderColor: '#0B0F14' }}
                  ></div>
                  Abriendo...
                </div>
                     ) : (
                       'Ir a mi perfil'
                     )}
            </button>
            
            <Link
              href="/"
              className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 inline-block hover:shadow-lg hover:scale-[1.02]"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              Volver al Inicio
            </Link>
          </div>

          {/* Additional Info */}
          <div 
            className="mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <p 
              className="text-sm"
              style={{ 
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                opacity: 0.7
              }}
            >
              Recibirás un email de confirmación en breve con los detalles de tu suscripción.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
