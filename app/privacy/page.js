export default function PrivacyPage() {
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
            Política de Privacidad
          </h1>
          
          <div 
            className="prose prose-invert max-w-none"
            style={{ color: '#EAF2FF', fontFamily: 'Inter, sans-serif' }}
          >
            <p className="text-lg mb-6 opacity-80">
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Información que recopilamos
            </h2>
            <p className="mb-6">
              PLEIA recopila únicamente la información necesaria para proporcionar nuestros servicios de generación de playlists:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Información de tu perfil de Spotify (nombre, email, imagen de perfil)</li>
              <li>Playlists que creas a través de nuestra plataforma</li>
              <li>Prompts y preferencias musicales que nos compartes</li>
              <li>Datos de uso para mejorar nuestros servicios</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Cómo usamos tu cuenta de Spotify
            </h2>
            <p className="mb-4">
              PLEIA solicita los siguientes permisos de Spotify para funcionar correctamente:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>user-read-email:</strong> Para identificar tu cuenta y personalizar tu experiencia</li>
              <li><strong>playlist-read-private:</strong> Para acceder a tus playlists privadas (opcional)</li>
              <li><strong>playlist-modify-public:</strong> Para crear playlists públicas en tu cuenta</li>
              <li><strong>playlist-modify-private:</strong> Para crear playlists privadas en tu cuenta</li>
              <li><strong>user-library-read:</strong> Para entender tus gustos musicales y mejorar las recomendaciones</li>
            </ul>
            <p className="mb-6">
              <strong>Importante:</strong> Nunca almacenamos tu contraseña de Spotify ni accedemos a información sensible. 
              Solo utilizamos los datos necesarios para crear y gestionar playlists según tus preferencias.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Compartir información
            </h2>
            <p className="mb-6">
              No vendemos, alquilamos ni compartimos tu información personal con terceros, excepto:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Con Spotify, únicamente para crear y gestionar tus playlists</li>
              <li>Cuando sea requerido por ley o para proteger nuestros derechos</li>
              <li>Con tu consentimiento explícito</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Tus derechos
            </h2>
            <p className="mb-4">Tienes derecho a:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Acceder a los datos que tenemos sobre ti</li>
              <li>Corregir información inexacta</li>
              <li>Solicitar la eliminación de tus datos</li>
              <li>Retirar el consentimiento en cualquier momento</li>
              <li>Exportar tus datos en formato legible</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Seguridad
            </h2>
            <p className="mb-6">
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información 
              contra acceso no autorizado, alteración, divulgación o destrucción.
            </p>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              Contacto
            </h2>
            <p className="mb-6">
              Si tienes preguntas sobre esta política de privacidad, puedes contactarnos en:
            </p>
            <p className="mb-6">
              <strong>Email:</strong> <a href="mailto:privacy@jeylabbb.com" style={{ color: '#36E2B4' }}>privacy@jeylabbb.com</a><br />
              <strong>Soporte:</strong> <a href="/support" style={{ color: '#36E2B4' }}>hola@jeylabbb.com</a>
            </p>

            <div 
              className="mt-8 pt-6"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <p className="text-sm opacity-70">
                Esta política puede actualizarse ocasionalmente. Te notificaremos de cambios significativos 
                por email o mediante un aviso en nuestra plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
