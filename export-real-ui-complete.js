const fs = require('fs');
const path = require('path');

// PLEIA Design System Tokens EXACTOS del CSS
const tokens = {
  colors: {
    night: '#0B0F12',
    slate: '#1A232B', 
    cloud: '#F5F7FA',
    mist: '#C7D0DA',
    aurora: '#36E2B4',
    electric: '#5B8CFF',
    accentMixed: '#47C8D1'
  },
  fonts: {
    primary: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  gradients: {
    primary: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
    soft: 'linear-gradient(135deg, rgba(71, 200, 209, 0.8), rgba(91, 140, 255, 0.6))',
    subtle: 'linear-gradient(135deg, rgba(71, 200, 209, 0.1), rgba(91, 140, 255, 0.1))'
  }
};

// Create exports directory
const exportsDir = 'exports/ui-real';
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

console.log('🎨 Exportando UI REAL COMPLETA de PLEIA a SVG...');

// 1. PÁGINA PRINCIPAL COMPLETA (EXACTA)
const homePageRealSvg = `
<svg width="1200" height="3000" viewBox="0 0 1200 3000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .main-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: ${tokens.colors.cloud}; letter-spacing: -0.02em; line-height: 1.2; }
      .body-text { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 400; fill: ${tokens.colors.cloud}; line-height: 1.5; }
      .label-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
      .example-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
      .placeholder-text { font-family: ${tokens.fonts.body}; font-size: 16px; fill: rgba(199,208,218,0.6); }
      .button-text { font-family: ${tokens.fonts.primary}; font-size: 16px; font-weight: 600; fill: ${tokens.colors.night}; letter-spacing: 0.01em; }
      .tips-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: white; }
      .epic-title { font-family: ${tokens.fonts.primary}; font-size: 72px; font-weight: 800; fill: url(#epicGradient); letter-spacing: -0.04em; line-height: 0.9; }
      .epic-subtitle { font-family: ${tokens.fonts.body}; font-size: 20px; font-weight: 500; fill: #D1D5DB; }
      .epic-desc { font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 400; fill: #9CA3AF; line-height: 1.6; }
      .feature-title { font-family: ${tokens.fonts.body}; font-size: 20px; font-weight: 600; fill: white; }
      .feature-desc { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 400; fill: #9CA3AF; }
      .footer-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: ${tokens.colors.mist}; }
      .footer-link { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: ${tokens.colors.mist}; }
    </style>
    <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tokens.colors.accentMixed};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${tokens.colors.electric};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="epicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tokens.colors.accentMixed};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${tokens.colors.electric};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="epicBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(54,226,180,0.1);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(91,140,255,0.1);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="3000" fill="${tokens.colors.night}"/>
  
  <!-- Navigation -->
  <rect x="0" y="0" width="1200" height="64" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  
  <!-- Hamburger Menu -->
  <rect x="24" y="24" width="24" height="16" fill="none" stroke="${tokens.colors.cloud}" stroke-width="2" rx="2"/>
  <line x1="30" y1="28" x2="42" y2="28" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <line x1="30" y1="32" x2="42" y2="32" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <line x1="30" y1="36" x2="42" y2="36" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  
  <!-- Logo -->
  <text x="80" y="45" class="main-title" font-size="24" font-weight="700">PLEIA</text>
  
  <!-- Login Button -->
  <rect x="1000" y="20" width="160" height="24" fill="url(#mainGradient)" rx="12"/>
  <text x="1080" y="35" class="button-text" font-size="14" text-anchor="middle">Inicia sesión</text>
  
  <!-- Main Content -->
  <rect x="48" y="96" width="1104" height="600" fill="${tokens.colors.slate}" rx="16"/>
  
  <!-- Title -->
  <text x="72" y="140" class="main-title">¿Qué tipo de playlist quieres?</text>
  
  <!-- Textarea -->
  <rect x="72" y="180" width="1056" height="120" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="88" y="220" class="placeholder-text">Describe tu playlist perfecta... ej: 'calentar para Primavera Sound 2024', 'reggaeton como Bad Bunny pero sin Bad Bunny', 'girl groups k-pop 2024'</text>
  
  <!-- Examples -->
  <text x="72" y="340" class="label-text">Prueba estos ejemplos:</text>
  
  <!-- Example Chips -->
  <rect x="72" y="360" width="280" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="88" y="380" class="example-text">calentar para Primavera Sound 2024</text>
  
  <rect x="368" y="360" width="320" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="384" y="380" class="example-text">reggaeton como Bad Bunny pero sin Bad Bunny</text>
  
  <rect x="704" y="360" width="200" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="720" y="380" class="example-text">girl groups k-pop 2024</text>
  
  <rect x="920" y="360" width="200" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="936" y="380" class="example-text">hardstyle nightcore 80 canciones</text>
  
  <rect x="72" y="408" width="280" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="88" y="428" class="example-text">para entrenar sin voces, 120-140 bpm</text>
  
  <!-- Controls -->
  <text x="72" y="480" class="label-text">Canciones:</text>
  <rect x="200" y="460" width="80" height="40" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="8"/>
  <text x="240" y="485" class="body-text" text-anchor="middle">50</text>
  
  <!-- Tips Button -->
  <rect x="300" y="460" width="120" height="40" fill="#374151" stroke="#4B5563" stroke-width="1" rx="20"/>
  <text x="320" y="485" class="tips-text">💡 Consejos</text>
  
  <!-- Generate Button -->
  <rect x="440" y="460" width="200" height="50" fill="url(#mainGradient)" rx="16"/>
  <text x="540" y="490" class="button-text" text-anchor="middle">Generar Playlist</text>
  
  <!-- Empty State -->
  <rect x="48" y="720" width="1104" height="200" fill="${tokens.colors.slate}" rx="16"/>
  <rect x="568" y="760" width="64" height="64" fill="url(#mainGradient)" rx="16"/>
  <text x="600" y="800" class="body-text" font-size="24" fill="white" text-anchor="middle">🎵</text>
  <text x="600" y="840" class="main-title" font-size="32" text-anchor="middle">¿Listo para crear tu playlist?</text>
  <text x="600" y="870" class="body-text" fill="rgba(199,208,218,0.8)" text-anchor="middle">Ingresa un prompt arriba para comenzar. La IA entenderá tu intención y creará la playlist perfecta para ti.</text>
  
  <!-- Epic Section -->
  <rect x="0" y="960" width="1200" height="600" fill="url(#epicBg)" rx="0"/>
  
  <!-- Epic Title -->
  <text x="600" y="1050" class="epic-title" text-anchor="middle">PLEIA</text>
  
  <!-- Epic Subtitle -->
  <text x="600" y="1100" class="epic-subtitle" text-anchor="middle">Potenciado por inteligencia artificial avanzada</text>
  
  <!-- Epic Description -->
  <text x="600" y="1130" class="epic-desc" text-anchor="middle">Experimenta la generación de playlists más precisa y personalizada jamás creada.</text>
  
  <!-- Features Grid -->
  <!-- Feature 1 -->
  <rect x="200" y="1200" width="200" height="200" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="16"/>
  <rect x="280" y="1220" width="64" height="64" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="16"/>
  <text x="312" y="1260" class="body-text" font-size="24" text-anchor="middle">⭐</text>
  <text x="300" y="1320" class="feature-title" text-anchor="middle">Velocidad instantánea</text>
  <text x="300" y="1350" class="feature-desc" text-anchor="middle">Genera playlists completas en segundos</text>
  
  <!-- Feature 2 -->
  <rect x="500" y="1200" width="200" height="200" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="16"/>
  <rect x="580" y="1220" width="64" height="64" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="16"/>
  <text x="612" y="1260" class="body-text" font-size="24" text-anchor="middle">⭐</text>
  <text x="600" y="1320" class="feature-title" text-anchor="middle">Precisión perfecta</text>
  <text x="600" y="1350" class="feature-desc" text-anchor="middle">Entiende exactamente lo que quieres</text>
  
  <!-- Feature 3 -->
  <rect x="800" y="1200" width="200" height="200" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="16"/>
  <rect x="880" y="1220" width="64" height="64" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="16"/>
  <text x="912" y="1260" class="body-text" font-size="24" text-anchor="middle">⭐</text>
  <text x="900" y="1320" class="feature-title" text-anchor="middle">Control total</text>
  <text x="900" y="1350" class="feature-desc" text-anchor="middle">Reglas de calidad y filtros avanzados</text>
  
  <!-- CTA Button -->
  <rect x="500" y="1450" width="200" height="60" fill="url(#mainGradient)" rx="16"/>
  <text x="600" y="1490" class="button-text" font-size="18" text-anchor="middle">JeyLabbb</text>
  
  <!-- Footer -->
  <rect x="0" y="1600" width="1200" height="120" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="72" y="1640" class="footer-text">© PLEIA by JeyLabbb 2024</text>
  <text x="72" y="1660" class="footer-text" font-size="12" opacity="0.7">From prompt to playlist.</text>
  
  <!-- Footer Links -->
  <text x="1000" y="1640" class="footer-link">Instagram</text>
  <text x="1000" y="1660" class="footer-link">TikTok</text>
  <text x="1000" y="1680" class="footer-link">Ver otros proyectos</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '01-home-page-real.svg'), homePageRealSvg.trim());

// 2. PÁGINA MIS PLAYLISTS (EXACTA)
const myPlaylistsRealSvg = `
<svg width="1200" height="2500" viewBox="0 0 1200 2500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .page-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: url(#titleGradient); letter-spacing: -0.02em; }
      .playlist-title { font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 700; fill: white; }
      .playlist-prompt { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: #9CA3AF; }
      .playlist-meta { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 400; fill: #6B7280; }
      .privacy-label { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: #D1D5DB; }
      .privacy-status { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 500; fill: #10B981; }
      .button-text { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 500; fill: white; }
      .empty-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: url(#titleGradient); }
      .empty-desc { font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 400; fill: #D1D5DB; }
      .empty-subdesc { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 400; fill: #9CA3AF; }
    </style>
    <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="playlistGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="2500" fill="#111827"/>
  
  <!-- Navigation -->
  <rect x="0" y="0" width="1200" height="64" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <rect x="24" y="24" width="24" height="16" fill="none" stroke="${tokens.colors.cloud}" stroke-width="2" rx="2"/>
  <line x1="30" y1="28" x2="42" y2="28" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <line x1="30" y1="32" x2="42" y2="32" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <line x1="30" y1="36" x2="42" y2="36" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <text x="80" y="45" class="page-title" font-size="24" font-weight="700">PLEIA</text>
  <rect x="1000" y="20" width="160" height="24" fill="url(#titleGradient)" rx="12"/>
  <text x="1080" y="35" class="button-text" font-size="14" text-anchor="middle">Mi perfil</text>
  
  <!-- Header -->
  <text x="600" y="200" class="page-title" text-anchor="middle">Mis Playlists</text>
  <text x="600" y="240" class="empty-desc" text-anchor="middle">3 playlists creadas</text>
  
  <!-- Playlist Cards Grid -->
  <!-- Playlist 1 -->
  <rect x="48" y="300" width="350" height="280" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  
  <!-- Album Art -->
  <rect x="72" y="320" width="64" height="64" fill="url(#playlistGradient)" rx="8"/>
  <text x="104" y="360" class="playlist-title" font-size="24" text-anchor="middle">🎵</text>
  
  <!-- Content -->
  <text x="152" y="350" class="playlist-title">Fiesta Reggaeton</text>
  <text x="152" y="375" class="playlist-prompt">"reggaeton para salir de fiesta"</text>
  <text x="152" y="395" class="playlist-meta">24 canciones • Hace 2 días</text>
  
  <!-- Privacy Toggle -->
  <rect x="72" y="420" width="326" height="60" fill="rgba(55,65,81,0.3)" rx="8"/>
  <text x="88" y="440" class="privacy-label">Visible en Trending</text>
  <rect x="88" y="450" width="60" height="20" fill="rgba(16,185,129,0.2)" rx="10"/>
  <text x="118" y="465" class="privacy-status" text-anchor="middle">Pública</text>
  
  <!-- Toggle Switch -->
  <rect x="350" y="430" width="44" height="24" fill="#10B981" rx="12"/>
  <circle cx="362" cy="442" r="8" fill="white"/>
  
  <!-- Actions -->
  <rect x="72" y="500" width="100" height="32" fill="#3B82F6" rx="8"/>
  <text x="122" y="520" class="button-text" text-anchor="middle">👁️ Ver detalles</text>
  
  <rect x="180" y="500" width="40" height="32" fill="#10B981" rx="8"/>
  <text x="200" y="520" class="button-text" text-anchor="middle">🎧</text>
  
  <rect x="230" y="500" width="40" height="32" fill="#EF4444" rx="8"/>
  <text x="250" y="520" class="button-text" text-anchor="middle">🗑️</text>
  
  <!-- Playlist 2 -->
  <rect x="418" y="300" width="350" height="280" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  
  <!-- Album Art -->
  <rect x="442" y="320" width="64" height="64" fill="url(#playlistGradient)" rx="8"/>
  <text x="474" y="360" class="playlist-title" font-size="24" text-anchor="middle">🎵</text>
  
  <!-- Content -->
  <text x="522" y="350" class="playlist-title">Chill Evening</text>
  <text x="522" y="375" class="playlist-prompt">"música relajante para la tarde"</text>
  <text x="522" y="395" class="playlist-meta">18 canciones • Hace 1 semana</text>
  
  <!-- Privacy Toggle -->
  <rect x="442" y="420" width="326" height="60" fill="rgba(55,65,81,0.3)" rx="8"/>
  <text x="458" y="440" class="privacy-label">Visible en Trending</text>
  <rect x="458" y="450" width="60" height="20" fill="rgba(16,185,129,0.2)" rx="10"/>
  <text x="488" y="465" class="privacy-status" text-anchor="middle">Pública</text>
  
  <!-- Toggle Switch -->
  <rect x="720" y="430" width="44" height="24" fill="#10B981" rx="12"/>
  <circle cx="732" cy="442" r="8" fill="white"/>
  
  <!-- Actions -->
  <rect x="442" y="500" width="100" height="32" fill="#3B82F6" rx="8"/>
  <text x="492" y="520" class="button-text" text-anchor="middle">👁️ Ver detalles</text>
  
  <rect x="550" y="500" width="40" height="32" fill="#10B981" rx="8"/>
  <text x="570" y="520" class="button-text" text-anchor="middle">🎧</text>
  
  <rect x="600" y="500" width="40" height="32" fill="#EF4444" rx="8"/>
  <text x="620" y="520" class="button-text" text-anchor="middle">🗑️</text>
  
  <!-- Playlist 3 -->
  <rect x="788" y="300" width="350" height="280" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  
  <!-- Album Art -->
  <rect x="812" y="320" width="64" height="64" fill="url(#playlistGradient)" rx="8"/>
  <text x="844" y="360" class="playlist-title" font-size="24" text-anchor="middle">🎵</text>
  
  <!-- Content -->
  <text x="892" y="350" class="playlist-title">Workout Energy</text>
  <text x="892" y="375" class="playlist-prompt">"música energética para entrenar"</text>
  <text x="892" y="395" class="playlist-meta">32 canciones • Hace 3 días</text>
  
  <!-- Privacy Toggle -->
  <rect x="812" y="420" width="326" height="60" fill="rgba(55,65,81,0.3)" rx="8"/>
  <text x="828" y="440" class="privacy-label">Visible en Trending</text>
  <rect x="828" y="450" width="60" height="20" fill="rgba(16,185,129,0.2)" rx="10"/>
  <text x="858" y="465" class="privacy-status" text-anchor="middle">Pública</text>
  
  <!-- Toggle Switch -->
  <rect x="1090" y="430" width="44" height="24" fill="#10B981" rx="12"/>
  <circle cx="1102" cy="442" r="8" fill="white"/>
  
  <!-- Actions -->
  <rect x="812" y="500" width="100" height="32" fill="#3B82F6" rx="8"/>
  <text x="862" y="520" class="button-text" text-anchor="middle">👁️ Ver detalles</text>
  
  <rect x="920" y="500" width="40" height="32" fill="#10B981" rx="8"/>
  <text x="940" y="520" class="button-text" text-anchor="middle">🎧</text>
  
  <rect x="970" y="500" width="40" height="32" fill="#EF4444" rx="8"/>
  <text x="990" y="520" class="button-text" text-anchor="middle">🗑️</text>
  
  <!-- Empty State (if no playlists) -->
  <rect x="48" y="700" width="1104" height="400" fill="rgba(31,41,55,0.5)" rx="16"/>
  <text x="600" y="800" class="empty-title" font-size="48" text-anchor="middle">📚</text>
  <text x="600" y="850" class="empty-title" text-anchor="middle">Mis Playlists</text>
  <text x="600" y="890" class="empty-desc" text-anchor="middle">Aún no has creado ninguna playlist con la app</text>
  <text x="600" y="920" class="empty-subdesc" text-anchor="middle">Crea tu primera playlist 👉</text>
  
  <!-- Create Button -->
  <rect x="500" y="960" width="200" height="60" fill="#10B981" rx="12"/>
  <text x="600" y="1000" class="button-text" font-size="18" text-anchor="middle">🎵 Crear Playlist</text>
  
  <!-- Not Authenticated State -->
  <rect x="48" y="1100" width="1104" height="400" fill="rgba(31,41,55,0.5)" rx="16"/>
  <text x="600" y="1200" class="empty-title" font-size="48" text-anchor="middle">📚</text>
  <text x="600" y="1250" class="empty-title" text-anchor="middle">Mis Playlists</text>
  <text x="600" y="1290" class="empty-desc" text-anchor="middle">Inicia sesión para ver todas tus playlists creadas</text>
  
  <!-- Connect Button -->
  <rect x="500" y="1350" width="200" height="60" fill="#10B981" rx="12"/>
  <text x="600" y="1390" class="button-text" font-size="18" text-anchor="middle">🎵 Conectar con Spotify</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '02-my-playlists-real.svg'), myPlaylistsRealSvg.trim());

// 3. PÁGINA TRENDING (EXACTA)
const trendingRealSvg = `
<svg width="1200" height="2000" viewBox="0 0 1200 2000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .page-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: url(#trendingGradient); letter-spacing: -0.02em; }
      .trending-title { font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 700; fill: white; }
      .trending-prompt { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: #9CA3AF; }
      .trending-meta { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 400; fill: #6B7280; }
      .trending-creator { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 400; fill: #6B7280; }
      .load-more { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 500; fill: #9CA3AF; }
    </style>
    <linearGradient id="trendingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#EF4444;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F97316;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="trendingCardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#EF4444;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F97316;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="2000" fill="#111827"/>
  
  <!-- Navigation -->
  <rect x="0" y="0" width="1200" height="64" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <rect x="24" y="24" width="24" height="16" fill="none" stroke="${tokens.colors.cloud}" stroke-width="2" rx="2"/>
  <line x1="30" y1="28" x2="42" y2="28" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <line x1="30" y1="32" x2="42" y2="32" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <line x1="30" y1="36" x2="42" y2="36" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <text x="80" y="45" class="page-title" font-size="24" font-weight="700">PLEIA</text>
  <rect x="1000" y="20" width="160" height="24" fill="url(#trendingGradient)" rx="12"/>
  <text x="1080" y="35" class="load-more" font-size="14" text-anchor="middle">Mi perfil</text>
  
  <!-- Header -->
  <text x="600" y="150" class="page-title" text-anchor="middle">🔥 Trending</text>
  
  <!-- Trending Playlist 1 -->
  <rect x="48" y="200" width="1104" height="180" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  
  <!-- Album Art -->
  <rect x="72" y="220" width="64" height="64" fill="url(#trendingCardGradient)" rx="8"/>
  <text x="104" y="260" class="trending-title" font-size="24" text-anchor="middle">🔥</text>
  
  <!-- Content -->
  <text x="152" y="250" class="trending-title">Summer Hits 2024</text>
  <text x="152" y="270" class="trending-prompt">"los éxitos del verano más populares"</text>
  <text x="152" y="290" class="trending-meta">45 canciones • 2.3k reproducciones</text>
  <text x="152" y="310" class="trending-creator">Creado por @musiclover • Hace 2 horas</text>
  
  <!-- Trending Playlist 2 -->
  <rect x="48" y="400" width="1104" height="180" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  
  <!-- Album Art -->
  <rect x="72" y="420" width="64" height="64" fill="url(#trendingCardGradient)" rx="8"/>
  <text x="104" y="460" class="trending-title" font-size="24" text-anchor="middle">🔥</text>
  
  <!-- Content -->
  <text x="152" y="450" class="trending-title">Indie Discoveries</text>
  <text x="152" y="470" class="trending-prompt">"descubrimientos indie que están sonando"</text>
  <text x="152" y="490" class="trending-meta">28 canciones • 1.8k reproducciones</text>
  <text x="152" y="510" class="trending-creator">Creado por @indiecurator • Hace 5 horas</text>
  
  <!-- Trending Playlist 3 -->
  <rect x="48" y="600" width="1104" height="180" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  
  <!-- Album Art -->
  <rect x="72" y="620" width="64" height="64" fill="url(#trendingCardGradient)" rx="8"/>
  <text x="104" y="660" class="trending-title" font-size="24" text-anchor="middle">🔥</text>
  
  <!-- Content -->
  <text x="152" y="650" class="trending-title">Late Night Vibes</text>
  <text x="152" y="670" class="trending-prompt">"música para las noches de verano"</text>
  <text x="152" y="690" class="trending-meta">35 canciones • 1.5k reproducciones</text>
  <text x="152" y="710" class="trending-creator">Creado por @nightowl • Hace 1 día</text>
  
  <!-- Load More Button -->
  <rect x="500" y="850" width="200" height="50" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <text x="600" y="880" class="load-more" text-anchor="middle">Cargar más</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '03-trending-real.svg'), trendingRealSvg.trim());

// 4. MODAL DE CONSEJOS (EXACTO)
const tipsModalRealSvg = `
<svg width="1200" height="2000" viewBox="0 0 1200 2000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .modal-bg { font-family: ${tokens.fonts.body}; font-size: 16px; fill: rgba(0,0,0,0.8); }
      .modal-title { font-family: ${tokens.fonts.primary}; font-size: 32px; font-weight: 700; fill: white; }
      .modal-subtitle { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 400; fill: #D1D5DB; }
      .modal-intro { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: #D1D5DB; line-height: 1.6; }
      .tip-title { font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 600; fill: white; }
      .tip-desc { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: #D1D5DB; line-height: 1.6; }
      .tip-example { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: #06B6D4; }
      .pro-tip-title { font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 700; fill: white; }
      .pro-tip-desc { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: #D1D5DB; line-height: 1.6; }
      .close-button { font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 600; fill: white; }
    </style>
    <linearGradient id="modalHeaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(16,185,129,0.2);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(6,182,212,0.2);stop-opacity:1" />
    </linearGradient>
    <linearGradient id="proTipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(16,185,129,0.2);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(6,182,212,0.2);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Modal Background -->
  <rect width="1200" height="2000" fill="rgba(0,0,0,0.8)" rx="0"/>
  
  <!-- Modal Container -->
  <rect x="100" y="100" width="1000" height="1800" fill="#111827" stroke="rgba(55,65,81,1)" stroke-width="1" rx="16"/>
  
  <!-- Header -->
  <rect x="100" y="100" width="1000" height="200" fill="url(#modalHeaderGradient)" rx="16"/>
  <text x="600" y="160" class="modal-title" text-anchor="middle">Cómo escribir un buen prompt</text>
  <text x="600" y="190" class="modal-subtitle" text-anchor="middle">Consejos para obtener la playlist perfecta</text>
  
  <!-- Close Button -->
  <rect x="1050" y="120" width="40" height="40" fill="rgba(55,65,81,0.5)" stroke="rgba(107,114,128,1)" stroke-width="1" rx="20"/>
  <text x="1070" y="145" class="close-button" text-anchor="middle">×</text>
  
  <!-- Intro -->
  <rect x="140" y="340" width="920" height="80" fill="rgba(31,41,55,0.5)" rx="8"/>
  <text x="600" y="370" class="modal-intro" text-anchor="middle">Sé específico y combina elementos para mejores resultados. La IA entiende contexto, idioma, época y actividad.</text>
  
  <!-- Tips Grid -->
  <!-- Tip 1 -->
  <rect x="140" y="460" width="450" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,0.5)" stroke-width="1" rx="12"/>
  <text x="160" y="490" class="tip-title">🎵 Incluye artistas de referencia</text>
  <text x="160" y="515" class="tip-desc">Menciona 1-2 artistas que te gusten para que la IA entienda mejor tu estilo musical.</text>
  <rect x="160" y="540" width="410" height="40" fill="rgba(17,24,39,0.8)" stroke="rgba(75,85,99,0.3)" stroke-width="1" rx="8"/>
  <text x="600" y="565" class="tip-example" text-anchor="middle">"reggaeton como Bad Bunny y J Balvin"</text>
  
  <!-- Tip 2 -->
  <rect x="610" y="460" width="450" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,0.5)" stroke-width="1" rx="12"/>
  <text x="630" y="490" class="tip-title">🌍 Especifica el idioma</text>
  <text x="630" y="515" class="tip-desc">Si quieres música en un idioma específico, menciónalo claramente. También funciona con 'solo español' o 'english only'.</text>
  <rect x="630" y="540" width="410" height="40" fill="rgba(17,24,39,0.8)" stroke="rgba(75,85,99,0.3)" stroke-width="1" rx="8"/>
  <text x="1070" y="565" class="tip-example" text-anchor="middle">"pop español de los 2000s"</text>
  
  <!-- Tip 3 -->
  <rect x="140" y="680" width="450" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,0.5)" stroke-width="1" rx="12"/>
  <text x="160" y="710" class="tip-title">🏃 Para correr: indica BPM</text>
  <text x="160" y="735" class="tip-desc">Especifica el tempo que necesitas para tu entrenamiento. 120-140 BPM para caminar, 150-180 BPM para correr.</text>
  <rect x="160" y="760" width="410" height="40" fill="rgba(17,24,39,0.8)" stroke="rgba(75,85,99,0.3)" stroke-width="1" rx="8"/>
  <text x="600" y="785" class="tip-example" text-anchor="middle">"música para correr a 165 BPM"</text>
  
  <!-- Tip 4 -->
  <rect x="610" y="680" width="450" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,0.5)" stroke-width="1" rx="12"/>
  <text x="630" y="710" class="tip-title">📚 Para estudiar: pide instrumental</text>
  <text x="630" y="735" class="tip-desc">Si necesitas concentración, pide música sin voces. También puedes pedir 'lofi' o 'ambient'.</text>
  <rect x="630" y="760" width="410" height="40" fill="rgba(17,24,39,0.8)" stroke="rgba(75,85,99,0.3)" stroke-width="1" rx="8"/>
  <text x="1070" y="785" class="tip-example" text-anchor="middle">"música para estudiar, instrumental, sin voces"</text>
  
  <!-- Tip 5 -->
  <rect x="140" y="900" width="450" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,0.5)" stroke-width="1" rx="12"/>
  <text x="160" y="930" class="tip-title">🎪 Festivales: nombre + año</text>
  <text x="160" y="955" class="tip-desc">Para festivales, incluye el nombre exacto y el año. La IA buscará playlists oficiales de ese festival.</text>
  <rect x="160" y="980" width="410" height="40" fill="rgba(17,24,39,0.8)" stroke="rgba(75,85,99,0.3)" stroke-width="1" rx="8"/>
  <text x="600" y="1005" class="tip-example" text-anchor="middle">"calentar para Primavera Sound 2024"</text>
  
  <!-- Tip 6 -->
  <rect x="610" y="900" width="450" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,0.5)" stroke-width="1" rx="12"/>
  <text x="630" y="930" class="tip-title">❌ Excluye artistas específicos</text>
  <text x="630" y="955" class="tip-desc">Usa 'sin' para excluir artistas que no quieres. También funciona con 'excepto' o 'no'.</text>
  <rect x="630" y="980" width="410" height="40" fill="rgba(17,24,39,0.8)" stroke="rgba(75,85,99,0.3)" stroke-width="1" rx="8"/>
  <text x="1070" y="1005" class="tip-example" text-anchor="middle">"reggaeton como Bad Bunny pero sin Bad Bunny"</text>
  
  <!-- Pro Tip -->
  <rect x="140" y="1140" width="920" height="120" fill="url(#proTipGradient)" stroke="rgba(16,185,129,0.3)" stroke-width="1" rx="12"/>
  <text x="160" y="1170" class="pro-tip-title">💡 Consejo profesional</text>
  <text x="160" y="1195" class="pro-tip-desc">Combina múltiples elementos: actividad + género + idioma + época + artistas. Ejemplo: 'reggaeton para correr, 160 BPM, solo español, como Bad Bunny pero sin Bad Bunny'</text>
  
  <!-- Footer -->
  <rect x="140" y="1300" width="920" height="80" fill="rgba(31,41,55,0.3)" rx="8"/>
  <rect x="500" y="1320" width="200" height="40" fill="#10B981" rx="8"/>
  <text x="600" y="1345" class="close-button" text-anchor="middle">Cerrar</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '04-tips-modal-real.svg'), tipsModalRealSvg.trim());

console.log('✅ UI REAL COMPLETA exportada exitosamente!');
console.log('📁 Ubicación: exports/ui-real/');
console.log('🎯 Archivos generados:');
console.log('   01-home-page-real.svg - Página principal EXACTA');
console.log('   02-my-playlists-real.svg - Página Mis Playlists EXACTA');
console.log('   03-trending-real.svg - Página Trending EXACTA');
console.log('   04-tips-modal-real.svg - Modal de Consejos EXACTO');
console.log('🎨 Listos para importar en Figma');

