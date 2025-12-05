// web/lib/music/hint.js
export function cleanHint(input) {
  const s = String(input || '').toLowerCase().trim();
  if (!s) return '';

  // Frases meta o genéricas que NO deben ir a búsquedas
  const blacklist = [
    'instrucciones específicas',
    'hazme una playlist',
    'buscar canciones virales en tiktok',
    'hits',
    'trending',
    'study',
    'relaxing music',
  ];

  // Si el hint es exactamente meta, vacíalo
  if (blacklist.some(b => s.includes(b))) return '';

  // Limpiezas suaves: quitar comillas, emojis básicos y exceso de espacios
  return s
    .replace(/[""«»]/g, '')
    .replace(/[^\p{L}\p{N}\s\-&/]/gu, '') // deja letras/números/espacios y - & /
    .replace(/\s+/g, ' ')
    .trim();
}
