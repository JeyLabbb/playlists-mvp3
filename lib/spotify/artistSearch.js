/**
 * Búsqueda directa de canciones por artista en Spotify
 * Para modo UNDERGROUND_STRICT - solo artistas permitidos
 */

/**
 * Resuelve un artista con pipeline estricto: exact match > alias > fuzzy (umbral alto)
 * FEATURE_ARTIST_RESOLVER_STRICT: resolución estricta con deduplicación por ID
 * @param {string} accessToken - Token de acceso de Spotify
 * @param {string} artistName - Nombre del artista a resolver
 * @param {Array<string>} otherPriorityArtists - Otros artistas priority del prompt (para evitar colisiones)
 * @param {string} market - Mercado (default: 'ES')
 * @returns {Promise<{artist: Object|null, decision: {method: string, confidence: number, requested: string, resolved: string, id: string|null}}>}
 */
/**
 * Normaliza un nombre de artista eliminando acentos y caracteres especiales para comparación tolerante
 */
function normalizeForComparison(name) {
  return name
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (acentos, tildes, etc.)
    .replace(/[^a-z0-9\s]/g, '') // Elimina caracteres especiales excepto espacios
    .trim();
}

/**
 * Calcula similitud entre dos nombres normalizados, tolerante a errores ortográficos comunes
 */
function calculateSimilarity(name1, name2) {
  const norm1 = normalizeForComparison(name1);
  const norm2 = normalizeForComparison(name2);
  
  // Si son iguales después de normalización, similitud perfecta
  if (norm1 === norm2) return 1.0;
  
  // Si uno contiene al otro, alta similitud
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return 0.85 + (shorter / longer) * 0.1; // Entre 0.85 y 0.95
  }
  
  // Calcular Levenshtein normalizado
  const levenshtein = (s1, s2) => {
    const m = s1.length;
    const n = s2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i-1] === s2[j-1]) {
          dp[i][j] = dp[i-1][j-1];
        } else {
          dp[i][j] = Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1;
        }
      }
    }
    return dp[m][n];
  };
  
  const maxLen = Math.max(norm1.length, norm2.length);
  const distance = levenshtein(norm1, norm2);
  return 1 - (distance / maxLen);
}

export async function resolveArtistStrict(accessToken, artistName, otherPriorityArtists = [], market = 'ES') {
  // Umbral más bajo para errores ortográficos comunes (ej: "johnpollon" → "John Pollôn")
  const FUZZY_THRESHOLD = 0.7; // Reducido de 0.8 a 0.7 para ser más tolerante
  
  const decision = {
    requested: artistName,
    resolved: null,
    id: null,
    method: 'none',
    confidence: 0
  };

  try {
    // 1. Buscar artista por nombre (sin comillas para ser más flexible)
    const searchQuery = artistName; // Sin comillas para permitir variaciones
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=artist&limit=20&market=${market}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      console.log(`[RESOLVER-STRICT] Failed to search "${artistName}": ${searchResponse.status}`);
      return { artist: null, decision: { ...decision, method: 'error', confidence: 0 } };
    }

    const searchData = await searchResponse.json();
    const artists = searchData.artists?.items || [];
    
    if (artists.length === 0) {
      console.log(`[RESOLVER-STRICT] No results for "${artistName}"`);
      return { artist: null, decision: { ...decision, method: 'not_found', confidence: 0 } };
    }

    // Normalizar nombres para comparación (con normalización de acentos)
    const normalizedRequested = normalizeForComparison(artistName);
    const normalizedOthers = new Set(otherPriorityArtists.map(a => normalizeForComparison(a)));

    // PASO 1: Exact match (case-fold y sin acentos)
    // 🚨 MEJORA: Si hay múltiples matches exactos, priorizar el más popular
    // También considerar matches por contención (ej: "anuel" → "Anuel AA")
    const exactMatches = artists.filter(a => {
      const normalizedCandidate = normalizeForComparison(a.name);
      // Match exacto
      if (normalizedCandidate === normalizedRequested) return true;
      // Match por contención (uno contiene al otro) - solo si el nombre buscado tiene al menos 4 caracteres
      if (normalizedRequested.length >= 4) {
        if (normalizedCandidate.includes(normalizedRequested) || normalizedRequested.includes(normalizedCandidate)) {
          // Verificar que la coincidencia sea significativa
          const minLength = Math.min(normalizedRequested.length, normalizedCandidate.length);
          return minLength >= 4;
        }
      }
      return false;
    });
    
    if (exactMatches.length > 0) {
      // Si hay múltiples matches, ordenar por popularidad (descendente) y tomar el más popular
      exactMatches.sort((a, b) => {
        // Combinar popularity y followers para mejor desempate
        const scoreA = (a.popularity || 0) * 0.7 + Math.min(a.followers?.total || 0, 10000000) / 10000000 * 0.3;
        const scoreB = (b.popularity || 0) * 0.7 + Math.min(b.followers?.total || 0, 10000000) / 10000000 * 0.3;
        return scoreB - scoreA;
      });
      
      const artist = exactMatches[0];
      const isExactMatch = normalizeForComparison(artist.name) === normalizedRequested;
      const isContainmentMatch = !isExactMatch;
      
      decision.resolved = artist.name;
      decision.id = artist.id;
      decision.method = isExactMatch ? 'exact' : 'exact_containment';
      decision.confidence = isExactMatch ? 1.0 : 0.95; // Ligeramente menor confianza para contención
      
      if (exactMatches.length > 1) {
        const matchType = isExactMatch ? 'EXACT' : 'CONTAINMENT';
        console.log(`[RESOLVER-STRICT] "${artistName}" → ${matchType} (${exactMatches.length} matches): Selected "${artist.name}" (ID: ${artist.id}, popularity: ${artist.popularity || 0}) - most popular among matches`);
      } else {
        const matchType = isExactMatch ? 'EXACT' : 'CONTAINMENT';
        console.log(`[RESOLVER-STRICT] "${artistName}" → ${matchType}: "${artist.name}" (ID: ${artist.id}, popularity: ${artist.popularity || 0})`);
      }
      return { artist, decision };
    }

    // PASO 2: Alias oficiales (TODO: si hay base de datos de alias, usar aquí)
    // Por ahora, skip este paso

    // PASO 3: Fuzzy matching tolerante a errores ortográficos
    // 🚨 MEJORA: Priorizar artistas más populares cuando hay ambigüedad
    let bestMatch = null;
    let bestScore = 0;
    const SIMILARITY_TIE_THRESHOLD = 0.05; // Si dos candidatos tienen similitud muy cercana (dentro de 5%), usar popularidad

    // Intentar match parcial si el nombre contiene múltiples palabras (ej: "mda johnpollon")
    const requestedWords = normalizedRequested.split(/\s+/).filter(w => w.length > 2);
    
    // Primero, calcular similitud para todos los candidatos
    const candidatesWithScores = [];
    
    for (const candidate of artists) {
      const normalizedCandidate = normalizeForComparison(candidate.name);
      
      // Si el candidato es uno de los otros priority artists, rechazar (colisión)
      if (normalizedOthers.has(normalizedCandidate)) {
        console.log(`[RESOLVER-STRICT] Rejecting "${candidate.name}" - collision with other priority artist`);
        continue;
      }

      // Calcular similitud usando función mejorada (tolerante a acentos y caracteres especiales)
      let similarity = calculateSimilarity(artistName, candidate.name);
      
      // Match parcial: si alguna palabra del requested está en el candidato, bonus
      if (requestedWords.length > 1) {
        const candidateWords = normalizedCandidate.split(/\s+/);
        const matchingWords = requestedWords.filter(reqWord => 
          candidateWords.some(candWord => candWord.includes(reqWord) || reqWord.includes(candWord))
        );
        if (matchingWords.length > 0) {
          similarity = Math.min(1.0, similarity + 0.1); // Bonus por match parcial
          console.log(`[RESOLVER-STRICT] Partial match for "${artistName}": found words "${matchingWords.join(', ')}" in "${candidate.name}"`);
        }
      }

      // Boost adicional si hay inclusión (uno contiene al otro)
      const normReq = normalizeForComparison(artistName);
      const normCand = normalizeForComparison(candidate.name);
      if (normCand.includes(normReq) || normReq.includes(normCand)) {
        similarity = Math.max(similarity, 0.8); // Boost si hay inclusión
      }

      if (similarity >= FUZZY_THRESHOLD) {
        candidatesWithScores.push({
          candidate,
          similarity,
          popularity: candidate.popularity || 0,
          followers: candidate.followers?.total || 0
        });
      }
    }

    // Si hay candidatos, seleccionar el mejor
    if (candidatesWithScores.length > 0) {
      // Ordenar por similitud (descendente), luego por popularidad (descendente) como desempate
      candidatesWithScores.sort((a, b) => {
        // Primero por similitud
        if (Math.abs(a.similarity - b.similarity) > SIMILARITY_TIE_THRESHOLD) {
          return b.similarity - a.similarity;
        }
        // Si la similitud es muy cercana (dentro del umbral), priorizar popularidad
        // Usar una combinación de popularity y followers para mejor desempate
        const scoreA = (a.popularity || 0) * 0.7 + Math.min(a.followers || 0, 10000000) / 10000000 * 0.3;
        const scoreB = (b.popularity || 0) * 0.7 + Math.min(b.followers || 0, 10000000) / 10000000 * 0.3;
        return scoreB - scoreA;
      });

      bestMatch = candidatesWithScores[0].candidate;
      bestScore = candidatesWithScores[0].similarity;
      
      // Log si se usó popularidad como desempate
      if (candidatesWithScores.length > 1 && 
          Math.abs(candidatesWithScores[0].similarity - candidatesWithScores[1].similarity) <= SIMILARITY_TIE_THRESHOLD) {
        console.log(`[RESOLVER-STRICT] Tie-breaker: Selected "${bestMatch.name}" (popularity: ${bestMatch.popularity || 0}, followers: ${bestMatch.followers?.total || 0}) over "${candidatesWithScores[1].candidate.name}" (popularity: ${candidatesWithScores[1].candidate.popularity || 0})`);
      }
    }

    if (bestMatch) {
      decision.resolved = bestMatch.name;
      decision.id = bestMatch.id;
      decision.method = 'fuzzy';
      decision.confidence = bestScore;
      console.log(`[RESOLVER-STRICT] "${artistName}" → FUZZY: "${bestMatch.name}" (ID: ${bestMatch.id}, confidence: ${bestScore.toFixed(2)}, popularity: ${bestMatch.popularity || 0})`);
      return { artist: bestMatch, decision };
    }

    // Si no hay match suficientemente bueno, rechazar
    console.log(`[RESOLVER-STRICT] "${artistName}" → REJECTED (no match above threshold ${FUZZY_THRESHOLD})`);
    return { artist: null, decision: { ...decision, method: 'rejected', confidence: 0 } };

  } catch (error) {
    console.error(`[RESOLVER-STRICT] Error resolving "${artistName}":`, error);
    return { artist: null, decision: { ...decision, method: 'error', confidence: 0 } };
  }
}

/**
 * Resuelve múltiples artistas con deduplicación por ID único
 * FEATURE_ARTIST_RESOLVER_STRICT: colapsa alias que resuelven al mismo ID
 * @param {string} accessToken - Token de acceso de Spotify
 * @param {Array<string>} artistNames - Lista de nombres de artistas a resolver
 * @param {string} market - Mercado (default: 'ES')
 * @returns {Promise<{distinct: Map<string, Object>, decisions: Array, aliases: Map<string, Array<string>>}>}
 */
export async function resolveArtistsWithDeduplication(accessToken, artistNames, market = 'ES') {

  const decisions = [];
  const idToArtist = new Map(); // ID único → artista resuelto
  const idToAliases = new Map(); // ID único → array de nombres que resolvieron a ese ID
  const nameToId = new Map(); // Nombre original → ID resuelto

  // Resolver todos los artistas
  for (const artistName of artistNames) {
    const otherArtists = artistNames.filter(n => n !== artistName);
    const result = await resolveArtistStrict(accessToken, artistName, otherArtists, market);
    
    decisions.push(result.decision);

    if (result.artist && result.artist.id) {
      const artistId = result.artist.id;
      
      // Si ya tenemos este ID, añadir como alias
      if (idToArtist.has(artistId)) {
        const aliases = idToAliases.get(artistId) || [];
        aliases.push(artistName);
        idToAliases.set(artistId, aliases);
        nameToId.set(artistName, artistId);
        console.log(`[RESOLVER-DEDUP] "${artistName}" → same ID as previous alias (${aliases[0]}): ${artistId}`);
      } else {
        // Nuevo ID único
        idToArtist.set(artistId, result.artist);
        idToAliases.set(artistId, [artistName]);
        nameToId.set(artistName, artistId);
        console.log(`[RESOLVER-DEDUP] "${artistName}" → new ID: ${artistId}`);
      }
    }
  }

  console.log(`[RESOLVER-DEDUP] Resolved ${artistNames.length} names → ${idToArtist.size} distinct IDs`);
  
  // Crear mapa nombre → artista (usando el artista del ID único)
  const distinct = new Map();
  for (const [name, artistId] of nameToId.entries()) {
    distinct.set(name, idToArtist.get(artistId));
  }

  return { distinct, decisions, aliases: idToAliases };
}

/**
 * Busca las mejores canciones de un artista específico (legacy - sin resolución estricta)
 * @param {string} accessToken - Token de acceso de Spotify
 * @param {string} artistName - Nombre del artista
 * @param {number} limit - Máximo de canciones (default: 3)
 * @param {string} market - Mercado (default: 'ES')
 * @returns {Promise<Array>} Array de tracks
 */
async function searchArtistTopTracksLegacy(accessToken, artistName, limit = 3, market = 'ES') {
  try {
    // 1. Buscar el artista por nombre EXACTO (con comillas para mayor precisión)
    const exactQuery = `"${artistName}"`;
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(exactQuery)}&type=artist&limit=10&market=${market}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      console.log(`[ARTIST-SEARCH] Failed to search artist "${artistName}": ${searchResponse.status}`);
      return [];
    }

    const searchData = await searchResponse.json();
    const artists = searchData.artists?.items || [];
    
    // Log detallado para debugging
    console.log(`[ARTIST-SEARCH] Searching for "${artistName}" - found ${artists.length} results`);
    if (artists.length > 0) {
      console.log(`[ARTIST-SEARCH] Results: ${artists.map(a => `"${a.name}"`).join(', ')}`);
    }
    
    if (artists.length === 0) {
      console.log(`[ARTIST-SEARCH] Artist "${artistName}" not found`);
      return [];
    }

    // Buscar coincidencia EXACTA primero (case-insensitive)
    let artist = artists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
    
    // Si no hay coincidencia exacta, buscar la más cercana que contenga el nombre
    if (!artist) {
      artist = artists.find(a => a.name.toLowerCase().includes(artistName.toLowerCase()));
    }
    
    // Si aún no hay coincidencia, usar el primero pero con advertencia
    if (!artist) {
      artist = artists[0];
      console.warn(`[ARTIST-SEARCH] No exact match for "${artistName}", using closest: "${artist.name}"`);
    } else {
      console.log(`[ARTIST-SEARCH] Found exact match: "${artist.name}" (ID: ${artist.id})`);
    }

    // Mantener compatibilidad con función original
    return [{
      artists: [artist],
      artistNames: artist.name,
      id: artist.id,
      name: artist.name
    }];

  } catch (error) {
    console.error(`[ARTIST-SEARCH] Error searching artist "${artistName}":`, error);
    return [];
  }
}

/**
 * Busca las mejores canciones de un artista específico
 * @param {string} accessToken - Token de acceso de Spotify
 * @param {string} artistName - Nombre del artista (puede ser nombre o ID)
 * @param {number} limit - Máximo de canciones (default: 3)
 * @param {string} market - Mercado (default: 'ES')
 * @returns {Promise<Array>} Array de tracks
 */
export async function searchArtistTopTracks(accessToken, artistName, limit = 3, market = 'ES') {
  try {
    let artistId = null;
    let resolvedArtistName = artistName;

    // Si artistName es un ID válido, usarlo directamente
    if (/^[A-Za-z0-9]{22}$/.test(artistName)) {
      artistId = artistName;
      // Obtener nombre del artista desde su perfil
      try {
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          resolvedArtistName = artistData.name || artistName;
        }
      } catch (err) {
        console.warn(`[ARTIST-SEARCH] Could not fetch artist name for ID ${artistId}:`, err);
      }
    } else {
      // Resolver nombre a ID usando función estricta
      const result = await resolveArtistStrict(accessToken, artistName, [], market);
      if (result.artist && result.artist.id) {
        artistId = result.artist.id;
        resolvedArtistName = result.artist.name;
      } else {
        // Fallback a legacy si la resolución estricta falla
        const legacyResult = await searchArtistTopTracksLegacy(accessToken, artistName, 1, market);
        if (legacyResult[0]?.artists?.[0]?.id) {
          artistId = legacyResult[0].artists[0].id;
          resolvedArtistName = legacyResult[0].artists[0].name;
        }
      }
    }

    if (!artistId) {
      console.log(`[ARTIST-SEARCH] Could not resolve artist "${artistName}" to ID`);
      return [];
    }

    // 2. Obtener top tracks del artista (usar market siempre)
    const topTracksUrl = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`;
    
    const tracksResponse = await fetch(topTracksUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!tracksResponse.ok) {
      console.log(`[ARTIST-SEARCH] Failed to get top tracks for "${resolvedArtistName}" (ID: ${artistId}): ${tracksResponse.status}`);
      return [];
    }

    const tracksData = await tracksResponse.json();
    const tracks = tracksData.tracks || [];

    console.log(`[ARTIST-SEARCH] Spotify returned ${tracks.length} tracks for "${resolvedArtistName}" (ID: ${artistId}), requesting ${limit}`);

    // 3. Procesar y limitar tracks
    const processedTracks = tracks.slice(0, limit).map(track => ({
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists || [],
      artistNames: track.artists?.map(a => a.name).join(', ') || resolvedArtistName,
      album: track.album?.name || '',
      image: track.album?.images?.[0]?.url || '',
      popularity: track.popularity || 0,
      release_date: track.album?.release_date || '',
      duration_ms: track.duration_ms || 0,
      preview_url: track.preview_url || null,
      open_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`
    }));

    console.log(`[ARTIST-SEARCH] Got ${processedTracks.length} tracks for "${resolvedArtistName}"`);
    return processedTracks;

  } catch (error) {
    console.error(`[ARTIST-SEARCH] Error searching artist "${artistName}":`, error);
    return [];
  }
}

/**
 * Busca canciones de múltiples artistas con aleatoriedad controlada
 * @param {string} accessToken - Token de acceso de Spotify
 * @param {Array<string>} allowedArtists - Lista de artistas permitidos
 * @param {number} targetTracks - Número objetivo de tracks
 * @param {number} maxPerArtist - Máximo por artista (default: 3)
 * @param {string} seed - Semilla para aleatoriedad (default: Date.now())
 * @returns {Promise<Array>} Array de tracks seleccionados
 */
export async function searchUndergroundTracks(accessToken, allowedArtists, targetTracks, maxPerArtist = 3, seed = null, priorityArtists = []) {
  console.log(`[UNDERGROUND-SPOTIFY] Starting search for ${targetTracks} tracks from ${allowedArtists.length} artists`);
  if (priorityArtists.length > 0) {
    console.log(`[UNDERGROUND-SPOTIFY] Priority artists (max 5 tracks each): ${priorityArtists.join(', ')}`);
  }
  
  // Detectar si es modo restrictivo (pocos artistas = modo restrictivo)
  const isRestrictiveMode = allowedArtists.length <= 5;
  if (isRestrictiveMode) {
    console.log(`[UNDERGROUND-SPOTIFY] RESTRICTIVE MODE detected: ${allowedArtists.length} artists, adjusting limits`);
    maxPerArtist = Math.ceil(targetTracks / allowedArtists.length);
    console.log(`[UNDERGROUND-SPOTIFY] Adjusted maxPerArtist to ${maxPerArtist} for restrictive mode`);
  }
  
  // Detectar si es artista específico (1 solo artista = delegar completamente a Spotify)
  const isArtistSpecific = allowedArtists.length === 1;
  if (isArtistSpecific) {
    console.log(`[UNDERGROUND-SPOTIFY] ARTIST-SPECIFIC MODE detected: single artist "${allowedArtists[0]}", allowing up to 999 tracks`);
    maxPerArtist = 999; // Permitir hasta 999 canciones del artista
    console.log(`[UNDERGROUND-SPOTIFY] Set maxPerArtist to ${maxPerArtist} for artist-specific mode`);
  }
  
  // Semilla para aleatoriedad estable
  const rngSeed = seed || Date.now();
  const rng = () => Math.sin(rngSeed + Math.random() * 1000) * 10000 % 1;
  
  // Separar artistas prioritarios y normales
  const prioritySet = new Set(priorityArtists.map(a => a.toLowerCase()));
  const priorityArtistsList = allowedArtists.filter(a => prioritySet.has(a.toLowerCase()));
  const normalArtistsList = allowedArtists.filter(a => !prioritySet.has(a.toLowerCase()));
  
  console.log(`[UNDERGROUND-SPOTIFY] Priority artists found: ${priorityArtistsList.length}, Normal artists: ${normalArtistsList.length}`);
  
  const allTracks = [];
  const artistCounts = new Map();
  
  // PASO 1: GARANTIZAR ARTISTAS PRIORITARIOS (5 tracks cada uno)
  if (priorityArtistsList.length > 0) {
    console.log(`[UNDERGROUND-SPOTIFY] STEP 1: Ensuring priority artists get 5 tracks each`);
    
    for (const artistName of priorityArtistsList) {
      const tracks = await searchArtistTopTracks(accessToken, artistName, 5, 'ES');
      
      if (tracks.length > 0) {
        // Aleatorizar tracks del artista para variedad
        const shuffledTracks = tracks.sort(() => rng() - 0.5);
        const priorityTracks = shuffledTracks.slice(0, 5);
        
        allTracks.push(...priorityTracks);
        artistCounts.set(artistName, priorityTracks.length);
        
        console.log(`[UNDERGROUND-SPOTIFY] "${artistName}" (PRIORITY): ${priorityTracks.length} tracks`);
      } else {
        console.log(`[UNDERGROUND-SPOTIFY] "${artistName}" (PRIORITY): No tracks found`);
        artistCounts.set(artistName, 0);
      }
    }
  }
  
  // PASO 2: COMPLETAR CON ARTISTAS NORMALES hasta alcanzar targetTracks
  const remainingSlots = targetTracks - allTracks.length;
  console.log(`[UNDERGROUND-SPOTIFY] STEP 2: Need ${remainingSlots} more tracks from normal artists`);
  
  if (remainingSlots > 0) {
    // Aleatorizar orden de artistas normales para diversidad
    const shuffledNormal = [...normalArtistsList].sort(() => rng() - 0.5);
    
    // Buscar tracks de artistas normales (con límite de concurrencia)
    const MAX_CONCURRENT = 5;
    const batches = [];
    
    for (let i = 0; i < shuffledNormal.length; i += MAX_CONCURRENT) {
      const batch = shuffledNormal.slice(i, i + MAX_CONCURRENT);
      batches.push(batch);
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (artistName) => {
        // Verificar límite por artista
        const currentCount = artistCounts.get(artistName) || 0;
        if (currentCount >= maxPerArtist) {
          console.log(`[UNDERGROUND-SPOTIFY] Skipping "${artistName}" - already at limit (${currentCount}/${maxPerArtist})`);
          return [];
        }
        
        const tracks = await searchArtistTopTracks(accessToken, artistName, maxPerArtist, 'ES');
        
        // Aleatorizar tracks del artista para variedad
        const shuffledTracks = tracks.sort(() => rng() - 0.5);
        
        // Aplicar límite por artista
        const limitedTracks = shuffledTracks.slice(0, maxPerArtist - currentCount);
        
        // Actualizar contador
        artistCounts.set(artistName, currentCount + limitedTracks.length);
        
        console.log(`[UNDERGROUND-SPOTIFY] "${artistName}": ${limitedTracks.length} tracks`);
        return limitedTracks;
      });
      
      const batchResults = await Promise.all(promises);
      allTracks.push(...batchResults.flat());
      
      // Si ya tenemos suficientes tracks, parar
      if (allTracks.length >= targetTracks) {
        console.log(`[UNDERGROUND-SPOTIFY] Reached target: ${allTracks.length}/${targetTracks}`);
        break;
      }
    }
  }
  
  // PASO 3: GARANTIZAR QUE LOS TRACKS PRIORITARIOS ESTÉN EN LA PLAYLIST FINAL
  const priorityTracks = allTracks.filter(track => {
    const artistName = track.artistNames?.split(',')[0]?.trim() || '';
    return prioritySet.has(artistName.toLowerCase());
  });
  
  const normalTracks = allTracks.filter(track => {
    const artistName = track.artistNames?.split(',')[0]?.trim() || '';
    return !prioritySet.has(artistName.toLowerCase());
  });
  
  console.log(`[UNDERGROUND-SPOTIFY] STEP 3: Priority tracks: ${priorityTracks.length}, Normal tracks: ${normalTracks.length}`);
  
  // Construir playlist final: TODOS los prioritarios + normales hasta completar targetTracks
  const finalTracks = [];
  
  // 1. Añadir TODOS los tracks prioritarios (garantizados)
  finalTracks.push(...priorityTracks);
  
  // 2. Añadir tracks normales hasta completar targetTracks
  const remainingSlotsFinal = targetTracks - finalTracks.length;
  if (remainingSlotsFinal > 0) {
    const shuffledNormalTracks = normalTracks.sort(() => rng() - 0.5);
    finalTracks.push(...shuffledNormalTracks.slice(0, remainingSlotsFinal));
  }
  
  console.log(`[UNDERGROUND-SPOTIFY] Final result: ${finalTracks.length} tracks from ${artistCounts.size} artists`);
  console.log(`[UNDERGROUND-SPOTIFY] Priority tracks guaranteed: ${priorityTracks.length}`);
  
  // Log de distribución por artista
  const distribution = Array.from(artistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log(`[UNDERGROUND-SPOTIFY] Top artists: ${distribution.map(([name, count]) => `${name}(${count})`).join(', ')}`);
  
  return finalTracks;
}
