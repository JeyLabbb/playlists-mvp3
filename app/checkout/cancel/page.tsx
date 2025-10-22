'use client';

import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Cancel Icon */}
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* Cancel Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4 font-['Space_Grotesk']">
            Pago Cancelado
          </h1>
          
          <p className="text-gray-600 mb-6 font-['Inter']">
            No se ha procesado ningún pago. Tu cuenta permanece sin cambios.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/pricing"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 inline-block font-['Inter']"
            >
              Volver a Pricing
            </Link>
            
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
              ¿Necesitas ayuda? Contacta con nuestro equipo de soporte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
