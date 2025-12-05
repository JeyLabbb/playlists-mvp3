/**
 * Helper functions for playlist generation
 */

/**
 * Remove duplicate tracks by track ID
 */
export function dedupeByTrackId(tracks) {
  const seen = new Set();
  return tracks.filter(track => {
    if (!track?.id || seen.has(track.id)) {
      return false;
    }
    seen.add(track.id);
    return true;
  });
}

/**
 * Normalize titles (remove common suffixes like remaster/live/edit) and accents
 */
export function normalizeTitle(title) {
  const t = String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  // remove common suffixes
  return t
    .replace(/\s*\(.*?remaster.*?\)/g, "")
    .replace(/\s*\(.*?live.*?\)/g, "")
    .replace(/\s*\(.*?edit.*?\)/g, "")
    .replace(/\s*-\s*(remaster(ed)?|live|radio\s*edit|edit|version)\b.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize artist for comparison (primary artist only)
 */
export function normalizeArtist(artist) {
  return String(artist || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Normalize string for comparison: NFKD, remove diacritics, punctuation, spaces, toLowerCase
 * FEATURE_ARTIST_RESOLVER_STRICT: used for bucket verification fallback
 */
export function normalizeForComparison(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFKD') // Decompose characters with diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents, tildes, etc.)
    .replace(/[^a-z0-9]/gi, '') // Remove punctuation and spaces
    .toLowerCase()
    .trim();
}

/**
 * Dedupe by normalized title + primary artist
 */
export function dedupeByTitleArtist(tracks) {
  const seen = new Set();
  const out = [];
  for (const tr of tracks) {
    const key = `${normalizeTitle(tr.name)}::${normalizeArtist(tr.artists?.[0])}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tr);
  }
  return out;
}

/**
 * Apply artist caps (hard and soft limits) - Dynamic based on target size
 * 🚨 MEJORADO: Usa sistema de caps dinámicos y maneja casos especiales
 * ✅ FIX: en lugar de mirar el conteo final y tirar TODO lo que excede,
 * tomamos pistas en orden y vamos contabilizando por artista para no vaciar listas.
 */
export function applyArtistCaps(tracks, targetSize, options = {}) {
  if (!Array.isArray(tracks) || !tracks.length) return tracks;

  const { 
    hardCap = null, 
    softPct = 12,
    minArtists = 5,
    specialCases = {},
    dynamicCaps = null
  } = options;

  const out = [];
  const perArtist = new Map();
  
  // 🚨 MEJORADO: Si hay caps dinámicos, usarlos; si no, calcular caps normales
  let maxPerArtist;
  if (dynamicCaps && dynamicCaps.nonPriorityCap > 0) {
    maxPerArtist = dynamicCaps.nonPriorityCap;
  } else {
    // Dynamic hard cap based on target size (comportamiento legacy)
    const dynamicHardCap = hardCap || Math.max(2, Math.ceil(targetSize / 15));
    const computedSoft = Math.max(dynamicHardCap, Math.ceil((targetSize * softPct) / 100));
    maxPerArtist = Math.max(1, Math.min(dynamicHardCap, computedSoft));
  }

  const excludedArtists = (specialCases.excludedArtists || []).map(a => a.toLowerCase());
  const onlyArtists = (specialCases.onlyArtists || []).map(a => a.toLowerCase());

  console.log(`[ARTIST_CAPS] Target: ${targetSize}, Max per artist: ${maxPerArtist}, Special cases: ${JSON.stringify(specialCases)}`);

  for (const tr of tracks) {
    // Obtener todos los artistas del track
    const allArtists = (tr?.artists || tr?.artistNames || []).map(a => {
      const name = typeof a === 'string' ? a : (a?.name || '');
      return name.toLowerCase();
    }).filter(Boolean);
    
    if (allArtists.length === 0) {
      out.push(tr);
      continue;
    }
    
    const mainArtist = allArtists[0];
    
    // 🚨 CRITICAL: Verificar si algún artista está excluido (cap = 0)
    const hasExcludedArtist = allArtists.some(a => excludedArtists.includes(a));
    if (hasExcludedArtist) {
      continue; // Rechazar track con artista excluido
    }
    
    // 🚨 CRITICAL: Si hay "solo de X", solo permitir tracks de esos artistas
    if (onlyArtists.length > 0) {
      const hasOnlyArtist = allArtists.some(a => onlyArtists.includes(a));
      if (!hasOnlyArtist) {
        continue; // Rechazar track que no es de los artistas "solo de"
      }
      // Si es un artista "solo de", cap infinito - siempre permitir
      out.push(tr);
      for (const artist of allArtists) {
        perArtist.set(artist, (perArtist.get(artist) || 0) + 1);
      }
      continue;
    }
    
    // Cap normal: verificar límite
    const used = perArtist.get(mainArtist) || 0;
    if (used < maxPerArtist || maxPerArtist === Infinity) {
      out.push(tr);
      perArtist.set(mainArtist, used + 1);
    }
  }
  
  console.log(`[ARTIST_CAPS] Applied caps: ${out.length} tracks from ${tracks.length}, ${perArtist.size} unique artists`);
  return out;
}

/**
 * Round-robin distribution by artist to avoid clustering
 */
export function roundRobinByArtist(tracks) {
  if (!tracks.length) return tracks;
  
  // Group tracks by main artist
  const artistGroups = new Map();
  for (const track of tracks) {
    const mainArtist = track.artists?.[0] || "Unknown";
    if (!artistGroups.has(mainArtist)) {
      artistGroups.set(mainArtist, []);
    }
    artistGroups.get(mainArtist).push(track);
  }
  
  // Round-robin distribution
  const result = [];
  const artists = Array.from(artistGroups.keys());
  const maxTracks = Math.max(...Array.from(artistGroups.values()).map(group => group.length));
  
  for (let i = 0; i < maxTracks; i++) {
    for (const artist of artists) {
      const artistTracks = artistGroups.get(artist);
      if (i < artistTracks.length) {
        result.push(artistTracks[i]);
      }
    }
  }
  
  return result;
}

/**
 * 🚨 NUEVO: Detecta casos especiales en el prompt
 * @param {string} prompt - Prompt del usuario
 * @param {Array} priorityArtists - Lista de priority artists
 * @param {Array} bannedArtists - Lista de artistas baneados
 * @returns {{onlyArtists: Array, excludedArtists: Array, styleWithoutArtists: Array}}
 */
export function detectSpecialCases(prompt, priorityArtists = [], bannedArtists = []) {
  const promptLower = (prompt || '').toLowerCase();
  const onlyArtists = [];
  const excludedArtists = [...bannedArtists];
  const styleWithoutArtists = [];
  
  // Detectar "canciones de X" o "canciones únicamente de X"
  const onlyPatterns = [
    /canciones\s+(?:únicamente\s+)?de\s+([^,\.;]+)/gi,
    /solo\s+(?:canciones\s+)?de\s+([^,\.;]+)/gi,
    /únicamente\s+(?:canciones\s+)?de\s+([^,\.;]+)/gi,
    /only\s+(?:songs\s+)?(?:by\s+)?([^,\.;]+)/gi
  ];
  
  for (const pattern of onlyPatterns) {
    const matches = promptLower.matchAll(pattern);
    for (const match of matches) {
      const artists = match[1].split(/[,\s]+y\s+|,|\s+y\s+/).map(a => a.trim()).filter(Boolean);
      onlyArtists.push(...artists);
    }
  }
  
  // Detectar "sin X" o "sin canciones de X"
  const excludePatterns = [
    /sin\s+(?:canciones\s+)?(?:de\s+)?([^,\.;]+)/gi,
    /without\s+(?:songs\s+)?(?:by\s+)?([^,\.;]+)/gi,
    /no\s+(?:canciones\s+)?(?:de\s+)?([^,\.;]+)/gi
  ];
  
  for (const pattern of excludePatterns) {
    const matches = promptLower.matchAll(pattern);
    for (const match of matches) {
      const artists = match[1].split(/[,\s]+y\s+|,|\s+y\s+/).map(a => a.trim()).filter(Boolean);
      excludedArtists.push(...artists);
    }
  }
  
  // Detectar "canciones como X artista, sin X artista" o "estilo de X sin X"
  const styleWithoutPatterns = [
    /(?:canciones\s+)?(?:como|estilo\s+de|like)\s+([^,\.;]+?)(?:\s*,\s*|\s+)(?:sin|without)\s+([^,\.;]+)/gi,
    /(?:canciones\s+)?(?:como|estilo\s+de|like)\s+([^,\.;]+?)(?:\s+pero\s+sin|\s+but\s+without)\s+([^,\.;]+)/gi
  ];
  
  for (const pattern of styleWithoutPatterns) {
    const matches = promptLower.matchAll(pattern);
    for (const match of matches) {
      const styleArtist = match[1].trim();
      const excludedArtist = match[2].trim();
      if (styleArtist && excludedArtist) {
        styleWithoutArtists.push({ style: styleArtist, exclude: excludedArtist });
        excludedArtists.push(excludedArtist);
      }
    }
  }
  
  return {
    onlyArtists: [...new Set(onlyArtists)],
    excludedArtists: [...new Set(excludedArtists)],
    styleWithoutArtists
  };
}

/**
 * 🚨 NUEVO: Calcula caps dinámicos según los requisitos del usuario
 * @param {number} targetTracks - Número total de tracks objetivo
 * @param {number} distinctPriority - Número de artistas priority únicos
 * @param {Object} specialCases - Resultado de detectSpecialCases
 * @param {boolean} hasOnlyArtists - Si hay artistas "solo de"
 * @returns {{priorityCap: number, nonPriorityCap: number, onlyArtistsCap: number, excludedArtistsCap: number}}
 */
export function calculateDynamicCaps(targetTracks, distinctPriority = 0, specialCases = {}, hasOnlyArtists = false) {
  // Caso 1: "canciones de X" o "solo de X" → cap infinito para esos artistas
  // Si hay varios artistas, dividir n/artistas y redondear arriba
  if (hasOnlyArtists && specialCases.onlyArtists && specialCases.onlyArtists.length > 0) {
    const onlyArtistsCount = specialCases.onlyArtists.length;
    // Si hay varios artistas "solo de", dividir equitativamente y redondear arriba
    const tracksPerOnlyArtist = onlyArtistsCount > 1 
      ? Math.ceil(targetTracks / onlyArtistsCount)
      : Infinity; // Si es solo uno, cap infinito
    
    return {
      priorityCap: tracksPerOnlyArtist, // Cap calculado para artistas "solo de" (o Infinity si es uno)
      nonPriorityCap: 0, // No se permiten otros artistas
      onlyArtistsCap: tracksPerOnlyArtist,
      excludedArtistsCap: 0,
      onlyArtistsCount // Para usar en la distribución
    };
  }
  
  // Caso 2: Artistas excluidos → cap = 0
  if (specialCases.excludedArtists && specialCases.excludedArtists.length > 0) {
    // Los excluded artists tendrán cap = 0 (se maneja en la validación)
  }
  
  // Caso 3: Caps normales (sin priority artists)
  if (distinctPriority === 0) {
    // 🚨 CRITICAL: Interpolación lineal entre 5-9 según targetTracks
    // 50 canciones = 5, 200 canciones = 9
    let nonPriorityCap;
    if (targetTracks <= 50) {
      nonPriorityCap = 5;
    } else if (targetTracks >= 200) {
      nonPriorityCap = 9;
    } else {
      // Interpolación lineal: 5 + (targetTracks - 50) * (9 - 5) / (200 - 50)
      nonPriorityCap = Math.round(5 + (targetTracks - 50) * 4 / 150);
      nonPriorityCap = Math.max(5, Math.min(9, nonPriorityCap)); // Clamp entre 5-9
    }
    
    return {
      priorityCap: 0,
      nonPriorityCap,
      onlyArtistsCap: 0,
      excludedArtistsCap: 0
    };
  }
  
  // Caso 4: Con priority artists
  // 🚨 CRITICAL: Interpolación lineal entre 5-9 según targetTracks
  // 50 canciones = 5, 200 canciones = 9
  let baseNonPriorityCap;
  if (targetTracks <= 50) {
    baseNonPriorityCap = 5;
  } else if (targetTracks >= 200) {
    baseNonPriorityCap = 9;
  } else {
    // Interpolación lineal: 5 + (targetTracks - 50) * (9 - 5) / (200 - 50)
    baseNonPriorityCap = Math.round(5 + (targetTracks - 50) * 4 / 150);
    baseNonPriorityCap = Math.max(5, Math.min(9, baseNonPriorityCap)); // Clamp entre 5-9
  }
  
  const priorityCap = baseNonPriorityCap * 2; // Priority = normal x 2
  
  // 🚨 CRITICAL: Si hay muchos priority artists, ajustar para que todos tengan al menos algunas canciones
  // Priorizar que todos los priority artists tengan canciones sobre completar caps individuales
  let adjustedPriorityCap = priorityCap;
  const MIN_TRACKS_PER_PRIORITY = 3; // Mínimo de tracks por priority artist para que todos entren
  
  // Si hay muchos priority artists, reducir el cap para que quepan todos
  if (distinctPriority > 0) {
    const totalNeededForAll = distinctPriority * MIN_TRACKS_PER_PRIORITY;
    // 🚨 MEJORA: Si hay pocos priority artists (≤3), reservar mínimo 50% para artistas del estilo
    // Si hay muchos (>3), priorizar que todos tengan canciones
    const maxPriorityShare = distinctPriority <= 3 
      ? Math.floor(targetTracks * 0.5) // Máximo 50% para priority si hay pocos
      : Math.floor(targetTracks * 0.6); // Máximo 60% para priority si hay muchos
    const maxCapForAll = Math.floor(maxPriorityShare / distinctPriority);
    
    if (totalNeededForAll > maxPriorityShare) {
      // Si no caben todos con el mínimo, usar el máximo posible
      adjustedPriorityCap = Math.max(MIN_TRACKS_PER_PRIORITY, maxCapForAll);
    } else {
      // Si caben todos, usar el cap calculado pero asegurar que todos tengan al menos el mínimo
      adjustedPriorityCap = Math.max(MIN_TRACKS_PER_PRIORITY, Math.min(priorityCap, maxCapForAll));
    }
  }
  
  return {
    priorityCap: adjustedPriorityCap,
    nonPriorityCap: baseNonPriorityCap,
    onlyArtistsCap: 0,
    excludedArtistsCap: 0
  };
}

/**
 * Calcula distribución de tracks entre artistas priority con caps dinámicos
 * FEATURE_MULTI_ARTIST_FANOUT: distribución orden-invariante con caps derivados
 * 🚨 MEJORADO: Usa caps dinámicos calculados según requisitos
 * @param {number} targetTracks - Número total de tracks objetivo
 * @param {number} distinctPriority - Número de artistas priority únicos (por ID)
 * @param {Object} dynamicCaps - Caps dinámicos calculados
 * @param {Object} specialCases - Casos especiales detectados
 * @returns {{bucketPlan: Map, perPriorityCap: number, nonPriorityCap: number}}
 */
export function calculateMultiArtistDistribution(targetTracks, distinctPriority, dynamicCaps = null, specialCases = {}) {
  // Si no se proporcionan caps dinámicos, calcularlos
  if (!dynamicCaps) {
    dynamicCaps = calculateDynamicCaps(targetTracks, distinctPriority, specialCases);
  }
  
  const perPriorityCap = dynamicCaps.priorityCap;
  const nonPriorityCap = dynamicCaps.nonPriorityCap;
  
  // 🚨 CRITICAL: Si hay muchos priority artists, distribuir equitativamente
  // Priorizar que todos tengan canciones sobre completar caps individuales
  let priorityTracksAllocated;
  let perPriorityTarget;
  
  if (distinctPriority > 0) {
    // Calcular cuántas tracks pueden tener todos los priority artists
    // 🚨 MEJORA: Si hay pocos priority artists (≤3), reservar mínimo 50% para artistas del estilo
    // Si hay muchos (>3), priorizar que todos tengan canciones (hasta 60%)
    const maxPriorityShare = distinctPriority <= 3 
      ? Math.floor(targetTracks * 0.5) // Máximo 50% para priority si hay pocos (reserva 50% para estilo)
      : Math.floor(targetTracks * 0.6); // Máximo 60% para priority si hay muchos
    // 🚨 FIX: Aumentar mínimo para asegurar que todos los priority artists tengan canciones suficientes
    const minPerPriority = distinctPriority <= 2 
      ? Math.max(5, Math.floor(targetTracks / distinctPriority)) // Si hay 1-2, darles más
      : Math.max(4, Math.floor(targetTracks * 0.4 / distinctPriority)); // Si hay más, mínimo 4 por artista
    
    // Si hay muchos priority artists, reducir el target por artista
    if (distinctPriority * perPriorityCap > maxPriorityShare) {
      // Distribuir equitativamente el share máximo entre todos
      perPriorityTarget = Math.max(minPerPriority, Math.floor(maxPriorityShare / distinctPriority));
      priorityTracksAllocated = perPriorityTarget * distinctPriority;
    } else {
      // Si caben todos con su cap completo, usar el cap
      perPriorityTarget = perPriorityCap;
      priorityTracksAllocated = perPriorityCap * distinctPriority;
    }
  } else {
    priorityTracksAllocated = 0;
    perPriorityTarget = 0;
  }
  
  const remainingForNonPriority = Math.max(0, targetTracks - priorityTracksAllocated);
  
  // Bucket plan: cada artista priority obtiene su target calculado
  const bucketPlan = new Map();
  for (let i = 0; i < distinctPriority; i++) {
    bucketPlan.set(i, {
      target: perPriorityTarget,
      cap: perPriorityCap, // Cap máximo (puede no alcanzarse si hay muchos priority)
      current: 0,
      adds: 0,
      skipsByCap: 0
    });
  }
  
  return {
    bucketPlan,
    perPriorityCap,
    nonPriorityCap,
    baseShare: perPriorityTarget,
    distinctPriority,
    priorityTracksAllocated,
    remainingForNonPriority
  };
}

/**
 * Aplica cap en tiempo real durante la generación
 * FEATURE_ENFORCE_CAPS_DURING_BUILD: filtra tracks antes de añadirlos si exceden cap
 * 🚨 MEJORADO: Maneja casos especiales (cap infinito, cap 0 para excluidos)
 * @param {Object} track - Track a evaluar
 * @param {Map} artistCounters - Contador actual por artista (normalizado a lowercase)
 * @param {number} cap - Cap máximo para este artista
 * @param {boolean} isPriority - Si es artista priority o no
 * @param {Object} specialCases - Casos especiales detectados
 * @param {Array} onlyArtists - Artistas con cap infinito (solo de estos)
 * @returns {{allowed: boolean, reason?: string}}
 */
export function checkCapInTime(track, artistCounters, cap, isPriority = false, specialCases = {}, onlyArtists = []) {
  if (!track) return { allowed: false, reason: 'no_track' };
  
  // Normalizar artista principal y todos los artistas del track
  const mainArtist = (track.artists?.[0]?.name || track.artistNames?.[0] || 'Unknown').toLowerCase();
  const allArtists = (track.artists || track.artistNames || []).map(a => {
    const name = typeof a === 'string' ? a : (a?.name || '');
    return name.toLowerCase();
  }).filter(Boolean);
  
  // 🚨 CRITICAL: Verificar si algún artista está excluido (cap = 0)
  const excludedArtists = (specialCases.excludedArtists || []).map(a => a.toLowerCase());
  for (const artist of allArtists) {
    if (excludedArtists.includes(artist)) {
      return { allowed: false, reason: 'excluded_artist', artist, isPriority };
    }
  }
  
  // 🚨 CRITICAL: Si hay "solo de X", solo permitir tracks de esos artistas
  if (onlyArtists.length > 0) {
    const onlyArtistsLower = onlyArtists.map(a => a.toLowerCase());
    const hasOnlyArtist = allArtists.some(a => onlyArtistsLower.includes(a));
    if (!hasOnlyArtist) {
      return { allowed: false, reason: 'not_only_artist', onlyArtists, trackArtists: allArtists };
    }
    // Si es un artista "solo de", cap infinito
    return { allowed: true, currentCount: artistCounters.get(mainArtist) || 0, cap: Infinity, isPriority };
  }
  
  // Cap infinito para casos especiales
  if (cap === Infinity) {
    return { allowed: true, currentCount: artistCounters.get(mainArtist) || 0, cap: Infinity, isPriority };
  }
  
  // Cap 0 = siempre rechazar
  if (cap === 0) {
    return { allowed: false, reason: 'cap_zero', currentCount: 0, cap: 0, isPriority };
  }
  
  const currentCount = artistCounters.get(mainArtist) || 0;
  
  if (currentCount >= cap) {
    return { allowed: false, reason: 'cap_exceeded', currentCount, cap, isPriority };
  }
  
  return { allowed: true, currentCount, cap, isPriority };
}

/**
 * Plan de compensación inteligente
 * FEATURE_SMART_COMPENSATION: completa primero buckets de priority incompletos, luego no-priority
 * @param {Map} bucketPlan - Plan de buckets por artista priority
 * @param {number} missing - Tracks faltantes
 * @param {number} nonPriorityCap - Cap para no-priority
 * @returns {{compensationPlan: Array, fillsPriority: boolean}}
 */
export function calculateCompensationPlan(bucketPlan, missing, nonPriorityCap = 5) {
  const compensationPlan = [];
  let fillsPriority = false;
  
  // Primero: completar buckets de priority incompletos
  const incompleteBuckets = [];
  for (const [idx, bucket] of bucketPlan.entries()) {
    if (bucket.current < bucket.target) {
      incompleteBuckets.push({
        idx,
        gap: bucket.target - bucket.current,
        cap: bucket.cap,
        current: bucket.current,
        target: bucket.target
      });
    }
  }
  
  // Ordenar por gap mayor primero
  incompleteBuckets.sort((a, b) => b.gap - a.gap);
  
  let remaining = missing;
  for (const bucket of incompleteBuckets) {
    if (remaining <= 0) break;
    const toFill = Math.min(remaining, bucket.gap);
    compensationPlan.push({
      bucketIdx: bucket.idx,
      target: toFill,
      cap: bucket.cap,
      type: 'priority',
      current: bucket.current,
      maxTarget: bucket.target
    });
    remaining -= toFill;
    fillsPriority = true;
  }
  
  // Si aún faltan tracks, usar no-priority (con su cap)
  if (remaining > 0) {
    compensationPlan.push({
      target: remaining,
      cap: nonPriorityCap,
      type: 'non_priority',
      current: 0
    });
  }
  
  return { compensationPlan, fillsPriority, totalCompensation: missing - remaining };
}

/**
 * Apply negative constraints (exclude artists, only female groups, etc.)
 */
export function applyNegatives(tracks, options = {}) {
  const {
    exclude_artists = [],
    only_female_groups = false,
    allow_live_remix = true,
    language = null
  } = options;
  
  if (!tracks.length) return tracks;
  
  // Normalize exclude artists for case-insensitive matching
  const excludeNormalized = exclude_artists.map(artist => 
    String(artist).toLowerCase().trim()
  );
  
  return tracks.filter(track => {
    // Check excluded artists
    if (excludeNormalized.length > 0) {
      const trackArtists = (track.artists || []).map(artist => 
        String(artist).toLowerCase().trim()
      );
      const hasExcludedArtist = trackArtists.some(artist => 
        excludeNormalized.includes(artist)
      );
      if (hasExcludedArtist) return false;
    }
    
    // Check live/remix filter
    if (!allow_live_remix) {
      const trackName = (track.name || "").toLowerCase();
      if (trackName.includes("live") || 
          trackName.includes("remix") || 
          trackName.includes("edit") ||
          trackName.includes("version")) {
        return false;
      }
    }
    
    // (placeholders) only_female_groups / language requerirían más metadatos
    return true;
  });
}

/**
 * Retry function with exponential backoff for Spotify API calls
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    retries = 3,
    baseMs = 1000,
    maxMs = 10000
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      
      // Check for rate limit (429) in response
      if (result?.status === 429) {
        const retryAfter =
          (result.headers && result.headers.get && result.headers.get('Retry-After')) ||
          undefined;
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(baseMs * Math.pow(2, attempt), maxMs);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Batch operations for Spotify API (add tracks in chunks)
 */
export async function batchSpotifyOperation(operation, items, batchSize = 100) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      const result = await operation(batch);
      results.push(result);
    } catch (error) {
      console.error(`Batch operation failed for items ${i}-${i + batch.length}:`, error);
      // Continue with next batch even if one fails
      results.push({ error: error.message, batch: batch.length });
    }
  }
  
  return results;
}

/**
 * Normalize text for comparison (remove accents, lowercase)
 */
export function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Extract year from text
 */
export function extractYear(text) {
  const match = String(text).match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Check if text contains any of the given tokens
 */
export function containsTokens(text, tokens) {
  const normalizedText = normalizeText(text);
  const normalizedTokens = (tokens || []).map(normalizeText);
  return normalizedTokens.some(token => normalizedText.includes(token));
}

/**
 * Compute artist frequency in playlists
 */
export function computeArtistFrequency(tracks) {
  const frequency = new Map();
  
  for (const track of tracks) {
    const mainArtist = track.artists?.[0];
    if (mainArtist) {
      frequency.set(mainArtist, (frequency.get(mainArtist) || 0) + 1);
    }
  }
  
  return frequency;
}

/**
 * Sort tracks by artist frequency (most frequent first)
 */
export function sortByArtistFrequency(tracks) {
  const frequency = computeArtistFrequency(tracks);
  return tracks.sort((a, b) => {
    const freqA = frequency.get(a.artists?.[0]) || 0;
    const freqB = frequency.get(b.artists?.[0]) || 0;
    return freqB - freqA;
  });
}
