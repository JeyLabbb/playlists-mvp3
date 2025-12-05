export default function SupportPage() {
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
            Soporte y Ayuda
          </h1>
          
          <div 
            className="prose prose-invert max-w-none"
            style={{ color: '#EAF2FF', fontFamily: 'Inter, sans-serif' }}
          >
            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              ¿Necesitas ayuda?
            </h2>
            <p className="mb-6">
              Estamos aquí para ayudarte. Puedes contactarnos directamente o consultar nuestras preguntas frecuentes.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Contacto directo
            </h2>
            <div 
              className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-lg p-6 mb-6"
              style={{ border: '1px solid rgba(54, 226, 180, 0.2)' }}
            >
              <p className="mb-4">
                <strong>Email de soporte:</strong>
              </p>
              <p className="text-xl mb-4">
                <a 
                  href="mailto:hola@jeylabbb.com" 
                  style={{ color: '#36E2B4' }}
                  className="hover:underline"
                >
                  hola@jeylabbb.com
                </a>
              </p>
              <p className="text-sm opacity-80">
                Respondemos normalmente en menos de 24 horas.
              </p>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Cómo usamos tu cuenta de Spotify
            </h2>
            <p className="mb-4">
              PLEIA solicita permisos específicos de Spotify para funcionar correctamente:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Información del perfil:</strong> Para personalizar tu experiencia</li>
              <li><strong>Crear playlists:</strong> Para generar playlists en tu cuenta</li>
              <li><strong>Leer tus gustos:</strong> Para mejorar las recomendaciones</li>
              <li><strong>Acceso a biblioteca:</strong> Para entender tus preferencias musicales</li>
            </ul>
            <p className="mb-6">
              <strong>Tu privacidad es importante:</strong> Solo utilizamos estos datos para crear playlists 
              personalizadas. Nunca almacenamos tu contraseña ni accedemos a información sensible.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Preguntas frecuentes
            </h2>
            
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#5B8CFF' }}>
                  ¿Cómo funciona PLEIA?
                </h3>
                <p>
                  PLEIA utiliza inteligencia artificial para analizar tus prompts y crear playlists 
                  personalizadas en Spotify. Solo necesitas describir el tipo de música que quieres 
                  y nosotros nos encargamos del resto.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#5B8CFF' }}>
                  ¿Es seguro conectar mi cuenta de Spotify?
                </h3>
                <p>
                  Sí, utilizamos la autenticación oficial de Spotify (OAuth 2.0) que es completamente segura. 
                  Nunca almacenamos tu contraseña y solo accedemos a los permisos específicos que necesitamos.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#5B8CFF' }}>
                  ¿Puedo eliminar mis datos?
                </h3>
                <p>
                  Sí, puedes solicitar la eliminación completa de tus datos en cualquier momento. 
                  Visita nuestra página de <a href="/delete-data" style={{ color: '#36E2B4' }}>eliminación de datos</a> 
                  para más información.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#5B8CFF' }}>
                  ¿Qué es el Founder Pass?
                </h3>
                <p>
                  El Founder Pass es nuestro plan premium que te da acceso ilimitado a todas las funciones 
                  de PLEIA, incluyendo generación ilimitada de playlists y funciones exclusivas.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#5B8CFF' }}>
                  ¿Cómo puedo cancelar mi Founder Pass?
                </h3>
                <p>
                  Puedes gestionar tu suscripción directamente desde tu perfil en PLEIA o contactarnos 
                  en hola@jeylabbb.com para asistencia.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Reportar problemas
            </h2>
            <p className="mb-4">
              Si encuentras algún problema técnico o tienes sugerencias de mejora, no dudes en contactarnos:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Problemas de conexión con Spotify</li>
              <li>Errores en la generación de playlists</li>
              <li>Sugerencias de nuevas funciones</li>
              <li>Problemas de facturación</li>
              <li>Cualquier otro problema técnico</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Enlaces útiles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <a 
                href="/privacy" 
                className="block p-4 rounded-lg border hover:border-green-400 transition-colors"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#EAF2FF'
                }}
              >
                <strong>Política de Privacidad</strong><br />
                <span className="text-sm opacity-70">Cómo protegemos tus datos</span>
              </a>
              <a 
                href="/terms" 
                className="block p-4 rounded-lg border hover:border-green-400 transition-colors"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#EAF2FF'
                }}
              >
                <strong>Términos de Servicio</strong><br />
                <span className="text-sm opacity-70">Condiciones de uso</span>
              </a>
              <a 
                href="/delete-data" 
                className="block p-4 rounded-lg border hover:border-green-400 transition-colors"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#EAF2FF'
                }}
              >
                <strong>Eliminar Datos</strong><br />
                <span className="text-sm opacity-70">Cómo borrar tu cuenta</span>
              </a>
              <a 
                href="/pricing" 
                className="block p-4 rounded-lg border hover:border-green-400 transition-colors"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#EAF2FF'
                }}
              >
                <strong>Precios</strong><br />
                <span className="text-sm opacity-70">Planes y Founder Pass</span>
              </a>
            </div>

            <div 
              className="mt-8 pt-6"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <p className="text-sm opacity-70">
                Gracias por usar PLEIA. Estamos comprometidos a brindarte la mejor experiencia posible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
