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
        throw new Error('Failed to create billing portal session');
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      alert('Error al abrir el portal de facturación. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4 font-['Space_Grotesk']">
            ¡Pago completado!
          </h1>
          
          <p className="text-gray-600 mb-6 font-['Inter']">
            ✅ Pago completado. Revisa tu email.
          </p>

          {sessionId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1 font-['Inter']">ID de Sesión:</p>
              <p className="text-xs font-mono text-gray-700 break-all">{sessionId}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleManageBilling}
              disabled={loading || !sessionId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 font-['Inter']"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Abriendo...
                </div>
              ) : (
                'Gestionar facturación (Billing Portal)'
              )}
            </button>
            
            <Link
              href="/"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 inline-block font-['Inter']"
            >
              Volver al Inicio
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 font-['Inter']">
              Recibirás un email de confirmación en breve con los detalles de tu suscripción.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
