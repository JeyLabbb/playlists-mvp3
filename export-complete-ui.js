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
  },
  gradients: {
    primary: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
    soft: 'linear-gradient(135deg, rgba(71, 200, 209, 0.8), rgba(91, 140, 255, 0.6))',
    subtle: 'linear-gradient(135deg, rgba(71, 200, 209, 0.1), rgba(91, 140, 255, 0.1))'
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

// 3. Main Page Components
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

fs.writeFileSync(path.join(exportsDir, '03-main-page.svg'), mainPageSvg.trim());

console.log('✅ UI completa exportada exitosamente!');
console.log('📁 Ubicación: exports/ui-complete/');
console.log('🎯 Listos para importar en Figma');

