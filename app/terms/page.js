export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0F14' }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div 
          className="rounded-2xl shadow-2xl p-8"
          style={{ 
            backgroundColor: '#0F141B',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <h1 
            className="text-4xl font-bold mb-8"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            Términos de Servicio
          </h1>
          
          <div 
            className="prose prose-invert max-w-none"
            style={{ color: '#EAF2FF', fontFamily: 'Inter, sans-serif' }}
          >
            <p className="text-lg mb-6 opacity-80">
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Aceptación de los términos
            </h2>
            <p className="mb-6">
              Al utilizar PLEIA, aceptas estos términos de servicio. Si no estás de acuerdo con alguna parte 
              de estos términos, no debes usar nuestro servicio.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Descripción del servicio
            </h2>
            <p className="mb-6">
              PLEIA es una plataforma que utiliza inteligencia artificial para generar playlists personalizadas 
              en Spotify basadas en tus preferencias musicales y prompts descriptivos.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Uso del servicio
            </h2>
            <p className="mb-4">Al usar PLEIA, te comprometes a:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Proporcionar información precisa y actualizada</li>
              <li>No usar el servicio para actividades ilegales o no autorizadas</li>
              <li>Respetar los derechos de propiedad intelectual</li>
              <li>No intentar acceder a cuentas de otros usuarios</li>
              <li>No usar el servicio para spam o contenido ofensivo</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Cuentas y responsabilidades
            </h2>
            <p className="mb-6">
              Eres responsable de mantener la confidencialidad de tu cuenta de Spotify y de todas las 
              actividades que ocurran bajo tu cuenta. PLEIA no es responsable de pérdidas resultantes 
              del uso no autorizado de tu cuenta.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Límites de uso
            </h2>
            <p className="mb-4">Los usuarios gratuitos tienen acceso limitado a:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>5 playlists generadas por mes</li>
              <li>Funciones básicas de generación</li>
            </ul>
            <p className="mb-6">
              Los usuarios con Founder Pass tienen acceso ilimitado a todas las funciones.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Propiedad intelectual
            </h2>
            <p className="mb-6">
              PLEIA y su contenido están protegidos por derechos de autor y otras leyes de propiedad 
              intelectual. No puedes copiar, modificar o distribuir nuestro contenido sin autorización.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Limitación de responsabilidad
            </h2>
            <p className="mb-6">
              PLEIA se proporciona &quot;tal como está&quot; sin garantías de ningún tipo. No seremos responsables 
              por daños directos, indirectos, incidentales o consecuentes que puedan resultar del uso de 
              nuestro servicio.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Modificaciones del servicio
            </h2>
            <p className="mb-6">
              Nos reservamos el derecho de modificar, suspender o discontinuar el servicio en cualquier 
              momento sin previo aviso. También podemos modificar estos términos ocasionalmente.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Terminación
            </h2>
            <p className="mb-6">
              Podemos terminar o suspender tu acceso al servicio inmediatamente, sin previo aviso, 
              por cualquier motivo, incluyendo la violación de estos términos.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Ley aplicable
            </h2>
            <p className="mb-6">
              Estos términos se rigen por las leyes de España. Cualquier disputa será resuelta en 
              los tribunales competentes de España.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Contacto
            </h2>
            <p className="mb-6">
              Si tienes preguntas sobre estos términos, puedes contactarnos en:
            </p>
            <p className="mb-6">
              <strong>Email:</strong> <a href="mailto:legal@jeylabbb.com" style={{ color: '#36E2B4' }}>legal@jeylabbb.com</a><br />
              <strong>Soporte:</strong> <a href="/support" style={{ color: '#36E2B4' }}>hola@jeylabbb.com</a>
            </p>

            <div 
              className="mt-8 pt-6"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <p className="text-sm opacity-70">
                Estos términos pueden actualizarse ocasionalmente. Te notificaremos de cambios significativos 
                por email o mediante un aviso en nuestra plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
