'use client';

import { CHECKOUT_ENABLED } from '../../lib/flags';

export default function OffersPage() {
  const offers = [
    {
      id: 'early-bird',
      title: 'Early Bird',
      subtitle: 'Para los primeros usuarios',
      discount: '50%',
      originalPrice: '$19.99',
      newPrice: '$9.99',
      description: 'Oferta especial para los primeros 100 usuarios que se suscriban',
      features: [
        'Acceso completo a todas las funciones',
        'Soporte prioritario',
        'Sin compromiso de permanencia',
        'Actualizaciones gratuitas de por vida'
      ],
      badge: 'Limitado',
      badgeColor: 'bg-red-500',
      expires: '31 de diciembre, 2024'
    },
    {
      id: 'student',
      title: 'Estudiante',
      subtitle: 'Descuento educativo',
      discount: '30%',
      originalPrice: '$9.99',
      newPrice: '$6.99',
      description: 'Descuento especial para estudiantes con email .edu',
      features: [
        'Verificación de estudiante requerida',
        'Acceso a funciones Pro',
        'Soporte técnico incluido',
        'Renovación automática'
      ],
      badge: 'Verificación',
      badgeColor: 'bg-blue-500',
      expires: 'Sin límite'
    },
    {
      id: 'annual',
      title: 'Plan Anual',
      subtitle: 'Ahorra con el pago anual',
      discount: '20%',
      originalPrice: '$19.99/mes',
      newPrice: '$15.99/mes',
      description: 'Paga por todo el año y ahorra 2 meses completos',
      features: [
        'Facturación anual',
        'Ahorro garantizado',
        'Acceso inmediato a nuevas funciones',
        'Soporte premium incluido'
      ],
      badge: 'Ahorro',
      badgeColor: 'bg-green-500',
      expires: 'Oferta permanente'
    }
  ];

  const handleOfferClick = (offerId: string) => {
    if (!CHECKOUT_ENABLED) {
      alert('Los pagos estarán disponibles próximamente');
      return;
    }
    
    // In a real implementation, you would:
    // 1. Apply the discount code
    // 2. Redirect to checkout with the offer
    console.log('Offer clicked:', offerId);
    alert(`Oferta ${offerId} seleccionada. Los pagos estarán disponibles próximamente.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Ofertas Especiales
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Aprovecha estas ofertas limitadas y obtén acceso premium 
            a un precio especial.
          </p>
          {!CHECKOUT_ENABLED && (
            <div className="mt-6 inline-flex items-center bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-4 py-2">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-200 font-medium">
                Los pagos estarán disponibles próximamente
              </span>
            </div>
          )}
        </div>

        {/* Offers Grid */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="relative bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Badge */}
              <div className={`absolute top-4 right-4 ${offer.badgeColor} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                {offer.badge}
              </div>

              {/* Discount Badge */}
              <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                -{offer.discount}
              </div>

              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {offer.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{offer.subtitle}</p>
                  
                  {/* Pricing */}
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {offer.newPrice}
                    </span>
                    <span className="text-lg text-gray-500 line-through ml-2">
                      {offer.originalPrice}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm">
                    {offer.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {offer.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg
                        className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Expiry */}
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500">
                    Expira: {offer.expires}
                  </p>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleOfferClick(offer.id)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    CHECKOUT_ENABLED
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                  disabled={!CHECKOUT_ENABLED}
                >
                  {CHECKOUT_ENABLED ? 'Aprovechar Oferta' : 'Próximamente'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Terms */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Términos y Condiciones
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 text-gray-300">
              <div>
                <h3 className="font-semibold text-white mb-2">Ofertas Limitadas</h3>
                <p className="text-sm">
                  Las ofertas están sujetas a disponibilidad y pueden terminar sin previo aviso. 
                  Los descuentos no son acumulables con otras promociones.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">Verificación</h3>
                <p className="text-sm">
                  Algunas ofertas pueden requerir verificación de identidad o elegibilidad. 
                  Nos reservamos el derecho de cancelar ofertas si no se cumplen los requisitos.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">Renovación</h3>
                <p className="text-sm">
                  Las suscripciones se renuevan automáticamente. Puedes cancelar en cualquier momento 
                  desde tu panel de usuario sin penalizaciones.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">Reembolsos</h3>
                <p className="text-sm">
                  Ofrecemos reembolsos completos dentro de los primeros 7 días de la suscripción. 
                  Después de este período, se aplican nuestras políticas estándar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


