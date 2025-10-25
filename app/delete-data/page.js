export default function DeleteDataPage() {
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
            Eliminar Datos y Cuenta
          </h1>
          
          <div 
            className="prose prose-invert max-w-none"
            style={{ color: '#EAF2FF', fontFamily: 'Inter, sans-serif' }}
          >
            <div 
              className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg p-6 mb-8"
              style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#ef4444' }}>
                ⚠️ Acción irreversible
              </h2>
              <p className="mb-4">
                La eliminación de tu cuenta y datos es <strong>permanente e irreversible</strong>. 
                No podrás recuperar tu información una vez eliminada.
              </p>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              ¿Qué datos eliminamos?
            </h2>
            <p className="mb-4">Al eliminar tu cuenta, borraremos permanentemente:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Tu perfil de usuario en PLEIA</li>
              <li>Todas las playlists creadas a través de nuestra plataforma</li>
              <li>Historial de prompts y preferencias musicales</li>
              <li>Datos de uso y estadísticas</li>
              <li>Información de facturación (si aplica)</li>
              <li>Cualquier otro dato personal asociado a tu cuenta</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              ¿Qué NO eliminamos?
            </h2>
            <p className="mb-4">Importante: No podemos eliminar:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Playlists que ya existen en tu cuenta de Spotify</li>
              <li>Datos almacenados directamente en Spotify</li>
              <li>Información requerida por ley para mantener</li>
              <li>Datos anonimizados para análisis estadísticos</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Cómo eliminar tu cuenta
            </h2>
            <div className="space-y-4 mb-8">
              <div 
                className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-lg p-6"
                style={{ border: '1px solid rgba(54, 226, 180, 0.2)' }}
              >
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#36E2B4' }}>
                  Opción 1: Eliminación automática
                </h3>
                <p className="mb-4">
                  Puedes eliminar tu cuenta directamente desde tu perfil:
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Ve a tu <a href="/me" style={{ color: '#36E2B4' }}>perfil de usuario</a></li>
                  <li>Busca la sección "Configuración de cuenta"</li>
                  <li>Haz clic en "Eliminar cuenta"</li>
                  <li>Confirma la eliminación</li>
                </ol>
              </div>

              <div 
                className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-6"
                style={{ border: '1px solid rgba(251, 146, 60, 0.2)' }}
              >
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#fb923c' }}>
                  Opción 2: Solicitud por email
                </h3>
                <p className="mb-4">
                  Si prefieres hacerlo por email, envíanos una solicitud a:
                </p>
                <p className="mb-4">
                  <strong>Email:</strong> 
                  <a 
                    href="mailto:privacy@jeylabbb.com?subject=Solicitud de eliminación de datos" 
                    style={{ color: '#36E2B4' }}
                    className="hover:underline ml-2"
                  >
                    privacy@jeylabbb.com
                  </a>
                </p>
                <p className="text-sm opacity-80">
                  Incluye tu email de Spotify para verificar tu identidad.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Tiempo de procesamiento
            </h2>
            <p className="mb-6">
              Las solicitudes de eliminación se procesan dentro de <strong>30 días</strong> 
              desde la fecha de solicitud. Recibirás una confirmación por email una vez 
              completada la eliminación.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Desconectar de Spotify
            </h2>
            <p className="mb-4">
              Para desconectar completamente tu cuenta de Spotify de PLEIA:
            </p>
            <ol className="list-decimal pl-6 mb-6 space-y-2">
              <li>Ve a tu <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noopener noreferrer" style={{ color: '#36E2B4' }}>página de aplicaciones conectadas en Spotify</a></li>
              <li>Busca "PLEIA" en la lista de aplicaciones</li>
              <li>Haz clic en "Desconectar" o "Remove access"</li>
            </ol>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Derechos bajo GDPR
            </h2>
            <p className="mb-4">
              Si eres residente de la UE, tienes los siguientes derechos:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Derecho al olvido:</strong> Solicitar la eliminación de tus datos</li>
              <li><strong>Derecho de acceso:</strong> Solicitar una copia de tus datos</li>
              <li><strong>Derecho de rectificación:</strong> Corregir datos inexactos</li>
              <li><strong>Derecho de portabilidad:</strong> Exportar tus datos</li>
              <li><strong>Derecho de oposición:</strong> Oponerte al procesamiento</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Contacto
            </h2>
            <p className="mb-6">
              Si tienes preguntas sobre la eliminación de datos o necesitas asistencia:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <strong>Privacidad:</strong><br />
                <a href="mailto:privacy@jeylabbb.com" style={{ color: '#36E2B4' }}>
                  privacy@jeylabbb.com
                </a>
              </div>
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <strong>Soporte:</strong><br />
                <a href="mailto:hola@jeylabbb.com" style={{ color: '#36E2B4' }}>
                  hola@jeylabbb.com
                </a>
              </div>
            </div>

            <div 
              className="mt-8 pt-6"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <p className="text-sm opacity-70">
                Esta página se actualiza regularmente para reflejar nuestras prácticas actuales 
                de eliminación de datos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
