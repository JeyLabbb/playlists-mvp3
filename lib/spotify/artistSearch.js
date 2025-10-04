/**
 * Búsqueda directa de canciones por artista en Spotify
 * Para modo UNDERGROUND_STRICT - solo artistas permitidos
 */

/**
 * Busca las mejores canciones de un artista específico
 * @param {string} accessToken - Token de acceso de Spotify
 * @param {string} artistName - Nombre del artista
 * @param {number} limit - Máximo de canciones (default: 3)
 * @param {string} market - Mercado (default: 'ES')
 * @returns {Promise<Array>} Array de tracks
 */
export async function searchArtistTopTracks(accessToken, artistName, limit = 3, market = 'ES') {
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

    // 2. Obtener top tracks del artista
    const topTracksUrl = `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=${market}`;
    
    const tracksResponse = await fetch(topTracksUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!tracksResponse.ok) {
      console.log(`[ARTIST-SEARCH] Failed to get top tracks for "${artistName}": ${tracksResponse.status}`);
      return [];
    }

    const tracksData = await tracksResponse.json();
    const tracks = tracksData.tracks || [];

    console.log(`[ARTIST-SEARCH] Spotify returned ${tracks.length} tracks for "${artistName}", requesting ${limit}`);

    // 3. Procesar y limitar tracks
    const processedTracks = tracks.slice(0, limit).map(track => ({
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists || [],
      artistNames: track.artists?.map(a => a.name).join(', ') || artistName,
      album: track.album?.name || '',
      image: track.album?.images?.[0]?.url || '',
      popularity: track.popularity || 0,
      release_date: track.album?.release_date || '',
      duration_ms: track.duration_ms || 0
    }));

    console.log(`[ARTIST-SEARCH] Got ${processedTracks.length} tracks for "${artistName}"`);
    return processedTracks;

  } catch (error) {
    console.error(`[ARTIST-SEARCH] Error searching artist "${artistName}":`, error);
    return [];
  }
}

// Helper function to filter tracks to only include underground artists
function filterUndergroundTracks(tracks, allowedArtists) {
  const allowedSet = new Set(allowedArtists.map(a => a.toLowerCase()));
  
  return tracks.filter(track => {
    // Check if ALL artists in the track are in the allowed list
    const trackArtists = track.artists.map(a => a.name.toLowerCase());
    const allArtistsAllowed = trackArtists.every(artist => allowedSet.has(artist));
    
    if (!allArtistsAllowed) {
      console.log(`[UNDERGROUND-FILTER] Filtering out "${track.name}" by ${track.artistNames} - contains non-underground artists`);
    }
    
    return allArtistsAllowed;
  });
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
        // Filter to only include underground artists
        const filteredTracks = filterUndergroundTracks(tracks, allowedArtists);
        console.log(`[UNDERGROUND-SPOTIFY] "${artistName}" (PRIORITY): ${tracks.length} tracks found, ${filteredTracks.length} after underground filtering`);
        
        // Aleatorizar tracks del artista para variedad
        const shuffledTracks = filteredTracks.sort(() => rng() - 0.5);
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
        
        // Filter to only include underground artists
        const filteredTracks = filterUndergroundTracks(tracks, allowedArtists);
        console.log(`[UNDERGROUND-SPOTIFY] "${artistName}": ${tracks.length} tracks found, ${filteredTracks.length} after underground filtering`);
        
        // Aleatorizar tracks del artista para variedad
        const shuffledTracks = filteredTracks.sort(() => rng() - 0.5);
        
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
