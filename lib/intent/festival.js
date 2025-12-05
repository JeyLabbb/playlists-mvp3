// FIXPACK: Extractor de festivales mejorado para manejar casos como "Necesito calentar para el Primavera Sound 2025"
// Elimina verbos de intención y mantiene nombres de festivales completos

// FIXPACK: Verbos de intención a eliminar del prompt
const INTENTION_VERBS = [
  'necesito', 'quiero', 'calentar', 'preparar', 'hacer', 'crear', 'generar',
  'buscar', 'encontrar', 'conseguir', 'obtener', 'tener', 'necesitar',
  'para', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'con'
];

// FIXPACK: Palabras relacionadas con festivales a mantener
const FESTIVAL_KEYWORDS = [
  'festival', 'fest', 'sound', 'music', 'concert', 'event', 'show',
  'primavera', 'coachella', 'sonar', 'riverland', 'holika', 'groove',
  'pamplona', 'madrid', 'barcelona', 'valencia', 'sevilla'
];

export function extractFestivalInfo(prompt) {
  const originalPrompt = prompt;
  const promptLower = prompt.toLowerCase();
  
  // FIXPACK: Extraer año del prompt (soporte para años de 2 y 4 dígitos)
  let yearMatch = promptLower.match(/\b(20\d{2})\b/); // Años de 4 dígitos (2000-2099)
  if (!yearMatch) {
    yearMatch = promptLower.match(/\b(\d{2})\b/); // Años de 2 dígitos (90, 94, etc.)
    if (yearMatch) {
      const twoDigitYear = parseInt(yearMatch[1]);
      // Asumir que años 00-30 son 2000-2030, años 31-99 son 1931-1999
      const fullYear = twoDigitYear <= 30 ? 2000 + twoDigitYear : 1900 + twoDigitYear;
      yearMatch = [yearMatch[0], fullYear.toString()];
    }
  }
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
  
  // FIXPACK: Limpiar prompt eliminando verbos de intención
  let cleanPrompt = promptLower;
  
  // Eliminar verbos de intención al inicio
  INTENTION_VERBS.forEach(verb => {
    const regex = new RegExp(`^${verb}\\s+`, 'i');
    cleanPrompt = cleanPrompt.replace(regex, '');
  });
  
  // Eliminar "para el/la" al inicio
  cleanPrompt = cleanPrompt.replace(/^(para\s+(el|la|los|las)\s+)/i, '');
  
  // FIXPACK: Extraer nombre del festival manteniendo palabras clave
  const words = cleanPrompt.split(/\s+/).filter(word => 
    word.length > 2 && 
    !INTENTION_VERBS.includes(word) &&
    !word.match(/^\d{4}$/) && // No incluir años de 4 dígitos
    !word.match(/^\d{2}$/) // No incluir años de 2 dígitos
  );
  
  // FIXPACK: Buscar secuencias de palabras que formen nombres de festivales
  let festivalName = '';
  let bestMatch = '';
  let maxKeywords = 0;
  
  // Probar diferentes combinaciones de palabras consecutivas
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j <= Math.min(i + 4, words.length); j++) {
      const candidate = words.slice(i, j).join(' ');
      const keywordCount = FESTIVAL_KEYWORDS.filter(keyword => 
        candidate.includes(keyword)
      ).length;
      
      if (keywordCount > maxKeywords) {
        maxKeywords = keywordCount;
        bestMatch = candidate;
      }
    }
  }
  
  festivalName = bestMatch || words.slice(0, 3).join(' ') || 'festival';
  
  // FIXPACK: Generar queries robustas con variantes
  const queries = generateFestivalQueries(festivalName, year);
  
  return {
    nombre_original: originalPrompt,
    nombre_limpio: festivalName,
    ano: year,
    queries
  };
}

// FIXPACK: Generar queries de búsqueda robustas
function generateFestivalQueries(festivalName, year) {
  const baseQueries = [
    `${festivalName} ${year}`,
    `${festivalName} lineup ${year}`,
    `${festivalName} cartel ${year}`,
    `${festivalName} official ${year}`,
    `${festivalName} ${year} lineup`,
    `${festivalName} ${year} cartel`,
    `${festivalName} ${year} official`,
    `${festivalName} ${year} artists`,
    `${festivalName} ${year} music`,
    `${festivalName} ${year} playlist`
  ];
  
  // FIXPACK: Agregar queries sin año para fallback
  const noYearQueries = [
    `${festivalName} lineup`,
    `${festivalName} cartel`,
    `${festivalName} official`,
    `${festivalName} artists`,
    `${festivalName} music`,
    `${festivalName} playlist`
  ];
  
  // FIXPACK: NO agregar variantes con años cercanos para evitar mezclar ediciones
  // Solo usar el año específico mencionado en el prompt
  return [...baseQueries, ...noYearQueries];
}

// FIXPACK: Función para calcular similitud de strings (para matching de playlists)
export function calculateStringSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().replace(/[^\w\s]/g, '');
  const s2 = str2.toLowerCase().replace(/[^\w\s]/g, '');
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  const editDistance = levenshteinDistance(s1, s2);
  return (longer.length - editDistance) / longer.length;
}

// FIXPACK: Algoritmo de distancia de Levenshtein para similitud
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}
