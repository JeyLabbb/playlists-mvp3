/**
 * Script para exportar componentes UI reales a SVGs limpios para Figma
 */

// PromptInput SVG
const promptBoxSVG = `<svg width="1080" height="200" viewBox="0 0 1080 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .prompt-title { font-family: "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .prompt-textarea { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
  </defs>
  <rect width="1080" height="200" fill="#1A232B" rx="12"/>
  <rect x="24" y="24" width="1032" height="152" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="24" y="60" class="prompt-title" font-size="48" font-weight="700" fill="#F5F7FA" letter-spacing="-0.02em">¿Qué tipo de playlist quieres?</text>
  <rect x="24" y="80" width="1032" height="80" fill="#1A232B" stroke="rgba(255,255,255,0.1)" stroke-width="1" rx="12"/>
  <text x="40" y="105" class="prompt-textarea" font-size="16" fill="rgba(199,208,218,0.6)">Describe your perfect playlist...</text>
  <text x="40" y="125" class="prompt-textarea" font-size="16" fill="rgba(199,208,218,0.6)">e.g., 'festival warm-up for Primavera Sound 2024'</text>
  <text x="40" y="145" class="prompt-textarea" font-size="16" fill="rgba(199,208,218,0.6)">'reggaeton like Bad Bunny but without Bad Bunny'</text>
</svg>`;

// SongCard SVG
const songCardSVG = `<svg width="1080" height="80" viewBox="0 0 1080 80" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(15,15,16,0.95);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(20,20,22,0.98);stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentBorder" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1DB954;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#22D3EE;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1080" height="80" fill="url(#cardBg)" rx="12"/>
  <rect x="0" y="0" width="3" height="80" fill="url(#accentBorder)" rx="0"/>
  <rect x="16" y="16" width="48" height="48" fill="rgba(255,255,255,0.1)" rx="8"/>
  <text x="80" y="35" font-family="Inter, sans-serif" font-size="16" font-weight="600" fill="#ffffff">Gasolina</text>
  <text x="80" y="55" font-family="Inter, sans-serif" font-size="14" font-weight="400" fill="rgba(255,255,255,0.55)">Daddy Yankee</text>
  <rect x="900" y="20" width="60" height="40" fill="rgba(71,200,209,0.1)" stroke="rgba(71,200,209,0.2)" stroke-width="1" rx="8"/>
  <text x="920" y="45" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#47C8D1" text-anchor="middle">OPEN</text>
  <rect x="980" y="20" width="40" height="40" fill="rgba(255,77,77,0.08)" stroke="rgba(255,77,77,0.15)" stroke-width="1" rx="8"/>
  <text x="1000" y="45" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="rgba(255,77,77,0.8)" text-anchor="middle">✕</text>
</svg>`;

// PlaylistCard SVG
const playlistCardSVG = `<svg width="1080" height="200" viewBox="0 0 1080 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="playlistBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1080" height="200" fill="rgba(31,41,55,0.5)" stroke="rgba(55,65,81,1)" stroke-width="1" rx="12"/>
  <rect x="24" y="24" width="64" height="64" fill="url(#playlistBg)" rx="8"/>
  <text x="56" y="60" font-family="Inter, sans-serif" font-size="24" fill="white" text-anchor="middle">🎵</text>
  <text x="104" y="50" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#ffffff">Fiesta Reggaeton</text>
  <text x="104" y="75" font-family="Inter, sans-serif" font-size="14" fill="rgba(156,163,175,1)">"reggaeton para salir de fiesta"</text>
  <text x="104" y="95" font-family="Inter, sans-serif" font-size="12" fill="rgba(107,114,128,1)">24 canciones • Hace 2 días</text>
  <rect x="24" y="120" width="1032" height="56" fill="rgba(55,65,81,0.3)" rx="8"/>
  <text x="40" y="140" font-family="Inter, sans-serif" font-size="12" font-weight="500" fill="rgba(156,163,175,1)">Público</text>
  <rect x="1000" y="128" width="32" height="16" fill="#10B981" rx="8"/>
  <circle cx="1014" cy="136" r="6" fill="white"/>
</svg>`;

// MainButton SVG
const mainButtonSVG = `<svg width="300" height="60" viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="buttonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#47C8D1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5B8CFF;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="300" height="60" fill="url(#buttonGradient)" rx="12"/>
  <text x="150" y="38" font-family="Space Grotesk, sans-serif" font-size="18" font-weight="600" fill="#0B0F12" text-anchor="middle" letter-spacing="0.01em">Generate Playlist</text>
</svg>`;

// Función para guardar SVG
function saveSVG(filename, svgContent) {
  const fs = require('fs');
  const path = require('path');
  
  const filePath = path.join(__dirname, 'exports', 'ui', filename);
  fs.writeFileSync(filePath, svgContent);
  console.log(`✅ ${filename} guardado en exports/ui/`);
}

// Guardar todos los SVGs
console.log('🎨 Exportando componentes UI a SVGs...\n');

saveSVG('prompt-box.svg', promptBoxSVG);
console.log('📝 PromptBox: Caja de entrada de texto con título y textarea');

saveSVG('song-card.svg', songCardSVG);
console.log('🎵 SongCard: Tarjeta de canción con información y botones de acción');

saveSVG('playlist-card.svg', playlistCardSVG);
console.log('📋 PlaylistCard: Tarjeta de playlist con imagen, título y configuración');

saveSVG('main-button.svg', mainButtonSVG);
console.log('🔘 MainButton: Botón principal con gradiente Pleia');

console.log('\n✨ Todos los componentes exportados exitosamente!');
console.log('📁 Ubicación: exports/ui/');
console.log('🎯 Listos para importar en Figma');