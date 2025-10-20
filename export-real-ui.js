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

console.log('🎨 Exportando UI REAL de PLEIA a SVG...');

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

// 2. PÁGINA CON PLAYLIST GENERADA (EXACTA)
const playlistGeneratedSvg = `
<svg width="1200" height="4000" viewBox="0 0 1200 4000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .main-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: ${tokens.colors.cloud}; letter-spacing: -0.02em; line-height: 1.2; }
      .body-text { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 400; fill: ${tokens.colors.cloud}; line-height: 1.5; }
      .label-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
      .button-text { font-family: ${tokens.fonts.primary}; font-size: 16px; font-weight: 600; fill: ${tokens.colors.night}; letter-spacing: 0.01em; }
      .song-title { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 600; fill: white; }
      .song-artist { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: rgba(255,255,255,0.55); }
      .open-btn { font-family: ${tokens.fonts.body}; font-size: 11px; font-weight: 700; fill: #47C8D1; }
      .remove-btn { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 700; fill: rgba(255,77,77,0.8); }
    </style>
    <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tokens.colors.accentMixed};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${tokens.colors.electric};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(15,15,16,0.95);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(20,20,22,0.98);stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentBorder" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1DB954;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#22D3EE;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="4000" fill="${tokens.colors.night}"/>
  
  <!-- Navigation -->
  <rect x="0" y="0" width="1200" height="64" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <rect x="24" y="24" width="24" height="16" fill="none" stroke="${tokens.colors.cloud}" stroke-width="2" rx="2"/>
  <line x1="30" y1="28" x2="42" y2="28" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <line x1="30" y1="32" x2="42" y2="32" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <line x1="30" y1="36" x2="42" y2="36" stroke="${tokens.colors.cloud}" stroke-width="2"/>
  <text x="80" y="45" class="main-title" font-size="24" font-weight="700">PLEIA</text>
  <rect x="1000" y="20" width="160" height="24" fill="url(#mainGradient)" rx="12"/>
  <text x="1080" y="35" class="button-text" font-size="14" text-anchor="middle">Mi perfil</text>
  
  <!-- Prompt Card -->
  <rect x="48" y="96" width="1104" height="600" fill="${tokens.colors.slate}" rx="16"/>
  <text x="72" y="140" class="main-title">¿Qué tipo de playlist quieres?</text>
  <rect x="72" y="180" width="1056" height="120" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="88" y="220" class="body-text">reggaeton para salir de fiesta</text>
  
  <!-- Examples -->
  <text x="72" y="340" class="label-text">Prueba estos ejemplos:</text>
  <rect x="72" y="360" width="280" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="88" y="380" class="label-text">calentar para Primavera Sound 2024</text>
  
  <!-- Controls -->
  <text x="72" y="480" class="label-text">Canciones:</text>
  <rect x="200" y="460" width="80" height="40" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="8"/>
  <text x="240" y="485" class="body-text" text-anchor="middle">50</text>
  
  <!-- Tips Button -->
  <rect x="300" y="460" width="120" height="40" fill="#374151" stroke="#4B5563" stroke-width="1" rx="20"/>
  <text x="320" y="485" class="body-text" fill="white">💡 Consejos</text>
  
  <!-- Generate Button -->
  <rect x="440" y="460" width="200" height="50" fill="url(#mainGradient)" rx="16"/>
  <text x="540" y="490" class="button-text" text-anchor="middle">Generar Playlist</text>
  
  <!-- Progress Card -->
  <rect x="48" y="720" width="1104" height="200" fill="${tokens.colors.slate}" rx="16"/>
  <text x="72" y="760" class="main-title" font-size="20" font-weight="600">Generando...</text>
  
  <!-- Progress Bar -->
  <rect x="72" y="800" width="1056" height="8" fill="rgba(255,255,255,0.1)" rx="4"/>
  <rect x="72" y="800" width="800" height="8" fill="url(#mainGradient)" rx="4"/>
  
  <!-- Status Text -->
  <text x="72" y="840" class="body-text">🎵 Found 45/50 tracks (90%)</text>
  
  <!-- Playlist Creation Card -->
  <rect x="48" y="960" width="1104" height="300" fill="${tokens.colors.slate}" rx="16"/>
  <text x="72" y="1000" class="main-title" font-size="20" font-weight="600">Crear Playlist (50 tracks)</text>
  
  <!-- Playlist Name Input -->
  <text x="72" y="1040" class="label-text">Nombre de playlist:</text>
  <rect x="72" y="1060" width="500" height="50" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="88" y="1090" class="body-text" fill="rgba(199,208,218,0.6)">Dejar vacío para nombre generado por IA</text>
  
  <!-- Create Button -->
  <rect x="600" y="1060" width="200" height="50" fill="${tokens.colors.accentMixed}" rx="12"/>
  <text x="700" y="1090" class="button-text" text-anchor="middle">Crear en Spotify</text>
  
  <!-- Control Buttons -->
  <rect x="72" y="1200" width="120" height="40" fill="transparent" stroke="rgba(199,208,218,0.2)" stroke-width="1" rx="8"/>
  <text x="132" y="1225" class="body-text" fill="rgba(199,208,218,0.3)">🎛️ Refine</text>
  
  <rect x="210" y="1200" width="100" height="40" fill="transparent" stroke="rgba(199,208,218,0.2)" stroke-width="1" rx="8"/>
  <text x="260" y="1225" class="body-text" fill="rgba(199,208,218,0.3)">+5 Tracks</text>
  
  <text x="330" y="1225" class="body-text" fill="rgba(199,208,218,0.6)">50/200 tracks</text>
  
  <!-- Results Card -->
  <rect x="48" y="1280" width="1104" height="2000" fill="${tokens.colors.slate}" rx="16"/>
  <text x="72" y="1320" class="main-title" font-size="20" font-weight="600">Canciones generadas (50 tracks)</text>
  
  <!-- Song Cards -->
  <!-- Song 1 -->
  <rect x="72" y="1360" width="1056" height="80" fill="url(#cardBg)" stroke="rgba(255,255,255,0.06)" stroke-width="1" rx="12"/>
  <rect x="72" y="1360" width="3" height="80" fill="url(#accentBorder)" rx="0"/>
  <rect x="88" y="1380" width="48" height="48" fill="rgba(255,255,255,0.1)" rx="8"/>
  <text x="112" y="1410" class="song-title">Gasolina</text>
  <text x="112" y="1430" class="song-artist">Daddy Yankee</text>
  <rect x="1000" y="1380" width="60" height="40" fill="rgba(71,200,209,0.1)" stroke="rgba(71,200,209,0.2)" stroke-width="1" rx="8"/>
  <text x="1030" y="1405" class="open-btn" text-anchor="middle">OPEN</text>
  <rect x="1080" y="1380" width="40" height="40" fill="rgba(255,77,77,0.08)" stroke="rgba(255,77,77,0.15)" stroke-width="1" rx="8"/>
  <text x="1100" y="1405" class="remove-btn" text-anchor="middle">✕</text>
  
  <!-- Song 2 -->
  <rect x="72" y="1460" width="1056" height="80" fill="url(#cardBg)" stroke="rgba(255,255,255,0.06)" stroke-width="1" rx="12"/>
  <rect x="72" y="1460" width="3" height="80" fill="url(#accentBorder)" rx="0"/>
  <rect x="88" y="1480" width="48" height="48" fill="rgba(255,255,255,0.1)" rx="8"/>
  <text x="112" y="1510" class="song-title">Dakiti</text>
  <text x="112" y="1530" class="song-artist">Bad Bunny, Jhay Cortez</text>
  <rect x="1000" y="1480" width="60" height="40" fill="rgba(71,200,209,0.1)" stroke="rgba(71,200,209,0.2)" stroke-width="1" rx="8"/>
  <text x="1030" y="1505" class="open-btn" text-anchor="middle">OPEN</text>
  <rect x="1080" y="1480" width="40" height="40" fill="rgba(255,77,77,0.08)" stroke="rgba(255,77,77,0.15)" stroke-width="1" rx="8"/>
  <text x="1100" y="1505" class="remove-btn" text-anchor="middle">✕</text>
  
  <!-- Song 3 -->
  <rect x="72" y="1560" width="1056" height="80" fill="url(#cardBg)" stroke="rgba(255,255,255,0.06)" stroke-width="1" rx="12"/>
  <rect x="72" y="1560" width="3" height="80" fill="url(#accentBorder)" rx="0"/>
  <rect x="88" y="1580" width="48" height="48" fill="rgba(255,255,255,0.1)" rx="8"/>
  <text x="112" y="1610" class="song-title">Con Calma</text>
  <text x="112" y="1630" class="song-artist">Daddy Yankee, Snow</text>
  <rect x="1000" y="1580" width="60" height="40" fill="rgba(71,200,209,0.1)" stroke="rgba(71,200,209,0.2)" stroke-width="1" rx="8"/>
  <text x="1030" y="1605" class="open-btn" text-anchor="middle">OPEN</text>
  <rect x="1080" y="1580" width="40" height="40" fill="rgba(255,77,77,0.08)" stroke="rgba(255,77,77,0.15)" stroke-width="1" rx="8"/>
  <text x="1100" y="1605" class="remove-btn" text-anchor="middle">✕</text>
  
  <!-- Song 4 -->
  <rect x="72" y="1660" width="1056" height="80" fill="url(#cardBg)" stroke="rgba(255,255,255,0.06)" stroke-width="1" rx="12"/>
  <rect x="72" y="1660" width="3" height="80" fill="url(#accentBorder)" rx="0"/>
  <rect x="88" y="1680" width="48" height="48" fill="rgba(255,255,255,0.1)" rx="8"/>
  <text x="112" y="1710" class="song-title">Tusa</text>
  <text x="112" y="1730" class="song-artist">Karol G, Nicki Minaj</text>
  <rect x="1000" y="1680" width="60" height="40" fill="rgba(71,200,209,0.1)" stroke="rgba(71,200,209,0.2)" stroke-width="1" rx="8"/>
  <text x="1030" y="1705" class="open-btn" text-anchor="middle">OPEN</text>
  <rect x="1080" y="1680" width="40" height="40" fill="rgba(255,77,77,0.08)" stroke="rgba(255,77,77,0.15)" stroke-width="1" rx="8"/>
  <text x="1100" y="1705" class="remove-btn" text-anchor="middle">✕</text>
  
  <!-- Song 5 -->
  <rect x="72" y="1760" width="1056" height="80" fill="url(#cardBg)" stroke="rgba(255,255,255,0.06)" stroke-width="1" rx="12"/>
  <rect x="72" y="1760" width="3" height="80" fill="url(#accentBorder)" rx="0"/>
  <rect x="88" y="1780" width="48" height="48" fill="rgba(255,255,255,0.1)" rx="8"/>
  <text x="112" y="1810" class="song-title">Yo Perreo Sola</text>
  <text x="112" y="1830" class="song-artist">Bad Bunny</text>
  <rect x="1000" y="1780" width="60" height="40" fill="rgba(71,200,209,0.1)" stroke="rgba(71,200,209,0.2)" stroke-width="1" rx="8"/>
  <text x="1030" y="1805" class="open-btn" text-anchor="middle">OPEN</text>
  <rect x="1080" y="1780" width="40" height="40" fill="rgba(255,77,77,0.08)" stroke="rgba(255,77,77,0.15)" stroke-width="1" rx="8"/>
  <text x="1100" y="1805" class="remove-btn" text-anchor="middle">✕</text>
  
  <!-- More songs indicator -->
  <text x="600" y="1900" class="body-text" fill="rgba(199,208,218,0.6)" text-anchor="middle">... y 45 canciones más</text>
  
  <!-- Scroll indicator -->
  <rect x="1100" y="1400" width="4" height="400" fill="rgba(255,255,255,0.1)" rx="2"/>
  <rect x="1100" y="1400" width="4" height="100" fill="rgba(255,255,255,0.3)" rx="2"/>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '02-playlist-generated.svg'), playlistGeneratedSvg.trim());

console.log('✅ UI REAL exportada exitosamente!');
console.log('📁 Ubicación: exports/ui-real/');
console.log('🎯 Archivos generados:');
console.log('   01-home-page-real.svg - Página principal EXACTA');
console.log('   02-playlist-generated.svg - Página con playlist generada EXACTA');
console.log('🎨 Listos para importar en Figma');

