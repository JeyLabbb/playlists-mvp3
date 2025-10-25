export default function ReviewChecklistPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0F14' }}>
      <div className="max-w-6xl mx-auto px-4 py-12">
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
            📋 Checklist de Revisión de Spotify
          </h1>
          
          <div 
            className="prose prose-invert max-w-none"
            style={{ color: '#EAF2FF', fontFamily: 'Inter, sans-serif' }}
          >
            <div 
              className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-6 mb-8"
              style={{ border: '1px solid rgba(34, 197, 94, 0.2)' }}
            >
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#22c55e' }}>
                ✅ Páginas Legales Requeridas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Páginas creadas:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><a href="/privacy" style={{ color: '#36E2B4' }}>/privacy</a> - Política de privacidad</li>
                    <li><a href="/terms" style={{ color: '#36E2B4' }}>/terms</a> - Términos de servicio</li>
                    <li><a href="/support" style={{ color: '#36E2B4' }}>/support</a> - Soporte y ayuda</li>
                    <li><a href="/delete-data" style={{ color: '#36E2B4' }}>/delete-data</a> - Eliminación de datos</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Contenido incluido:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Scopes de Spotify documentados</li>
                    <li>Uso de datos explicado</li>
                    <li>Email de contacto visible</li>
                    <li>Proceso de eliminación claro</li>
                  </ul>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              🔗 Enlaces en Footer
            </h2>
            <p className="mb-4">Verificar que el footer incluya:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Enlace a /privacy</li>
              <li>Enlace a /terms</li>
              <li>Enlace a /support</li>
              <li>Enlace a /delete-data</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              🎵 Scopes de Spotify Documentados
            </h2>
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-4">Scopes que solicitamos:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>user-read-email:</strong> Para identificar tu cuenta y personalizar tu experiencia</li>
                <li><strong>playlist-read-private:</strong> Para acceder a tus playlists privadas (opcional)</li>
                <li><strong>playlist-modify-public:</strong> Para crear playlists públicas en tu cuenta</li>
                <li><strong>playlist-modify-private:</strong> Para crear playlists privadas en tu cuenta</li>
                <li><strong>user-library-read:</strong> Para entender tus gustos musicales y mejorar las recomendaciones</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              🎨 Branding de Spotify
            </h2>
            <div className="space-y-4 mb-6">
              <div 
                className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-6"
                style={{ border: '1px solid rgba(34, 197, 94, 0.2)' }}
              >
                <h3 className="font-semibold mb-3" style={{ color: '#22c55e' }}>
                  Botón "Crear en Spotify"
                </h3>
                <p className="mb-2">Verificar que incluya:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Logo oficial de Spotify (16-18px)</li>
                  <li>Texto "Crear en Spotify" o "Añadir a Spotify"</li>
                  <li>Leyenda "Funciona con Spotify" debajo</li>
                  <li>Colores oficiales de Spotify</li>
                </ul>
              </div>

              <div 
                className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-6"
                style={{ border: '1px solid rgba(34, 197, 94, 0.2)' }}
              >
                <h3 className="font-semibold mb-3" style={{ color: '#22c55e' }}>
                  Botón de Login
                </h3>
                <p className="mb-2">Verificar que incluya:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Logo oficial de Spotify</li>
                  <li>Texto "Iniciar sesión con Spotify"</li>
                  <li>Colores oficiales de Spotify</li>
                  <li>Sin alteraciones de marca</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              📱 Flujo de Usuario Completo
            </h2>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div 
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="text-2xl mb-2">🔐</div>
                  <h3 className="font-semibold mb-2">1. Login</h3>
                  <p className="text-sm opacity-80">OAuth con Spotify</p>
                </div>
                <div 
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="text-2xl mb-2">✍️</div>
                  <h3 className="font-semibold mb-2">2. Prompt</h3>
                  <p className="text-sm opacity-80">Describir playlist</p>
                </div>
                <div 
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="text-2xl mb-2">👀</div>
                  <h3 className="font-semibold mb-2">3. Preview</h3>
                  <p className="text-sm opacity-80">Ver tracks generados</p>
                </div>
                <div 
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="text-2xl mb-2">🎵</div>
                  <h3 className="font-semibold mb-2">4. Crear</h3>
                  <p className="text-sm opacity-80">Botón con logo Spotify</p>
                </div>
                <div 
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="text-2xl mb-2">✅</div>
                  <h3 className="font-semibold mb-2">5. Resultado</h3>
                  <p className="text-sm opacity-80">Playlist en Spotify</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              📧 Información de Contacto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <strong>Soporte:</strong><br />
                <a href="mailto:hola@jeylabbb.com" style={{ color: '#36E2B4' }}>
                  hola@jeylabbb.com
                </a>
              </div>
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <strong>Privacidad:</strong><br />
                <a href="mailto:privacy@jeylabbb.com" style={{ color: '#36E2B4' }}>
                  privacy@jeylabbb.com
                </a>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#36E2B4' }}>
              🚫 Elementos a Evitar
            </h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>No duplicar logos de Spotify</li>
              <li>No alterar colores oficiales de Spotify</li>
              <li>No usar variantes no oficiales del logo</li>
              <li>No ocultar información de contacto</li>
              <li>No usar placeholders en lugar de contenido real</li>
            </ul>

            <div 
              className="mt-8 pt-6"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <p className="text-sm opacity-70">
                Esta página es solo para revisión interna. No debe ser indexada por motores de búsqueda.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
