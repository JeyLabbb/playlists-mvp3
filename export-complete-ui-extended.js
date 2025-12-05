const fs = require('fs');
const path = require('path');

// PLEIA Design System Tokens
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
  }
};

// Create exports directory
const exportsDir = 'exports/ui-complete';
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

console.log('🎨 Exportando UI completa de PLEIA a SVG...');

// 1. Design Tokens SVG
const designTokensSvg = `
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .token-title { font-family: ${tokens.fonts.primary}; font-size: 24px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .token-label { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 600; fill: ${tokens.colors.mist}; }
      .token-value { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 400; fill: ${tokens.colors.cloud}; }
    </style>
  </defs>
  
  <rect width="800" height="600" fill="${tokens.colors.night}" rx="16"/>
  
  <!-- Colors Section -->
  <text x="40" y="60" class="token-title">PLEIA Design Tokens</text>
  
  <text x="40" y="100" class="token-label">Core Colors</text>
  <rect x="40" y="110" width="60" height="40" fill="${tokens.colors.night}" stroke="${tokens.colors.mist}" stroke-width="1" rx="8"/>
  <text x="120" y="135" class="token-value">--color-night: ${tokens.colors.night}</text>
  
  <rect x="40" y="160" width="60" height="40" fill="${tokens.colors.slate}" stroke="${tokens.colors.mist}" stroke-width="1" rx="8"/>
  <text x="120" y="185" class="token-value">--color-slate: ${tokens.colors.slate}</text>
  
  <rect x="40" y="210" width="60" height="40" fill="${tokens.colors.cloud}" stroke="${tokens.colors.mist}" stroke-width="1" rx="8"/>
  <text x="120" y="235" class="token-value">--color-cloud: ${tokens.colors.cloud}</text>
  
  <rect x="40" y="260" width="60" height="40" fill="${tokens.colors.mist}" stroke="${tokens.colors.mist}" stroke-width="1" rx="8"/>
  <text x="120" y="285" class="token-value">--color-mist: ${tokens.colors.mist}</text>
  
  <!-- Brand Colors -->
  <text x="40" y="330" class="token-label">Brand Colors</text>
  <rect x="40" y="340" width="60" height="40" fill="${tokens.colors.aurora}" stroke="${tokens.colors.mist}" stroke-width="1" rx="8"/>
  <text x="120" y="365" class="token-value">--color-aurora: ${tokens.colors.aurora}</text>
  
  <rect x="40" y="390" width="60" height="40" fill="${tokens.colors.electric}" stroke="${tokens.colors.mist}" stroke-width="1" rx="8"/>
  <text x="120" y="415" class="token-value">--color-electric: ${tokens.colors.electric}</text>
  
  <rect x="40" y="440" width="60" height="40" fill="${tokens.colors.accentMixed}" stroke="${tokens.colors.mist}" stroke-width="1" rx="8"/>
  <text x="120" y="465" class="token-value">--color-accent-mixed: ${tokens.colors.accentMixed}</text>
  
  <!-- Typography -->
  <text x="400" y="100" class="token-label">Typography</text>
  <text x="400" y="130" class="token-value">--font-primary: ${tokens.fonts.primary}</text>
  <text x="400" y="150" class="token-value">--font-body: ${tokens.fonts.body}</text>
  
  <!-- Font Examples -->
  <text x="400" y="180" class="token-label">Font Examples</text>
  <text x="400" y="210" style="font-family: ${tokens.fonts.primary}; font-size: 24px; font-weight: 700; fill: ${tokens.colors.cloud};">Space Grotesk Bold</text>
  <text x="400" y="240" style="font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 400; fill: ${tokens.colors.cloud};">Inter Regular</text>
  <text x="400" y="270" style="font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 500; fill: ${tokens.colors.cloud};">Inter Medium</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '01-design-tokens.svg'), designTokensSvg.trim());

// 2. Navigation Component
const navigationSvg = `
<svg width="1200" height="80" viewBox="0 0 1200 80" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .nav-text { font-family: ${tokens.fonts.primary}; font-size: 24px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .nav-link { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
    </style>
  </defs>
  
  <rect width="1200" height="80" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  
  <!-- Logo -->
  <text x="24" y="50" class="nav-text">PLEIA</text>
  
  <!-- Navigation Links -->
  <text x="200" y="50" class="nav-link">Explorar</text>
  <text x="300" y="50" class="nav-link">Tu música</text>
  <text x="400" y="50" class="nav-link">JeyLabbb</text>
  
  <!-- Hamburger Menu -->
  <rect x="1100" y="30" width="40" height="20" fill="none" stroke="${tokens.colors.mist}" stroke-width="2" rx="4"/>
  <line x1="1110" y1="35" x2="1130" y2="35" stroke="${tokens.colors.mist}" stroke-width="2"/>
  <line x1="1110" y1="40" x2="1130" y2="40" stroke="${tokens.colors.mist}" stroke-width="2"/>
  <line x1="1110" y1="45" x2="1130" y2="45" stroke="${tokens.colors.mist}" stroke-width="2"/>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '02-navigation.svg'), navigationSvg.trim());

// 3. Main Page (Home)
const mainPageSvg = `
<svg width="1200" height="2000" viewBox="0 0 1200 2000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .main-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: ${tokens.colors.cloud}; letter-spacing: -0.02em; }
      .body-text { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 400; fill: ${tokens.colors.cloud}; }
      .label-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
      .example-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
    </style>
    <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tokens.colors.accentMixed};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${tokens.colors.electric};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="1200" height="2000" fill="${tokens.colors.night}"/>
  
  <!-- Main Prompt Card -->
  <rect x="48" y="96" width="1104" height="600" fill="${tokens.colors.slate}" rx="16"/>
  
  <!-- Title -->
  <text x="72" y="140" class="main-title">¿Qué tipo de playlist quieres?</text>
  
  <!-- Textarea -->
  <rect x="72" y="180" width="1056" height="120" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="88" y="220" class="body-text" fill="rgba(199,208,218,0.6)">Describe tu playlist perfecta... ej: 'calentar para Primavera Sound 2024'</text>
  
  <!-- Examples -->
  <text x="72" y="340" class="label-text">Prueba estos ejemplos:</text>
  
  <!-- Example Chips -->
  <rect x="72" y="360" width="280" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="88" y="380" class="example-text">calentar para Primavera Sound 2024</text>
  
  <rect x="368" y="360" width="320" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="384" y="380" class="example-text">reggaeton como Bad Bunny pero sin Bad Bunny</text>
  
  <rect x="704" y="360" width="200" height="32" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="16"/>
  <text x="720" y="380" class="example-text">girl groups k-pop 2024</text>
  
  <!-- Controls -->
  <text x="72" y="480" class="label-text">Canciones:</text>
  <rect x="200" y="460" width="80" height="40" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="8"/>
  <text x="240" y="485" class="body-text" text-anchor="middle">50</text>
  
  <!-- Tips Button -->
  <rect x="300" y="460" width="120" height="40" fill="#374151" stroke="#4B5563" stroke-width="1" rx="20"/>
  <text x="320" y="485" class="body-text">💡 Consejos</text>
  
  <!-- Generate Button -->
  <rect x="440" y="460" width="200" height="50" fill="url(#mainGradient)" rx="16"/>
  <text x="540" y="490" class="main-title" font-size="16" font-weight="600" fill="${tokens.colors.night}" text-anchor="middle">Generar Playlist</text>
  
  <!-- Empty State -->
  <rect x="48" y="720" width="1104" height="200" fill="${tokens.colors.slate}" rx="16"/>
  <rect x="568" y="760" width="64" height="64" fill="url(#mainGradient)" rx="16"/>
  <text x="600" y="800" class="body-text" font-size="24" fill="white" text-anchor="middle">🎵</text>
  <text x="600" y="840" class="main-title" font-size="32" text-anchor="middle">Crea tu primera playlist</text>
  <text x="600" y="870" class="body-text" fill="rgba(199,208,218,0.8)" text-anchor="middle">Describe el tipo de música que quieres y te generaremos una playlist personalizada con IA.</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '03-home-page.svg'), mainPageSvg.trim());

// 4. My Playlists Page
const myPlaylistsSvg = `
<svg width="1200" height="2000" viewBox="0 0 1200 2000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .page-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .card-title { font-family: ${tokens.fonts.body}; font-size: 18px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .card-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: ${tokens.colors.mist}; }
      .card-meta { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 400; fill: rgba(107,114,128,1); }
    </style>
    <linearGradient id="playlistGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="1200" height="2000" fill="${tokens.colors.night}"/>
  
  <!-- Page Title -->
  <text x="48" y="100" class="page-title">Mis Playlists</text>
  
  <!-- Playlist Card 1 -->
  <rect x="48" y="150" width="1104" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <rect x="72" y="174" width="64" height="64" fill="url(#playlistGradient)" rx="8"/>
  <text x="104" y="210" class="card-title" text-anchor="middle">🎵</text>
  <text x="152" y="200" class="card-title">Fiesta Reggaeton</text>
  <text x="152" y="220" class="card-text">"reggaeton para salir de fiesta"</text>
  <text x="152" y="240" class="card-meta">24 canciones • Hace 2 días</text>
  
  <!-- Privacy Toggle -->
  <rect x="1000" y="200" width="32" height="16" fill="#10B981" rx="8"/>
  <circle cx="1014" cy="208" r="6" fill="white"/>
  
  <!-- Playlist Card 2 -->
  <rect x="48" y="370" width="1104" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <rect x="72" y="394" width="64" height="64" fill="url(#playlistGradient)" rx="8"/>
  <text x="104" y="430" class="card-title" text-anchor="middle">🎵</text>
  <text x="152" y="420" class="card-title">Chill Evening</text>
  <text x="152" y="440" class="card-text">"música relajante para la tarde"</text>
  <text x="152" y="460" class="card-meta">18 canciones • Hace 1 semana</text>
  
  <!-- Privacy Toggle -->
  <rect x="1000" y="420" width="32" height="16" fill="#10B981" rx="8"/>
  <circle cx="1014" cy="428" r="6" fill="white"/>
  
  <!-- Playlist Card 3 -->
  <rect x="48" y="590" width="1104" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <rect x="72" y="614" width="64" height="64" fill="url(#playlistGradient)" rx="8"/>
  <text x="104" y="650" class="card-title" text-anchor="middle">🎵</text>
  <text x="152" y="640" class="card-title">Workout Energy</text>
  <text x="152" y="660" class="card-text">"música energética para entrenar"</text>
  <text x="152" y="680" class="card-meta">32 canciones • Hace 3 días</text>
  
  <!-- Privacy Toggle -->
  <rect x="1000" y="640" width="32" height="16" fill="#10B981" rx="8"/>
  <circle cx="1014" cy="648" r="6" fill="white"/>
  
  <!-- Empty State (if no playlists) -->
  <rect x="48" y="850" width="1104" height="300" fill="${tokens.colors.slate}" rx="16"/>
  <text x="600" y="950" class="page-title" font-size="48" text-anchor="middle">📚</text>
  <text x="600" y="1000" class="page-title" font-size="32" text-anchor="middle">Mis Playlists</text>
  <text x="600" y="1030" class="card-text" text-anchor="middle">Inicia sesión para ver todas tus playlists creadas</text>
  
  <!-- Connect Button -->
  <rect x="500" y="1080" width="200" height="60" fill="#10B981" rx="12"/>
  <text x="600" y="1120" class="card-title" font-size="18" fill="white" text-anchor="middle">🎵 Conectar con Spotify</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '04-my-playlists.svg'), myPlaylistsSvg.trim());

// 5. Trending Page
const trendingSvg = `
<svg width="1200" height="2000" viewBox="0 0 1200 2000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .page-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .trending-title { font-family: ${tokens.fonts.body}; font-size: 20px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .trending-text { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 400; fill: ${tokens.colors.mist}; }
      .trending-meta { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 400; fill: rgba(107,114,128,1); }
    </style>
    <linearGradient id="trendingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#EF4444;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F97316;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="1200" height="2000" fill="${tokens.colors.night}"/>
  
  <!-- Page Title -->
  <text x="48" y="100" class="page-title">🔥 Trending</text>
  
  <!-- Trending Playlist 1 -->
  <rect x="48" y="150" width="1104" height="180" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <rect x="72" y="174" width="64" height="64" fill="url(#trendingGradient)" rx="8"/>
  <text x="104" y="210" class="trending-title" text-anchor="middle">🔥</text>
  <text x="152" y="200" class="trending-title">Summer Hits 2024</text>
  <text x="152" y="220" class="trending-text">"los éxitos del verano más populares"</text>
  <text x="152" y="240" class="trending-meta">45 canciones • 2.3k reproducciones</text>
  <text x="152" y="260" class="trending-meta">Creado por @musiclover • Hace 2 horas</text>
  
  <!-- Trending Playlist 2 -->
  <rect x="48" y="350" width="1104" height="180" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <rect x="72" y="374" width="64" height="64" fill="url(#trendingGradient)" rx="8"/>
  <text x="104" y="410" class="trending-title" text-anchor="middle">🔥</text>
  <text x="152" y="400" class="trending-title">Indie Discoveries</text>
  <text x="152" y="420" class="trending-text">"descubrimientos indie que están sonando"</text>
  <text x="152" y="440" class="trending-meta">28 canciones • 1.8k reproducciones</text>
  <text x="152" y="460" class="trending-meta">Creado por @indiecurator • Hace 5 horas</text>
  
  <!-- Trending Playlist 3 -->
  <rect x="48" y="550" width="1104" height="180" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <rect x="72" y="574" width="64" height="64" fill="url(#trendingGradient)" rx="8"/>
  <text x="104" y="610" class="trending-title" text-anchor="middle">🔥</text>
  <text x="152" y="600" class="trending-title">Late Night Vibes</text>
  <text x="152" y="620" class="trending-text">"música para las noches de verano"</text>
  <text x="152" y="640" class="trending-meta">35 canciones • 1.5k reproducciones</text>
  <text x="152" y="660" class="trending-meta">Creado por @nightowl • Hace 1 día</text>
  
  <!-- Load More Button -->
  <rect x="500" y="800" width="200" height="50" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="600" y="830" class="trending-text" text-anchor="middle">Cargar más</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '05-trending-page.svg'), trendingSvg.trim());

// 6. Profile Page
const profileSvg = `
<svg width="1200" height="2000" viewBox="0 0 1200 2000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .page-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .profile-title { font-family: ${tokens.fonts.body}; font-size: 24px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .profile-text { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 400; fill: ${tokens.colors.mist}; }
      .profile-label { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
    </style>
    <linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tokens.colors.aurora};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${tokens.colors.electric};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="1200" height="2000" fill="${tokens.colors.night}"/>
  
  <!-- Page Title -->
  <text x="48" y="100" class="page-title">👤 Mi Perfil</text>
  
  <!-- Profile Card -->
  <rect x="48" y="150" width="1104" height="400" fill="${tokens.colors.slate}" rx="16"/>
  
  <!-- Profile Avatar -->
  <rect x="72" y="180" width="120" height="120" fill="url(#profileGradient)" rx="60"/>
  <text x="132" y="250" class="profile-title" font-size="48" text-anchor="middle">👤</text>
  
  <!-- Profile Info -->
  <text x="220" y="220" class="profile-title">Usuario de PLEIA</text>
  <text x="220" y="250" class="profile-text">usuario@ejemplo.com</text>
  <text x="220" y="280" class="profile-text">Miembro desde enero 2024</text>
  
  <!-- Stats -->
  <rect x="220" y="320" width="200" height="80" fill="rgba(255,255,255,0.05)" rx="8"/>
  <text x="320" y="350" class="profile-label" text-anchor="middle">Playlists creadas</text>
  <text x="320" y="380" class="profile-title" font-size="32" text-anchor="middle">12</text>
  
  <rect x="440" y="320" width="200" height="80" fill="rgba(255,255,255,0.05)" rx="8"/>
  <text x="540" y="350" class="profile-label" text-anchor="middle">Canciones generadas</text>
  <text x="540" y="380" class="profile-title" font-size="32" text-anchor="middle">456</text>
  
  <rect x="660" y="320" width="200" height="80" fill="rgba(255,255,255,0.05)" rx="8"/>
  <text x="760" y="350" class="profile-label" text-anchor="middle">Horas de música</text>
  <text x="760" y="380" class="profile-title" font-size="32" text-anchor="middle">28.5</text>
  
  <!-- Settings Section -->
  <rect x="48" y="600" width="1104" height="300" fill="${tokens.colors.slate}" rx="16"/>
  <text x="72" y="640" class="profile-title">Configuración</text>
  
  <!-- Language Setting -->
  <text x="72" y="680" class="profile-label">Idioma</text>
  <rect x="72" y="700" width="200" height="40" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="8"/>
  <text x="172" y="725" class="profile-text" text-anchor="middle">Español</text>
  
  <!-- Theme Setting -->
  <text x="300" y="680" class="profile-label">Tema</text>
  <rect x="300" y="700" width="200" height="40" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="8"/>
  <text x="400" y="725" class="profile-text" text-anchor="middle">Oscuro</text>
  
  <!-- Save Button -->
  <rect x="500" y="700" width="150" height="40" fill="url(#profileGradient)" rx="8"/>
  <text x="575" y="725" class="profile-text" font-weight="600" fill="${tokens.colors.night}" text-anchor="middle">Guardar</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '06-profile-page.svg'), profileSvg.trim());

// 7. Feedback Page
const feedbackSvg = `
<svg width="1200" height="2000" viewBox="0 0 1200 2000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .page-title { font-family: ${tokens.fonts.primary}; font-size: 48px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .feedback-title { font-family: ${tokens.fonts.body}; font-size: 20px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .feedback-text { font-family: ${tokens.fonts.body}; font-size: 16px; font-weight: 400; fill: ${tokens.colors.mist}; }
      .feedback-label { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
    </style>
    <linearGradient id="feedbackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#EF4444;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="1200" height="2000" fill="${tokens.colors.night}"/>
  
  <!-- Page Title -->
  <text x="48" y="100" class="page-title">💬 Feedback</text>
  
  <!-- Feedback Form -->
  <rect x="48" y="150" width="1104" height="800" fill="${tokens.colors.slate}" rx="16"/>
  
  <!-- Rating Section -->
  <text x="72" y="190" class="feedback-title">¿Cómo calificarías tu experiencia?</text>
  <text x="72" y="220" class="feedback-text">★★★★★</text>
  
  <!-- What worked well -->
  <text x="72" y="270" class="feedback-label">¿Qué te gustó más?</text>
  <rect x="72" y="290" width="500" height="100" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="8"/>
  <text x="82" y="320" class="feedback-text" fill="rgba(199,208,218,0.6)">Ej: La variedad de canciones, la velocidad de generación...</text>
  
  <!-- What could be improved -->
  <text x="72" y="420" class="feedback-label">¿Qué mejorarías?</text>
  <rect x="72" y="440" width="500" height="100" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="8"/>
  <text x="82" y="470" class="feedback-text" fill="rgba(199,208,218,0.6)">Ej: Más diversidad de artistas, mejor ordenación...</text>
  
  <!-- Additional comments -->
  <text x="72" y="570" class="feedback-label">Comentarios adicionales</text>
  <rect x="72" y="590" width="500" height="100" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="8"/>
  <text x="82" y="620" class="feedback-text" fill="rgba(199,208,218,0.6)">Cualquier otra cosa que quieras decir...</text>
  
  <!-- Consent checkbox -->
  <rect x="72" y="720" width="20" height="20" fill="${tokens.colors.night}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="4"/>
  <text x="100" y="735" class="feedback-text">Avisarme sobre mejoras futuras</text>
  
  <!-- Submit Button -->
  <rect x="72" y="780" width="200" height="50" fill="url(#feedbackGradient)" rx="12"/>
  <text x="172" y="810" class="feedback-text" font-weight="600" fill="${tokens.colors.night}" text-anchor="middle">Enviar Feedback</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '07-feedback-page.svg'), feedbackSvg.trim());

// 8. Component Library
const componentsSvg = `
<svg width="1200" height="2000" viewBox="0 0 1200 2000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .component-title { font-family: ${tokens.fonts.primary}; font-size: 24px; font-weight: 700; fill: ${tokens.colors.cloud}; }
      .component-label { font-family: ${tokens.fonts.body}; font-size: 14px; font-weight: 500; fill: ${tokens.colors.mist}; }
      .component-text { font-family: ${tokens.fonts.body}; font-size: 12px; font-weight: 400; fill: ${tokens.colors.cloud}; }
    </style>
    <linearGradient id="componentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tokens.colors.accentMixed};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${tokens.colors.electric};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="1200" height="2000" fill="${tokens.colors.night}"/>
  
  <!-- Title -->
  <text x="48" y="60" class="component-title">Component Library</text>
  
  <!-- Buttons Section -->
  <text x="48" y="100" class="component-label">Buttons</text>
  
  <!-- Primary Button -->
  <rect x="48" y="120" width="200" height="50" fill="url(#componentGradient)" rx="12"/>
  <text x="148" y="150" class="component-text" font-weight="600" fill="${tokens.colors.night}" text-anchor="middle">Primary Button</text>
  
  <!-- Secondary Button -->
  <rect x="268" y="120" width="200" height="50" fill="transparent" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="12"/>
  <text x="368" y="150" class="component-text" text-anchor="middle">Secondary Button</text>
  
  <!-- Input Fields Section -->
  <text x="48" y="220" class="component-label">Input Fields</text>
  
  <!-- Text Input -->
  <rect x="48" y="240" width="400" height="50" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="68" y="270" class="component-text" fill="rgba(199,208,218,0.6)">Placeholder text...</text>
  
  <!-- Textarea -->
  <rect x="48" y="310" width="400" height="100" fill="${tokens.colors.slate}" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="68" y="340" class="component-text" fill="rgba(199,208,218,0.6)">Multiline text area...</text>
  
  <!-- Cards Section -->
  <text x="48" y="450" class="component-label">Cards</text>
  
  <!-- Basic Card -->
  <rect x="48" y="470" width="300" height="150" fill="${tokens.colors.slate}" rx="12"/>
  <text x="68" y="500" class="component-text" font-weight="600">Card Title</text>
  <text x="68" y="520" class="component-text" fill="${tokens.colors.mist}">Card description text goes here</text>
  
  <!-- Song Card -->
  <rect x="368" y="470" width="300" height="80" fill="linear-gradient(135deg, rgba(15,15,16,0.95), rgba(20,20,22,0.98))" stroke="rgba(255,255,255,0.06)" stroke-width="1" rx="12"/>
  <rect x="368" y="470" width="3" height="80" fill="linear-gradient(to bottom, #1DB954, #22D3EE)" rx="0"/>
  <text x="388" y="495" class="component-text" font-weight="600">Song Title</text>
  <text x="388" y="515" class="component-text" fill="rgba(255,255,255,0.55)">Artist Name</text>
  <rect x="620" y="485" width="40" height="30" fill="rgba(71,200,209,0.1)" stroke="rgba(71,200,209,0.2)" stroke-width="1" rx="8"/>
  <text x="640" y="505" class="component-text" font-size="10" font-weight="700" fill="#47C8D1" text-anchor="middle">OPEN</text>
  
  <!-- Playlist Card -->
  <rect x="688" y="470" width="300" height="150" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <rect x="712" y="494" width="64" height="64" fill="url(#componentGradient)" rx="8"/>
  <text x="744" y="530" class="component-text" font-size="24" text-anchor="middle">🎵</text>
  <text x="792" y="520" class="component-text" font-weight="700">Playlist Name</text>
  <text x="792" y="540" class="component-text" fill="${tokens.colors.mist}">"playlist description"</text>
  <text x="792" y="560" class="component-text" font-size="10" fill="rgba(107,114,128,1)">24 canciones • Hace 2 días</text>
  
  <!-- Modals Section -->
  <text x="48" y="660" class="component-label">Modals</text>
  
  <!-- Modal Background -->
  <rect x="48" y="680" width="600" height="400" fill="rgba(0,0,0,0.8)" rx="16"/>
  <rect x="68" y="700" width="560" height="360" fill="${tokens.colors.slate}" rx="12"/>
  
  <!-- Modal Header -->
  <rect x="68" y="700" width="560" height="80" fill="linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))" rx="12"/>
  <text x="88" y="740" class="component-text" font-weight="700">Modal Title</text>
  <text x="88" y="760" class="component-text" fill="${tokens.colors.mist}">Modal subtitle</text>
  
  <!-- Modal Content -->
  <text x="88" y="820" class="component-text">Modal content goes here...</text>
  
  <!-- Modal Footer -->
  <rect x="88" y="1000" width="200" height="40" fill="url(#componentGradient)" rx="8"/>
  <text x="188" y="1025" class="component-text" font-weight="600" fill="${tokens.colors.night}" text-anchor="middle">Confirm</text>
  
  <rect x="308" y="1000" width="200" height="40" fill="transparent" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="8"/>
  <text x="408" y="1025" class="component-text" text-anchor="middle">Cancel</text>
</svg>
`;

fs.writeFileSync(path.join(exportsDir, '08-component-library.svg'), componentsSvg.trim());

console.log('✅ UI completa exportada exitosamente!');
console.log('📁 Ubicación: exports/ui-complete/');
console.log('🎯 Archivos generados:');
console.log('   01-design-tokens.svg - Tokens de diseño');
console.log('   02-navigation.svg - Componente de navegación');
console.log('   03-home-page.svg - Página principal');
console.log('   04-my-playlists.svg - Página Mis Playlists');
console.log('   05-trending-page.svg - Página Trending');
console.log('   06-profile-page.svg - Página de perfil');
console.log('   07-feedback-page.svg - Página de feedback');
console.log('   08-component-library.svg - Librería de componentes');
console.log('🎨 Listos para importar en Figma');

