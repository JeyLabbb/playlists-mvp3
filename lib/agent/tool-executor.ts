/**
 * PLEIA Agent Tool Executor
 * 
 * Implementación de cada herramienta del agente.
 * Cada herramienta recibe parámetros y devuelve tracks.
 */

import { ToolCall } from './tools';
import { MUSICAL_CONTEXTS } from '@/lib/music/contexts';

// Tipos
export interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string; id?: string }>;
  artistNames?: string[];
  album?: { name: string; id?: string; images?: Array<{ url: string; height?: number; width?: number }> };
  uri?: string;
  popularity?: number;
  duration_ms?: number;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
}

export interface ToolResult {
  tracks: Track[];
  metadata: {
    tool: string;
    params: Record<string, any>;
    tracksFound: number;
    executionTimeMs: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

/** Fisher-Yates shuffle para aleatorizar arrays */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ═══════════════════════════════════════════════════════════════
// EJECUTOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export async function executeToolCall(
  toolCall: ToolCall,
  accessToken: string,
  context: {
    allTracksSoFar: Track[];
    usedTrackIds: Set<string>;
    bannedArtists?: Set<string>;
  }
): Promise<ToolResult> {
  const startTime = Date.now();
  let tracks: Track[] = [];

  console.log(`[AGENT-EXECUTOR] ===== EXECUTING TOOL: ${toolCall.tool} =====`);
  console.log(`[AGENT-EXECUTOR] Params:`, JSON.stringify(toolCall.params, null, 2));
  console.log(`[AGENT-EXECUTOR] Banned artists in context: [${context.bannedArtists ? Array.from(context.bannedArtists).join(', ') : 'none'}]`);
  console.log(`[AGENT-EXECUTOR] Tracks so far: ${context.allTracksSoFar.length}`);
  console.log(`[AGENT-EXECUTOR] Used track IDs: ${context.usedTrackIds.size}`);

  try {
    switch (toolCall.tool) {
      case 'get_artist_tracks':
        tracks = await executeGetArtistTracks(accessToken, toolCall.params as any);
        break;
      
      case 'get_collaborations':
        tracks = await executeGetCollaborations(accessToken, toolCall.params as any);
        break;
      
      case 'get_similar_style':
        tracks = await executeGetSimilarStyle(accessToken, toolCall.params as any, context.bannedArtists);
        break;
      
      case 'generate_creative_tracks':
        tracks = await executeGenerateCreativeTracks(accessToken, toolCall.params as any, context.bannedArtists);
        break;
      
      case 'search_playlists':
        tracks = await executeSearchPlaylists(accessToken, toolCall.params as any);
        // Filtrar artistas banneados después de search_playlists también
        if (context.bannedArtists && context.bannedArtists.size > 0) {
          const beforeFilter = tracks.length;
          tracks = tracks.filter(track => {
            const trackArtists = track.artists?.map((a: any) => a.name.toLowerCase()) || [];
            const hasBannedArtist = trackArtists.some(artist => context.bannedArtists!.has(artist));
            if (hasBannedArtist) {
              const bannedFound = trackArtists.filter(artist => context.bannedArtists!.has(artist));
              console.log(`[AGENT-EXECUTOR] ⚠️ FILTERED OUT from search_playlists: "${track.name}" by [${track.artists?.map((a: any) => a.name).join(', ')}]`);
              console.log(`[AGENT-EXECUTOR] ⚠️ REASON: Contains banned artist(s): [${bannedFound.join(', ')}]`);
              return false;
            }
            return true;
          });
          if (beforeFilter !== tracks.length) {
            console.log(`[AGENT-EXECUTOR] Filtered ${beforeFilter - tracks.length} banned tracks from search_playlists`);
          }
        }
        break;
      
      case 'adjust_distribution':
        // adjust_distribution NO pasa por filtro de duplicados porque reordena tracks existentes
        tracks = await executeAdjustDistribution(context.allTracksSoFar, toolCall.params as any);
        // Devolver directamente sin filtrar
        const executionTimeMs = Date.now() - startTime;
        console.log(`[AGENT-EXECUTOR] Tool ${toolCall.tool} completed: ${tracks.length} tracks in ${executionTimeMs}ms`);
        return {
          tracks,
          metadata: {
            tool: toolCall.tool,
            params: toolCall.params,
            tracksFound: tracks.length,
            executionTimeMs
          }
        };
      
      default:
        console.warn(`[AGENT-EXECUTOR] Unknown tool: ${toolCall.tool}`);
        tracks = [];
    }
    
    console.log(`[AGENT-EXECUTOR] Tool ${toolCall.tool} returned ${tracks.length} tracks BEFORE filtering`);

    // Filtrar duplicados Y artistas banneados (solo para herramientas que añaden tracks nuevos)
    const beforeFilter = tracks.length;
    tracks = tracks.filter(track => {
      if (!track.id || context.usedTrackIds.has(track.id)) {
        if (!track.id) {
          console.log(`[AGENT-EXECUTOR] ⚠️ SKIP (no ID): "${track.name}"`);
        } else {
          console.log(`[AGENT-EXECUTOR] ⚠️ SKIP (duplicate): "${track.name}" (ID: ${track.id})`);
        }
        return false;
      }
      
      // Filtrar artistas banneados
      if (context.bannedArtists && context.bannedArtists.size > 0) {
        const trackArtists = track.artists?.map((a: any) => a.name.toLowerCase()) || [];
        const hasBannedArtist = trackArtists.some(artist => context.bannedArtists!.has(artist));
        if (hasBannedArtist) {
          const bannedFound = trackArtists.filter(artist => context.bannedArtists!.has(artist));
          console.log(`[AGENT-EXECUTOR] ⚠️ FILTERED OUT: "${track.name}" by [${track.artists?.map((a: any) => a.name).join(', ')}]`);
          console.log(`[AGENT-EXECUTOR] ⚠️ REASON: Contains banned artist(s): [${bannedFound.join(', ')}]`);
          console.log(`[AGENT-EXECUTOR] ⚠️ All track artists (lowercase): [${trackArtists.join(', ')}]`);
          console.log(`[AGENT-EXECUTOR] ⚠️ Banned list: [${Array.from(context.bannedArtists).join(', ')}]`);
          return false;
        }
      }
      
      context.usedTrackIds.add(track.id);
      return true;
    });
    console.log(`[AGENT-EXECUTOR] Filtered ${beforeFilter} → ${tracks.length} tracks (removed ${beforeFilter - tracks.length})`);

    const executionTimeMs = Date.now() - startTime;
    console.log(`[AGENT-EXECUTOR] Tool ${toolCall.tool} completed: ${tracks.length} tracks in ${executionTimeMs}ms`);

    return {
      tracks,
      metadata: {
        tool: toolCall.tool,
        params: toolCall.params,
        tracksFound: tracks.length,
        executionTimeMs
      }
    };
  } catch (error) {
    console.error(`[AGENT-EXECUTOR] Error executing ${toolCall.tool}:`, error);
    return {
      tracks: [],
      metadata: {
        tool: toolCall.tool,
        params: toolCall.params,
        tracksFound: 0,
        executionTimeMs: Date.now() - startTime
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// HERRAMIENTA 1: get_artist_tracks
// ═══════════════════════════════════════════════════════════════

async function executeGetArtistTracks(
  accessToken: string,
  params: {
    artist: string;
    limit?: number;
    include_collaborations?: boolean;
    only_popular?: boolean;
  }
): Promise<Track[]> {
  const { artist, limit = 15, include_collaborations = true, only_popular = false } = params;
  const tracks: Track[] = [];

  console.log(`[GET_ARTIST_TRACKS] Searching for: "${artist}", limit: ${limit}`);

  // 1. Buscar el artista
  const searchResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchResponse.ok) {
    console.error(`[GET_ARTIST_TRACKS] Failed to search artist: ${searchResponse.status}`);
    return [];
  }

  const searchData = await searchResponse.json();
  const artistItems = searchData.artists?.items || [];

  // CRÍTICO: Verificar que el artista encontrado coincide con el buscado
  // Normalizar para comparación (minúsculas, sin acentos básicos)
  const normalize = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  
  const searchedNorm = normalize(artist);
  
  // Buscar el artista que mejor coincida
  let foundArtist = artistItems.find((a: any) => {
    const nameNorm = normalize(a.name);
    // Coincidencia exacta o muy cercana
    return nameNorm === searchedNorm || 
           nameNorm.includes(searchedNorm) || 
           searchedNorm.includes(nameNorm);
  });
  
  // Si no encontramos coincidencia exacta, intentar con el primero pero verificar similitud
  if (!foundArtist && artistItems.length > 0) {
    const firstArtist = artistItems[0];
    const firstNorm = normalize(firstArtist.name);
    
    // Solo aceptar si hay al menos 50% de similitud
    const similarity = (a: string, b: string) => {
      const longer = a.length > b.length ? a : b;
      const shorter = a.length > b.length ? b : a;
      if (longer.length === 0) return 1.0;
      const matches = shorter.split('').filter((c, i) => longer[i] === c).length;
      return matches / longer.length;
    };
    
    if (similarity(searchedNorm, firstNorm) > 0.5) {
      foundArtist = firstArtist;
      console.log(`[GET_ARTIST_TRACKS] Accepted similar artist: "${firstArtist.name}" for search "${artist}"`);
    } else {
      console.warn(`[GET_ARTIST_TRACKS] ❌ Rejected "${firstArtist.name}" - too different from "${artist}"`);
    }
  }

  if (!foundArtist) {
    console.warn(`[GET_ARTIST_TRACKS] Artist not found or no match: "${artist}"`);
    // Intentar búsqueda directa de tracks en vez de artista
    return await searchTracksByName(accessToken, artist, limit);
  }

  console.log(`[GET_ARTIST_TRACKS] ✅ Found artist: ${foundArtist.name} (${foundArtist.id})`);

  // 2. Obtener top tracks si only_popular
  if (only_popular) {
    const topResponse = await fetch(
      `https://api.spotify.com/v1/artists/${foundArtist.id}/top-tracks?market=ES`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (topResponse.ok) {
      const topData = await topResponse.json();
      tracks.push(...(topData.tracks || []).slice(0, limit).map(normalizeTrack));
    }
  } else {
    // Normalizar nombre del artista encontrado para comparaciones
    const foundArtistLower = foundArtist.name.toLowerCase();
    const foundArtistId = foundArtist.id;
    
    // 3. PRIMERO: Top tracks del artista (más confiable)
    const topResponse = await fetch(
      `https://api.spotify.com/v1/artists/${foundArtistId}/top-tracks?market=ES`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (topResponse.ok) {
      const topData = await topResponse.json();
      for (const track of (topData.tracks || [])) {
        if (tracks.length >= limit) break;
        tracks.push(normalizeTrack(track));
      }
      console.log(`[GET_ARTIST_TRACKS] Got ${tracks.length} top tracks`);
    }
    
    // 4. Si necesitamos más, buscar por artista
    if (tracks.length < limit) {
      const tracksResponse = await fetch(
        `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(foundArtist.name)}&type=track&limit=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (tracksResponse.ok) {
        const tracksData = await tracksResponse.json();
        const rawTracks = tracksData.tracks?.items || [];

        for (const track of rawTracks) {
          if (tracks.length >= limit) break;
          
          // CRÍTICO: Verificar que el artista encontrado está en el track por ID o nombre
          const trackArtistIds = track.artists.map((a: any) => a.id);
          const trackArtistNames = track.artists.map((a: any) => a.name.toLowerCase());
          
          const hasArtistById = trackArtistIds.includes(foundArtistId);
          const hasArtistByName = trackArtistNames.includes(foundArtistLower);
          
          if (!hasArtistById && !hasArtistByName) {
            continue; // Saltar si el artista no está en el track
          }
          
          const isMainArtist = trackArtistNames[0] === foundArtistLower || trackArtistIds[0] === foundArtistId;
          const isCollaboration = !isMainArtist;

          // Evitar duplicados
          const isDuplicate = tracks.some(t => t.id === track.id);
          
          if (!isDuplicate && (isMainArtist || (include_collaborations && isCollaboration))) {
            tracks.push(normalizeTrack(track));
          }
        }
      }
    }
    
    // 5. Si aún faltan, intentar albums del artista
    if (tracks.length < limit) {
      const albumsResponse = await fetch(
        `https://api.spotify.com/v1/artists/${foundArtistId}/albums?include_groups=album,single&limit=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (albumsResponse.ok) {
        const albumsData = await albumsResponse.json();
        const albums = albumsData.items || [];
        
        for (const album of albums) {
          if (tracks.length >= limit) break;
          
          const albumTracksResponse = await fetch(
            `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=10`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (albumTracksResponse.ok) {
            const albumTracksData = await albumTracksResponse.json();
            for (const track of (albumTracksData.items || [])) {
              if (tracks.length >= limit) break;
              const isDuplicate = tracks.some(t => t.id === track.id);
              if (!isDuplicate) {
                // Los tracks de albums no traen toda la info, añadir lo básico
                tracks.push({
                  id: track.id,
                  name: track.name,
                  artists: track.artists?.map((a: any) => ({ name: a.name, id: a.id })) || [],
                  uri: track.uri
                });
              }
            }
          }
        }
      }
    }
  }

  console.log(`[GET_ARTIST_TRACKS] Found ${tracks.length} tracks for "${artist}"`);
  return tracks.slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════
// HERRAMIENTA 2: get_collaborations
// ═══════════════════════════════════════════════════════════════

async function executeGetCollaborations(
  accessToken: string,
  params: {
    main_artist: string;
    must_collaborate_with: string[];
    limit?: number;
  }
): Promise<Track[]> {
  const { main_artist, must_collaborate_with, limit = 10 } = params;
  const tracks: Track[] = [];
  const usedTrackIds = new Set<string>();

  console.log(`[GET_COLLABORATIONS] Searching: "${main_artist}" with [${must_collaborate_with.join(', ')}]`);

  // Normalizar nombres para comparación
  const normalize = (s: string) => s.toLowerCase().trim();
  const mainArtistLower = normalize(main_artist);
  const collaboratorsLower = must_collaborate_with.map(a => normalize(a));

  // ESTRATEGIA 1: Buscar específicamente por cada colaborador
  // "D.valentino Mvrk", "D.valentino Lucho RK", etc.
  for (const collaborator of must_collaborate_with) {
    if (tracks.length >= limit) break;
    
    const queries = [
      `${main_artist} ${collaborator}`,
      `${main_artist} feat ${collaborator}`,
      `${main_artist} feat. ${collaborator}`,
      `${collaborator} ${main_artist}`,
      `${collaborator} feat ${main_artist}`,
      `${collaborator} feat. ${main_artist}`,
      `artist:"${main_artist}" artist:"${collaborator}"`,
    ];
    
    for (const query of queries) {
      if (tracks.length >= limit) break;
      
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const rawTracks = searchData.tracks?.items || [];

        for (const track of rawTracks) {
          if (tracks.length >= limit) break;
          if (usedTrackIds.has(track.id)) continue;
          
          const artistNames = track.artists.map((a: any) => normalize(a.name));
          
          // Verificar que AMBOS artistas están en el track
          const hasMainArtist = artistNames.includes(mainArtistLower);
          const hasCollaborator = artistNames.some(name => 
            collaboratorsLower.some(collab => name.includes(collab) || collab.includes(name))
          );

          if (hasMainArtist && hasCollaborator) {
            usedTrackIds.add(track.id);
            tracks.push(normalizeTrack(track));
            console.log(`[GET_COLLABORATIONS] ✅ Found: "${track.name}" by ${track.artists.map((a: any) => a.name).join(', ')}`);
          }
        }
      }
    }
  }

  // ESTRATEGIA 2: Buscar tracks del artista principal y filtrar
  if (tracks.length < limit) {
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(main_artist)}"&type=track&limit=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const rawTracks = searchData.tracks?.items || [];

      for (const track of rawTracks) {
        if (tracks.length >= limit) break;
        if (usedTrackIds.has(track.id)) continue;
        
        const artistNames = track.artists.map((a: any) => normalize(a.name));
        
        // Verificar que el artista principal está en el track
        const hasMainArtist = artistNames.includes(mainArtistLower);
        if (!hasMainArtist) continue;

        // Verificar que al menos uno de los colaboradores está en el track
        const hasCollaborator = artistNames.some(name => 
          collaboratorsLower.some(collab => name.includes(collab) || collab.includes(name))
        );

        if (hasCollaborator) {
          usedTrackIds.add(track.id);
          tracks.push(normalizeTrack(track));
          console.log(`[GET_COLLABORATIONS] ✅ Found: "${track.name}" by ${track.artists.map((a: any) => a.name).join(', ')}`);
        }
      }
    }
  }

  // ESTRATEGIA 3: Buscar desde el otro lado (colaborador feat. principal)
  if (tracks.length < limit) {
    for (const collaborator of must_collaborate_with) {
      if (tracks.length >= limit) break;
      
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(collaborator)}"&type=track&limit=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const rawTracks = searchData.tracks?.items || [];

        for (const track of rawTracks) {
          if (tracks.length >= limit) break;
          if (usedTrackIds.has(track.id)) continue;
          
          const artistNames = track.artists.map((a: any) => normalize(a.name));
          
          // Verificar que AMBOS están presentes
          const hasMainArtist = artistNames.some(name => 
            name.includes(mainArtistLower) || mainArtistLower.includes(name)
          );
          const hasCollaborator = artistNames.some(name => 
            normalize(collaborator) === name || name.includes(normalize(collaborator))
          );

          if (hasMainArtist && hasCollaborator) {
            usedTrackIds.add(track.id);
            tracks.push(normalizeTrack(track));
            console.log(`[GET_COLLABORATIONS] ✅ Found (reverse): "${track.name}" by ${track.artists.map((a: any) => a.name).join(', ')}`);
          }
        }
      }
    }
  }

  console.log(`[GET_COLLABORATIONS] ✅ Total found: ${tracks.length} collaborations`);
  return tracks;
}

// ═══════════════════════════════════════════════════════════════
// HERRAMIENTA 3: get_similar_style
// ═══════════════════════════════════════════════════════════════

async function executeGetSimilarStyle(
  accessToken: string,
  params: {
    seed_artists: string[];
    limit?: number;
    include_seed_artists?: boolean;
    style_modifier?: string;
  },
  bannedArtists?: Set<string>
): Promise<Track[]> {
  const { seed_artists, limit = 20, include_seed_artists = false } = params;
  const tracks: Track[] = [];
  const artistIds: string[] = [];
  const foundSimilarArtists = new Set<string>(); // Artistas similares encontrados (para búsqueda adicional)
  const usedTrackIdsForCollabs = new Set<string>(); // IDs de tracks ya usados en búsqueda de colaboraciones

  console.log(`[GET_SIMILAR_STYLE] ===== START =====`);
  console.log(`[GET_SIMILAR_STYLE] Seeds: [${seed_artists.join(', ')}], limit: ${limit}`);
  console.log(`[GET_SIMILAR_STYLE] Include seed artists: ${include_seed_artists}`);
  console.log(`[GET_SIMILAR_STYLE] Banned artists: [${bannedArtists ? Array.from(bannedArtists).join(', ') : 'none'}]`);

  // 1. Resolver IDs de artistas semilla
  for (const artistName of seed_artists.slice(0, 5)) {
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchResponse.ok) {
      const data = await searchResponse.json();
      const artist = data.artists?.items?.[0];
      if (artist) {
        artistIds.push(artist.id);
        console.log(`[GET_SIMILAR_STYLE] Resolved: "${artistName}" → ${artist.id}`);
      }
    }
  }

  if (artistIds.length === 0) {
    console.warn(`[GET_SIMILAR_STYLE] No artists resolved`);
    return [];
  }

  // 2. PRIMERO: Buscar colaboraciones directas del artista semilla (colaboradores nivel 1)
  // Esto es crítico para casos "estilo de X pero sin X" - encontrar artistas que colaboran con X
  console.log(`[GET_SIMILAR_STYLE] 🔍 STEP 1: Searching direct collaborations from seed artists...`);
  const collaboratorsLevel1 = new Set<string>(); // Artistas que colaboran directamente con los seeds
  
  for (const seedArtistId of artistIds.slice(0, 3)) {
    if (tracks.length >= limit) break;
    
    // Buscar top tracks del seed artist para encontrar colaboradores
    const seedTopTracks = await fetch(
      `https://api.spotify.com/v1/artists/${seedArtistId}/top-tracks?market=ES`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (seedTopTracks.ok) {
      const seedTracksData = await seedTopTracks.json();
      const seedTracks = seedTracksData.tracks || [];
      
      for (const track of seedTracks.slice(0, 20)) {
        const trackArtistNames = track.artists.map((a: any) => a.name.toLowerCase());
        const trackArtistIds = track.artists.map((a: any) => a.id);
        
        // Verificar si el seed artist está en el track
        const hasSeedArtist = trackArtistIds.includes(seedArtistId) || 
                             seed_artists.some(seed => 
                               trackArtistNames.some(name => name.includes(seed.toLowerCase()) || seed.toLowerCase().includes(name))
                             );
        
        if (hasSeedArtist && track.artists.length > 1) {
          // Este track tiene colaboraciones - extraer los otros artistas
          track.artists.forEach((artist: any) => {
            const artistName = artist.name.toLowerCase();
            const artistId = artist.id;
            
            // No incluir el seed artist ni artistas banneados
            const isSeed = seed_artists.some(seed => 
              artistName.includes(seed.toLowerCase()) || seed.toLowerCase().includes(artistName)
            ) || trackArtistIds.includes(seedArtistId);
            
            const isBanned = bannedArtists && bannedArtists.has(artistName);
            
            if (!isSeed && !isBanned) {
              collaboratorsLevel1.add(artist.name); // Guardar nombre original (no lowercase)
              console.log(`[GET_SIMILAR_STYLE] ✅ Found collaborator L1: "${artist.name}" (from seed artist)`);
            }
          });
        }
      }
    }
  }
  
  console.log(`[GET_SIMILAR_STYLE] Found ${collaboratorsLevel1.size} direct collaborators (L1)`);
  
  // 3. Buscar tracks de los colaboradores nivel 1 (artistas que colaboran con X)
  if (collaboratorsLevel1.size > 0 && tracks.length < limit) {
    console.log(`[GET_SIMILAR_STYLE] 🔍 STEP 2: Getting tracks from L1 collaborators...`);
    // Limitar a máximo 8 colaboradores L1 para no hacer demasiadas llamadas API
    const maxL1ToProcess = Math.min(8, Math.ceil(limit / 3));
    const collaboratorsArray = Array.from(collaboratorsLevel1).slice(0, maxL1ToProcess);
    console.log(`[GET_SIMILAR_STYLE] Processing ${collaboratorsArray.length} L1 collaborators (of ${collaboratorsLevel1.size} found)`);
    
    for (const collaboratorName of collaboratorsArray) {
      if (tracks.length >= limit) break;
      
      try {
        // Buscar el artista colaborador
        const collabSearch = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(collaboratorName)}&type=artist&limit=1`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (collabSearch.ok) {
          const collabData = await collabSearch.json();
          const collabArtist = collabData.artists?.items?.[0];
          
          if (collabArtist) {
            // Obtener top tracks del colaborador
            const collabTopTracks = await fetch(
              `https://api.spotify.com/v1/artists/${collabArtist.id}/top-tracks?market=ES`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (collabTopTracks.ok) {
              const collabTracksData = await collabTopTracks.json();
              const collabTracks = (collabTracksData.tracks || [])
                .filter((t: any) => {
                  const trackArtistNames = t.artists.map((a: any) => a.name.toLowerCase());
                  
                  // Excluir seed artists
                  const hasSeedArtist = seed_artists.some(seed => 
                    trackArtistNames.some(name => name.includes(seed.toLowerCase()) || seed.toLowerCase().includes(name))
                  );
                  if (hasSeedArtist) return false;
                  
                  // Filtrar artistas banneados
                  if (bannedArtists && bannedArtists.size > 0) {
                    const hasBannedArtist = trackArtistNames.some(artist => bannedArtists.has(artist));
                    if (hasBannedArtist) return false;
                  }
                  
                  return t.id && !usedTrackIdsForCollabs.has(t.id);
                })
                .slice(0, 5)
                .map(normalizeTrack);
              
              for (const track of collabTracks) {
                if (tracks.length >= limit) break;
                if (!tracks.some(t => t.id === track.id)) {
                  usedTrackIdsForCollabs.add(track.id);
                  tracks.push(track);
                  console.log(`[GET_SIMILAR_STYLE] ✅ Added track from L1 "${collaboratorName}": "${track.name}" (${tracks.length}/${limit})`);
                }
              }
            }
          }
        }
      } catch (collabErr) {
        console.warn(`[GET_SIMILAR_STYLE] Error getting tracks from collaborator ${collaboratorName}:`, collabErr);
      }
    }
  }
  
  // 4. Buscar colaboradores de colaboradores (nivel 2) - colaboradores de los L1
  const collaboratorsLevel2 = new Set<string>();
  if (collaboratorsLevel1.size > 0 && tracks.length < limit) {
    console.log(`[GET_SIMILAR_STYLE] 🔍 STEP 3: Searching L2 collaborators (collaborators of collaborators)...`);
    // Limitar a máximo 5 L1 para buscar L2 (para no hacer demasiadas llamadas)
    const maxL1ForL2 = Math.min(5, Math.ceil(limit / 4));
    const l1Array = Array.from(collaboratorsLevel1).slice(0, maxL1ForL2);
    console.log(`[GET_SIMILAR_STYLE] Processing ${l1Array.length} L1 artists to find L2 collaborators`);
    
    for (const l1Artist of l1Array) {
      if (tracks.length >= limit) break;
      
      try {
        const l1Search = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(l1Artist)}&type=artist&limit=1`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (l1Search.ok) {
          const l1Data = await l1Search.json();
          const l1ArtistObj = l1Data.artists?.items?.[0];
          
          if (l1ArtistObj) {
            const l1TopTracks = await fetch(
              `https://api.spotify.com/v1/artists/${l1ArtistObj.id}/top-tracks?market=ES`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (l1TopTracks.ok) {
              const l1TracksData = await l1TopTracks.json();
              const l1Tracks = l1TracksData.tracks || [];
              
              for (const track of l1Tracks.slice(0, 15)) {
                const trackArtistNames = track.artists.map((a: any) => a.name.toLowerCase());
                
                // Encontrar otros artistas en las colaboraciones del L1
                track.artists.forEach((artist: any) => {
                  const artistName = artist.name.toLowerCase();
                  const isL1 = collaboratorsLevel1.has(artist.name);
                  const isSeed = seed_artists.some(seed => 
                    artistName.includes(seed.toLowerCase()) || seed.toLowerCase().includes(artistName)
                  );
                  const isBanned = bannedArtists && bannedArtists.has(artistName);
                  
                  if (!isL1 && !isSeed && !isBanned && track.artists.length > 1) {
                    collaboratorsLevel2.add(artist.name);
                    console.log(`[GET_SIMILAR_STYLE] ✅ Found collaborator L2: "${artist.name}" (from L1 "${l1Artist}")`);
                  }
                });
              }
            }
          }
        }
      } catch (l2Err) {
        console.warn(`[GET_SIMILAR_STYLE] Error searching L2 for ${l1Artist}:`, l2Err);
      }
    }
    
    console.log(`[GET_SIMILAR_STYLE] Found ${collaboratorsLevel2.size} L2 collaborators`);
    
    // Obtener tracks de los L2
    if (collaboratorsLevel2.size > 0 && tracks.length < limit) {
      // Limitar a máximo 6 L2 para no hacer demasiadas llamadas
      const maxL2ToProcess = Math.min(6, Math.ceil((limit - tracks.length) / 2));
      const l2Array = Array.from(collaboratorsLevel2).slice(0, maxL2ToProcess);
      console.log(`[GET_SIMILAR_STYLE] Processing ${l2Array.length} L2 collaborators (of ${collaboratorsLevel2.size} found) to get tracks`);
      
      for (const l2Artist of l2Array) {
        if (tracks.length >= limit) break;
        
        try {
          const l2Search = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(l2Artist)}&type=artist&limit=1`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (l2Search.ok) {
            const l2Data = await l2Search.json();
            const l2ArtistObj = l2Data.artists?.items?.[0];
            
            if (l2ArtistObj) {
              const l2TopTracks = await fetch(
                `https://api.spotify.com/v1/artists/${l2ArtistObj.id}/top-tracks?market=ES`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              
              if (l2TopTracks.ok) {
                const l2TracksData = await l2TopTracks.json();
                const l2Tracks = (l2TracksData.tracks || [])
                  .filter((t: any) => {
                    const trackArtistNames = t.artists.map((a: any) => a.name.toLowerCase());
                    
                    // Excluir seed artists y L1
                    const hasSeedOrL1 = seed_artists.some(seed => 
                      trackArtistNames.some(name => name.includes(seed.toLowerCase()) || seed.toLowerCase().includes(name))
                    ) || trackArtistNames.some(name => 
                      Array.from(collaboratorsLevel1).some(l1 => name.includes(l1.toLowerCase()) || l1.toLowerCase().includes(name))
                    );
                    if (hasSeedOrL1) return false;
                    
                    // Filtrar artistas banneados
                    if (bannedArtists && bannedArtists.size > 0) {
                      const hasBannedArtist = trackArtistNames.some(artist => bannedArtists.has(artist));
                      if (hasBannedArtist) return false;
                    }
                    
                    return t.id && !usedTrackIdsForCollabs.has(t.id);
                  })
                  .slice(0, 3)
                  .map(normalizeTrack);
                
                for (const track of l2Tracks) {
                  if (tracks.length >= limit) break;
                  if (!tracks.some(t => t.id === track.id)) {
                    usedTrackIdsForCollabs.add(track.id);
                    tracks.push(track);
                    console.log(`[GET_SIMILAR_STYLE] ✅ Added track from L2 "${l2Artist}": "${track.name}" (${tracks.length}/${limit})`);
                  }
                }
              }
            }
          }
        } catch (l2TrackErr) {
          console.warn(`[GET_SIMILAR_STYLE] Error getting tracks from L2 ${l2Artist}:`, l2TrackErr);
        }
      }
    }
  }

  // 5. Obtener recomendaciones de Spotify (múltiples llamadas para más variedad)
  // Esto se hace DESPUÉS de buscar colaboraciones para complementar
  const maxRecommendations = Math.min(limit * 3, 100); // Aumentar a 3x el límite
  const seedArtists = artistIds.slice(0, 5).join(',');
  
  // Primera llamada con todos los seeds
  const recsResponse = await fetch(
    `https://api.spotify.com/v1/recommendations?seed_artists=${seedArtists}&limit=${maxRecommendations}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (recsResponse.ok) {
    const recsData = await recsResponse.json();
    const recTracks = recsData.tracks || [];

    for (const track of recTracks) {
      const trackArtistIds = track.artists.map((a: any) => a.id);
      const trackArtistNames = track.artists.map((a: any) => a.name.toLowerCase());
      const isSeedArtist = trackArtistIds.some((id: string) => artistIds.includes(id));
      
      // Filtrar por nombre también (por si el ID no coincide pero el nombre sí)
      const isSeedArtistByName = seed_artists.some(seed => 
        trackArtistNames.some(name => name.includes(seed.toLowerCase()) || seed.toLowerCase().includes(name))
      );

      // Filtrar artistas banneados (incluyendo colaboraciones)
      if (bannedArtists && bannedArtists.size > 0) {
        const hasBannedArtist = trackArtistNames.some(artist => bannedArtists.has(artist));
        if (hasBannedArtist) {
          const bannedFound = trackArtistNames.filter(artist => bannedArtists.has(artist));
          console.log(`[GET_SIMILAR_STYLE] ⚠️ SKIP: "${track.name}" by [${track.artists.map((a: any) => a.name).join(', ')}]`);
          console.log(`[GET_SIMILAR_STYLE] ⚠️ REASON: Contains banned: [${bannedFound.join(', ')}]`);
          continue;
        }
      }

      if (include_seed_artists || (!isSeedArtist && !isSeedArtistByName)) {
        // Solo añadir si no está ya en tracks (evitar duplicados de colaboraciones)
        if (!tracks.some(t => t.id === track.id) && !usedTrackIdsForCollabs.has(track.id)) {
        tracks.push(normalizeTrack(track));
          // Guardar artistas similares encontrados para buscar sus colaboraciones (si aún necesitamos más)
          if (tracks.length < limit) {
        trackArtistNames.forEach(name => {
          if (!seed_artists.some(s => name.includes(s.toLowerCase()) || s.toLowerCase().includes(name))) {
                // No añadir si ya está en L1 o L2
                const isL1 = Array.from(collaboratorsLevel1).some(l1 => 
                  name.includes(l1.toLowerCase()) || l1.toLowerCase().includes(name)
                );
                const isL2 = Array.from(collaboratorsLevel2).some(l2 => 
                  name.includes(l2.toLowerCase()) || l2.toLowerCase().includes(name)
                );
                if (!isL1 && !isL2) {
            foundSimilarArtists.add(name);
                }
          }
        });
          }
        }
      }

      if (tracks.length >= limit) break;
    }
    
    // 6. Buscar tracks adicionales de artistas similares encontrados en recomendaciones (complemento)
    // Esto es adicional a las colaboraciones L1/L2 que ya buscamos arriba
    if (tracks.length < limit && foundSimilarArtists.size > 0) {
      console.log(`[GET_SIMILAR_STYLE] 🔍 STEP 4: Getting additional tracks from ${foundSimilarArtists.size} similar artists (from recommendations)...`);
      const similarArtistsArray = Array.from(foundSimilarArtists).slice(0, 10);
      
      for (const similarArtist of similarArtistsArray) {
        if (tracks.length >= limit) break;
        
        // Buscar top tracks del artista similar
        const similarArtistSearch = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(similarArtist)}&type=artist&limit=1`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (similarArtistSearch.ok) {
          const similarData = await similarArtistSearch.json();
          const similarArtistObj = similarData.artists?.items?.[0];
          if (similarArtistObj) {
            const similarTopTracks = await fetch(
              `https://api.spotify.com/v1/artists/${similarArtistObj.id}/top-tracks?market=ES`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (similarTopTracks.ok) {
              const similarTracksData = await similarTopTracks.json();
              const similarTracks = (similarTracksData.tracks || [])
                .filter((t: any) => {
                  const trackArtistNames = t.artists.map((a: any) => a.name.toLowerCase());
                  // Excluir seed artists
                  const hasSeedArtist = seed_artists.some(seed => 
                    trackArtistNames.some(name => name.includes(seed.toLowerCase()) || seed.toLowerCase().includes(name))
                  );
                  if (hasSeedArtist) return false;
                  
                  // Filtrar artistas banneados (incluyendo colaboraciones)
                  if (bannedArtists && bannedArtists.size > 0) {
                    const hasBannedArtist = trackArtistNames.some(artist => bannedArtists.has(artist));
                    if (hasBannedArtist) return false;
                  }
                  
                  return t.id && !usedTrackIdsForCollabs.has(t.id) && !tracks.some(tr => tr.id === t.id);
                })
                .slice(0, 3)
                .map(normalizeTrack);
              
              for (const track of similarTracks) {
                if (tracks.length >= limit) break;
                if (!tracks.some(t => t.id === track.id)) {
                  usedTrackIdsForCollabs.add(track.id);
                  tracks.push(track);
                  console.log(`[GET_SIMILAR_STYLE] ✅ Added track from similar "${similarArtist}": "${track.name}" (${tracks.length}/${limit})`);
                }
              }
            }
          }
        }
      }
    }
  }

  // 7. Si include_seed_artists, añadir top tracks de los seeds (solo si se solicita explícitamente)
  if (include_seed_artists && tracks.length < limit) {
    for (const artistId of artistIds) {
      if (tracks.length >= limit) break;

      const topResponse = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=ES`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (topResponse.ok) {
        const topData = await topResponse.json();
        const topTracks = (topData.tracks || []).slice(0, 5);
        for (const track of topTracks) {
          if (tracks.length >= limit) break;
          if (!tracks.some(t => t.id === track.id)) {
            tracks.push(normalizeTrack(track));
          }
        }
      }
    }
  }

  console.log(`[GET_SIMILAR_STYLE] ===== END =====`);
  console.log(`[GET_SIMILAR_STYLE] 📊 SUMMARY:`);
  console.log(`[GET_SIMILAR_STYLE]   - L1 Collaborators found: ${collaboratorsLevel1.size}`);
  console.log(`[GET_SIMILAR_STYLE]   - L2 Collaborators found: ${collaboratorsLevel2.size}`);
  console.log(`[GET_SIMILAR_STYLE]   - Similar artists from recommendations: ${foundSimilarArtists.size}`);
  console.log(`[GET_SIMILAR_STYLE]   - Total tracks found: ${tracks.length} (returning ${Math.min(tracks.length, limit)})`);
  return tracks.slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════
// HERRAMIENTA 4: generate_creative_tracks
// ═══════════════════════════════════════════════════════════════

async function executeGenerateCreativeTracks(
  accessToken: string,
  params: {
    mood?: string;
    theme?: string;
    genre?: string;
    era?: string;
    count?: number;
    artists_to_include?: string[];
    artists_to_exclude?: string[];
  },
  bannedArtists?: Set<string>
): Promise<Track[]> {
  const { 
    mood, 
    theme, 
    genre, 
    era, 
    count = 30,
    artists_to_include = [],
    artists_to_exclude = []
  } = params;

  console.log(`[GENERATE_CREATIVE] ===== START =====`);
  console.log(`[GENERATE_CREATIVE] mood=${mood}, theme=${theme}, genre=${genre}, era=${era}, count=${count}`);
  console.log(`[GENERATE_CREATIVE] artists_to_include: [${artists_to_include.join(', ')}]`);
  console.log(`[GENERATE_CREATIVE] artists_to_exclude: [${artists_to_exclude.join(', ')}]`);
  console.log(`[GENERATE_CREATIVE] Banned artists: [${bannedArtists ? Array.from(bannedArtists).join(', ') : 'none'}]`);

  const tracks: Track[] = [];
  
  // Detectar si se pide en español (necesario para queries y LLM)
  const isSpanish = theme?.toLowerCase().includes('español') || 
                   theme?.toLowerCase().includes('espanol') ||
                   theme?.toLowerCase().includes('española') ||
                   theme?.toLowerCase().includes('espanola') ||
                   mood?.toLowerCase().includes('español') ||
                   mood?.toLowerCase().includes('espanol');
  
  // Detectar si es un festival - NO usar generate_creative_tracks para festivales
  const isFestival = theme?.toLowerCase().includes('festival') || 
                    theme?.toLowerCase().match(/\b(festival|coachella|glastonbury|primavera|mad cool|bbk|fiberfib|sonar)\b/i);
  
  if (isFestival) {
    console.warn(`[GENERATE_CREATIVE] ⚠️ Festival detected in theme: "${theme}". This should use search_playlists instead! Returning empty to avoid incorrect songs.`);
    return []; // NO generar canciones inventadas para festivales
  }
  
  // Detectar si se pide underground - usar SOLO la lista oficial de artistas underground españoles
  const isUnderground = theme?.toLowerCase().includes('underground') || 
                        mood?.toLowerCase().includes('underground') ||
                        genre?.toLowerCase().includes('underground');
  
  // Obtener lista oficial de artistas underground españoles
  const undergroundArtists = isUnderground ? (MUSICAL_CONTEXTS.underground_es?.compass || []) : [];
  const undergroundArtistsLower = new Set(undergroundArtists.map(a => a.toLowerCase()));
  
  // Lista de artistas mainstream a excluir cuando se pide underground
  const mainstreamArtists = new Set([
    'bad bunny', 'j balvin', 'maluma', 'ozuna', 'karol g', 'daddy yankee',
    'wisin', 'yandel', 'don omar', 'nicky jam', 'anuel aa', 'myke towers',
    'rauw alejandro', 'jhayco', 'feid', 'sech', 'manuel turizo', 'camilo',
    'sebastian yatra', 'morat', 'rosalía', 'c. tangana', 'aitana', 'lola indigo',
    'natalia lacunza', 'nicki nicole', 'tiago pzk', 'maria becerra', 'duki',
    'paulo londra', 'trueno', 'lit killah', 'bizarrap', 'quevedo',
    'kendrick lamar', 'eminem', 'drake', 'imagine dragons', 'nirvana', 'billie eilish',
    'calvin harris', 'sza', 'rihanna', 'foo fighters'
  ]);
  
  // Si el tema incluye "clásicos" o hay una era específica, usar LLM para generar lista real
  const isClassics = theme?.toLowerCase().includes('clásico') || 
                     theme?.toLowerCase().includes('clasico') ||
                     theme?.toLowerCase().includes('classic') ||
                     theme?.toLowerCase().includes('hits atemporales') ||
                     theme?.toLowerCase().includes('icónicas');
  
  if (isClassics || era) {
    console.log(`[GENERATE_CREATIVE] Using LLM to generate ${isClassics ? 'classics' : 'era-specific'} tracks${isSpanish ? ' (Spanish)' : ''}`);
    
    try {
      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const prompt = `Generate a list of ${count} real, well-known ${isClassics ? 'classic' : era ? `${era} ` : ''}songs${genre ? ` in the genres: ${genre}` : ''}${theme ? ` that match: ${theme}` : ''}. 
Return ONLY a JSON object with this exact format:
{
  "tracks": [
    {"title": "Song Title", "artist": "Artist Name"},
    ...
  ]
}

${era ? `Focus on songs from ${era}.` : ''}
${isClassics ? 'These should be iconic, timeless hits that everyone knows. Include songs from 60s, 70s, 80s, 90s. Examples: "Bohemian Rhapsody" by Queen, "Hotel California" by Eagles, "Billie Jean" by Michael Jackson, "Sweet Child O\' Mine" by Guns N\' Roses.' : ''}
${genre ? `Genres: ${genre}` : ''}
${artists_to_include.length > 0 ? `Must include at least some songs from: ${artists_to_include.join(', ')}` : ''}
${artists_to_exclude.length > 0 ? `Do NOT include songs from: ${artists_to_exclude.join(', ')}` : ''}

IMPORTANT: Respect the theme and any constraints exactly (including language, \"without X\", \"only Y\", \"half in Spanish and half in English\", etc.). 
You must NOT invent new constraints: just follow what the user asked in the theme text.

Return ONLY the JSON object, no other text.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a music expert. Return ONLY valid JSON with a "tracks" array of song objects.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        const llmTracks = parsed.tracks || parsed.songs || (Array.isArray(parsed) ? parsed : []);
        
        console.log(`[GENERATE_CREATIVE] LLM generated ${llmTracks.length} track suggestions`);
        
        // Resolver tracks reales en Spotify
        for (const llmTrack of llmTracks.slice(0, count)) {
          if (tracks.length >= count) break;
          
          const searchQuery = `track:"${llmTrack.title}" artist:"${llmTrack.artist}"`;
          const searchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const foundTrack = searchData.tracks?.items?.[0];
            if (foundTrack && !tracks.some(t => t.id === foundTrack.id)) {
              tracks.push(normalizeTrack(foundTrack));
            }
          }
        }
      }
    } catch (llmError) {
      console.error('[GENERATE_CREATIVE] LLM generation failed, falling back to search:', llmError);
    }
  }

  // Si aún faltan tracks o no usamos LLM, hacer búsquedas inteligentes
  if (tracks.length < count) {
    const queries: string[] = [];
    
    // Para clásicos, usar queries específicas de época
    if (isClassics || era) {
      if (isSpanish) {
        // Queries específicas para clásicos en español
        if (era) {
          queries.push(`${era} español`, `${era} español hits`, `${era} latino`, `${era} ${genre || 'español'}`);
        } else {
          queries.push('clásicos español', 'hits español', 'clásicos latino', 'música española clásica', 'pop español clásico');
        }
      } else {
        if (era) {
          queries.push(`${era} hits`, `${era} classics`, `${era} ${genre || 'music'}`);
        } else {
          queries.push('classic rock hits', '80s pop hits', '70s soul classics', '90s pop hits');
        }
      }
    } else {
      // Construir queries basadas en los parámetros
      // IMPORTANTE: Para géneros, buscar playlists o usar "genre:" en vez de buscar el nombre literal
      if (genre) {
        // NO buscar géneros directamente como queries de tracks - buscar artistas del género en su lugar
        // Esto evita encontrar tracks con nombres como "reggaeton"
        const genreTerms = genre.split(',').map(g => g.trim());
        // En vez de queries, buscaremos artistas del género más abajo
        console.log(`[GENERATE_CREATIVE] Genre detected: ${genreTerms.join(', ')}, will search artists instead of tracks`);
      }
      if (mood) {
        queries.push(...mood.split(',').map(m => `${m.trim()} music`));
      }
      if (theme) {
        // Solo añadir theme si no es un género (para evitar buscar "reggaeton" como nombre de canción)
        const themeLower = theme.toLowerCase();
        const isGenreName = ['reggaeton', 'reggae', 'hip hop', 'rap', 'pop', 'rock', 'jazz', 'blues', 'country', 'electronic', 'dance', 'latin', 'salsa', 'bachata', 'merengue'].some(g => themeLower.includes(g));
        if (!isGenreName) {
          queries.push(theme);
        }
      }
    }

    // Buscar tracks de artistas específicos mencionados (PRIORIDAD ALTA)
    // Detectar si se pide "old", "og", "viejo" para buscar tracks más antiguos
    const promptLower = (theme || mood || '').toLowerCase();
    const wantsOld = promptLower.includes('old') || promptLower.includes('og') || 
                     promptLower.includes('viejo') || promptLower.includes('antiguo') ||
                     promptLower.includes('antigua');
    
    // Calcular cuántos tracks buscar por artista prioritario (más si son pocos artistas)
    const tracksPerPriorityArtist = Math.min(20, Math.ceil(count / Math.max(1, artists_to_include.length)));
    
    for (const artist of artists_to_include) {
      if (tracks.length >= count) break;
      
      try {
        // Buscar el artista primero
        const artistSearchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(artist)}"&type=artist&limit=1`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (artistSearchResponse.ok) {
          const artistData = await artistSearchResponse.json();
          const foundArtist = artistData.artists?.items?.[0];
          
          if (foundArtist) {
            let artistTracks: any[] = [];
            
            if (wantsOld) {
              // Buscar tracks más antiguos: usar albums y ordenar por fecha
              const albumsResponse = await fetch(
                `https://api.spotify.com/v1/artists/${foundArtist.id}/albums?include_groups=album,single&market=ES&limit=50`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              
              if (albumsResponse.ok) {
                const albumsData = await albumsResponse.json();
                const albums = (albumsData.items || [])
                  .sort((a: any, b: any) => {
                    // Ordenar por fecha de lanzamiento (más antiguos primero)
                    const dateA = new Date(a.release_date || '1900-01-01').getTime();
                    const dateB = new Date(b.release_date || '1900-01-01').getTime();
                    return dateA - dateB;
                  })
                  .slice(0, 10); // Primeros 10 álbumes más antiguos
                
                // Obtener tracks de estos álbumes antiguos
                for (const album of albums) {
                  if (artistTracks.length >= tracksPerPriorityArtist) break;
                  
                  const albumTracksResponse = await fetch(
                    `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                  );
                  
                  if (albumTracksResponse.ok) {
                    const albumTracksData = await albumTracksResponse.json();
                    const albumTracks = (albumTracksData.items || [])
                      .filter((t: any) => {
                        const trackArtists = t.artists?.map((a: any) => a.name.toLowerCase()) || [];
                        return trackArtists.includes(artist.toLowerCase());
                      });
                    artistTracks.push(...albumTracks);
                  }
                }
              }
            } else {
              // Búsqueda normal: top tracks + búsqueda adicional
              const topTracksResponse = await fetch(
                `https://api.spotify.com/v1/artists/${foundArtist.id}/top-tracks?market=ES`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              
              if (topTracksResponse.ok) {
                const topTracksData = await topTracksResponse.json();
                artistTracks = topTracksData.tracks || [];
              }
              
              // Si necesitamos más tracks, buscar adicionales
              if (artistTracks.length < tracksPerPriorityArtist) {
                const searchResponse = await fetch(
                  `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(artist)}"&type=track&limit=${tracksPerPriorityArtist}&offset=${artistTracks.length}`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  const additionalTracks = (searchData.tracks?.items || [])
                    .filter((t: any) => {
                      const trackArtists = t.artists?.map((a: any) => a.name.toLowerCase()) || [];
                      return trackArtists.includes(artist.toLowerCase());
                    });
                  artistTracks.push(...additionalTracks);
                }
              }
            }
            
            // Filtrar y normalizar tracks
            const filteredTracks = artistTracks
              .filter((t: any) => {
                const trackArtists = (t.artists || []).map((a: any) => a.name.toLowerCase());
                // Filtrar artistas excluidos
                if (artists_to_exclude.some(ex => trackArtists.includes(ex.toLowerCase()))) return false;
                // Filtrar artistas banneados
                if (bannedArtists && bannedArtists.size > 0) {
                  const hasBannedArtist = trackArtists.some(a => bannedArtists.has(a));
                  if (hasBannedArtist) return false;
                }
                // Si se pide underground, el artista principal DEBE estar en la lista
                if (isUnderground) {
                  const mainArtist = trackArtists[0];
                  if (!undergroundArtistsLower.has(mainArtist)) {
                    console.log(`[GENERATE_CREATIVE] ⚠️ FILTERED OUT: "${t.name}" - main artist "${mainArtist}" not in underground list`);
                    return false;
                  }
                  // Permitir colaboraciones si el artista principal es underground
                }
                return t.id && !tracks.some(tr => tr.id === t.id);
              })
              .slice(0, tracksPerPriorityArtist)
              .map(normalizeTrack);
            
            tracks.push(...filteredTracks);
            console.log(`[GENERATE_CREATIVE] ✅ Found ${filteredTracks.length} tracks for priority artist "${artist}"${wantsOld ? ' (old tracks)' : ''}`);
          }
        }
      } catch (artistError) {
        console.warn(`[GENERATE_CREATIVE] Error getting tracks for ${artist}:`, artistError);
      }
    }

    // Si se pide underground, usar SOLO la lista oficial de artistas underground españoles
    if (isUnderground && undergroundArtists.length > 0) {
      console.log(`[GENERATE_CREATIVE] ⚠️ UNDERGROUND detected! Using ONLY official underground_es artists list (${undergroundArtists.length} artists)`);
      
      // Usar SOLO artistas de la lista oficial
      const artistsToUse = undergroundArtists.filter(artist => {
        const artistLower = artist.toLowerCase();
        // Excluir artistas banneados
        if (bannedArtists && bannedArtists.has(artistLower)) return false;
        // Excluir artistas en artists_to_exclude
        if (artists_to_exclude.some(ex => ex.toLowerCase() === artistLower)) return false;
        return true;
      });
      
      console.log(`[GENERATE_CREATIVE] Using ${artistsToUse.length} underground artists from official list`);
      
      // Buscar tracks de estos artistas underground (hasta completar el count)
      for (const artistName of artistsToUse) {
        if (tracks.length >= count) break;
        
        try {
          const artistSearchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(artistName)}"&type=artist&limit=1`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (artistSearchResponse.ok) {
            const artistData = await artistSearchResponse.json();
            const foundArtist = artistData.artists?.items?.[0];
            if (foundArtist) {
              // Obtener top tracks del artista
              const artistTracksResponse = await fetch(
                `https://api.spotify.com/v1/artists/${foundArtist.id}/top-tracks?market=ES`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              
              if (artistTracksResponse.ok) {
                const topTracksData = await artistTracksResponse.json();
                const artistTracks = (topTracksData.tracks || [])
                  .filter((t: any) => {
                    const trackArtistNames = t.artists.map((a: any) => a.name.toLowerCase());
                    // El artista principal (primer artista) DEBE estar en la lista underground
                    const mainArtist = trackArtistNames[0];
                    if (!undergroundArtistsLower.has(mainArtist)) {
                      return false; // El artista principal no está en la lista
                    }
                    // Filtrar colaboraciones con artistas banneados
                    if (bannedArtists && bannedArtists.size > 0) {
                      const hasBannedArtist = trackArtistNames.some(artist => bannedArtists.has(artist));
                      if (hasBannedArtist) return false;
                    }
                    if (artists_to_exclude.some(ex => trackArtistNames.includes(ex.toLowerCase()))) return false;
                    return true; // Aceptar si el artista principal es underground (colaboraciones permitidas)
                  })
                  .slice(0, 5) // Hasta 5 tracks por artista
                  .map(normalizeTrack);
                
                for (const track of artistTracks) {
                  if (tracks.length >= count) break;
                  if (!tracks.some(t => t.id === track.id)) {
                    tracks.push(track);
                  }
                }
              }
              
              // Si aún necesitamos más tracks, buscar más del mismo artista
              if (tracks.length < count) {
                const searchResponse = await fetch(
                  `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(artistName)}"&type=track&limit=20&offset=0`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  const additionalTracks = (searchData.tracks?.items || [])
                    .filter((t: any) => {
                      const trackArtistNames = t.artists.map((a: any) => a.name.toLowerCase());
                      // El artista principal DEBE estar en la lista underground
                      const mainArtist = trackArtistNames[0];
                      if (!undergroundArtistsLower.has(mainArtist)) {
                        return false;
                      }
                      // Filtrar colaboraciones con artistas banneados
                      if (bannedArtists && bannedArtists.size > 0) {
                        const hasBannedArtist = trackArtistNames.some(artist => bannedArtists.has(artist));
                        if (hasBannedArtist) return false;
                      }
                      if (artists_to_exclude.some(ex => trackArtistNames.includes(ex.toLowerCase()))) return false;
                      // No duplicar tracks ya añadidos
                      if (tracks.some(tr => tr.id === t.id)) return false;
                      return true;
                    })
                    .slice(0, 5)
                    .map(normalizeTrack);
                  
                  for (const track of additionalTracks) {
                    if (tracks.length >= count) break;
                    tracks.push(track);
                  }
                }
              }
            }
          }
        } catch (artistError) {
          console.warn(`[GENERATE_CREATIVE] Error getting tracks for ${artistName}:`, artistError);
        }
      }
      
      // Si es underground, NO continuar con LLM ni otras búsquedas - solo usar la lista oficial
      console.log(`[GENERATE_CREATIVE] Underground mode: Found ${tracks.length}/${count} tracks from official list only`);
      return tracks.slice(0, count); // Retornar solo los tracks encontrados de la lista oficial
    }
    
    // Si hay género y faltan tracks, usar LLM para generar lista de artistas del género y luego buscar sus tracks
    // PERO: Si es underground, ya usamos la lista oficial arriba, así que saltamos esto
    if (genre && !isUnderground && tracks.length < count) {
      const genreTerms = genre.split(',').map(g => g.trim());
      console.log(`[GENERATE_CREATIVE] Genre detected: ${genreTerms.join(', ')}, asking LLM for artists of this genre`);
      
      try {
        const openai = new (await import('openai')).default({
          apiKey: process.env.OPENAI_API_KEY
        });
        
        const artistPrompt = `You are a music expert. Given the genre(s): ${genreTerms.join(', ')}, generate a list of ${Math.min(20, (count - tracks.length) * 2)} well-known artists in this genre.
${artists_to_exclude.length > 0 ? `DO NOT include these artists: ${artists_to_exclude.join(', ')}` : ''}
${bannedArtists && bannedArtists.size > 0 ? `DO NOT include these artists: ${Array.from(bannedArtists).join(', ')}` : ''}
${artists_to_include.length > 0 ? `PREFER including these artists if they fit: ${artists_to_include.join(', ')}` : ''}

Return ONLY a JSON object with this exact format:
{
  "artists": ["Artist Name 1", "Artist Name 2", ...]
}

Return ONLY the JSON object, no other text.`;

        const artistCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a music expert. Return ONLY valid JSON with an "artists" array of artist names.' },
            { role: 'user', content: artistPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        });

        const artistContent = artistCompletion.choices[0]?.message?.content;
        if (artistContent) {
          const parsedArtists = JSON.parse(artistContent);
          const llmArtists = parsedArtists.artists || [];
          
          console.log(`[GENERATE_CREATIVE] LLM generated ${llmArtists.length} artists for genre`);
          
          // Buscar tracks de estos artistas
          for (const artistName of llmArtists.slice(0, 15)) {
            if (tracks.length >= count) break;
            
            const artistSearchResponse = await fetch(
              `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(artistName)}"&type=artist&limit=1`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (artistSearchResponse.ok) {
              const artistData = await artistSearchResponse.json();
              const foundArtist = artistData.artists?.items?.[0];
              if (foundArtist) {
                const artistTracksResponse = await fetch(
                  `https://api.spotify.com/v1/artists/${foundArtist.id}/top-tracks?market=ES`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                
                if (artistTracksResponse.ok) {
                  const topTracksData = await artistTracksResponse.json();
                  const artistTracks = (topTracksData.tracks || [])
                    .filter((t: any) => {
                      const trackArtistNames = t.artists.map((a: any) => a.name.toLowerCase());
            // Filtrar colaboraciones con artistas banneados
            if (bannedArtists && bannedArtists.size > 0) {
              const hasBannedArtist = trackArtistNames.some(artist => bannedArtists.has(artist));
              if (hasBannedArtist) {
                const bannedFound = trackArtistNames.filter(artist => bannedArtists.has(artist));
                console.log(`[GENERATE_CREATIVE] ⚠️ SKIP: "${t.name}" - contains banned: [${bannedFound.join(', ')}]`);
                return false;
              }
            }
                      if (artists_to_exclude.some(ex => trackArtistNames.includes(ex.toLowerCase()))) return false;
                      // Si se pide underground, filtrar artistas mainstream
                      if (isUnderground) {
                        const hasMainstream = trackArtistNames.some(a => mainstreamArtists.has(a));
                        if (hasMainstream) {
                          console.log(`[GENERATE_CREATIVE] ⚠️ FILTERED OUT mainstream artist in underground request: "${t.name}" by [${trackArtistNames.join(', ')}]`);
                          return false;
                        }
                      }
                      return true;
                    })
                    .slice(0, 3)
                    .map(normalizeTrack);
                  
                  for (const track of artistTracks) {
                    if (tracks.length >= count) break;
                    if (!tracks.some(t => t.id === track.id)) {
                      tracks.push(track);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (genreError) {
        console.error('[GENERATE_CREATIVE] Error getting artists from LLM for genre:', genreError);
      }
    }
    
    // Buscar por queries de mood/theme (NO géneros como términos directos de búsqueda de tracks)
    const tracksPerQuery = Math.ceil((count - tracks.length) / Math.max(queries.length, 1));
    
    for (const query of queries.slice(0, 5)) {
      if (tracks.length >= count) break;

      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${tracksPerQuery}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (searchResponse.ok) {
        const data = await searchResponse.json();
        const queryTracks = (data.tracks?.items || [])
          .filter((t: any) => {
            const artistNames = t.artists.map((a: any) => a.name.toLowerCase());
            // Filtrar artistas excluidos del params
            if (artists_to_exclude.some(ex => artistNames.includes(ex.toLowerCase()))) return false;
            // Filtrar artistas banneados del contexto (incluyendo colaboraciones)
            if (bannedArtists && bannedArtists.size > 0) {
              const hasBannedArtist = artistNames.some(artist => bannedArtists.has(artist));
              if (hasBannedArtist) {
                const bannedFound = artistNames.filter(artist => bannedArtists.has(artist));
                console.log(`[GENERATE_CREATIVE] ⚠️ SKIP: "${t.name}" - contains banned: [${bannedFound.join(', ')}]`);
                return false;
              }
            }
            return true;
          })
          .map(normalizeTrack);
        
        for (const track of queryTracks) {
          if (tracks.length >= count) break;
          if (!tracks.some(t => t.id === track.id)) {
            tracks.push(track);
          }
        }
      }
    }
  }

  console.log(`[GENERATE_CREATIVE] ===== END =====`);
  console.log(`[GENERATE_CREATIVE] Generated ${tracks.length} tracks (returning ${Math.min(tracks.length, count)})`);
  return tracks.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════
// HERRAMIENTA 5: search_playlists
// ═══════════════════════════════════════════════════════════════

async function executeSearchPlaylists(
  accessToken: string,
  params: {
    query: string;
    limit_playlists?: number;
    tracks_per_playlist?: number;
    min_consensus?: number;
  }
): Promise<Track[]> {
  // Detectar festivales por nombres conocidos (no solo la palabra "festival")
  const queryLower = params.query.toLowerCase();
  const festivalNames = ['riverland', 'coachella', 'glastonbury', 'primavera', 'mad cool', 'madcool', 'bbk', 'fiberfib', 'sonar', 'groove', 'lollapalooza', 'tomorrowland', 'download'];
  const isFestival = queryLower.includes('festival') || 
                    festivalNames.some(name => queryLower.includes(name));
  
  const defaultMinConsensus = isFestival ? 2 : 1;
  
  const { 
    query, 
    limit_playlists = 10,
    tracks_per_playlist = 50,
    min_consensus = params.min_consensus ?? defaultMinConsensus
  } = params;

  console.log(`[SEARCH_PLAYLISTS] Query: "${query}" | Playlists: ${limit_playlists} | Tracks/playlist: ${tracks_per_playlist} | Min consensus: ${min_consensus}${isFestival ? ' (FESTIVAL)' : ''}`);

  const allTracks: Track[] = [];
  const trackCounts = new Map<string, { track: Track; count: number; playlists: Set<string> }>();
  const playlistNames: string[] = [];

  // 1. Buscar playlists
  const searchResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit_playlists}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchResponse.ok) {
    console.error(`[SEARCH_PLAYLISTS] Search failed: ${searchResponse.status}`);
    return [];
  }

  const searchData = await searchResponse.json();
  const playlists = searchData.playlists?.items || [];

  // 2. Extraer tracks de cada playlist (con offset aleatorio para variedad)
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];
    if (!playlist?.id) continue;

    const playlistName = playlist.name || `Playlist ${i + 1}`;
    if (playlistName) {
      playlistNames.push(playlistName);
    }

    // Offset aleatorio para no siempre empezar desde el principio (pero no más allá de lo razonable)
    // Si la playlist tiene muchas canciones, usar offset aleatorio; si no, empezar desde 0
    const randomOffset = Math.floor(Math.random() * Math.min(50, 100)); // Offset máximo de 50 para no perder tracks
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=${tracks_per_playlist}&offset=${randomOffset}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (tracksResponse.ok) {
      const tracksData = await tracksResponse.json();
      const items = tracksData.items || [];

      for (const item of items) {
        const track = item.track;
        if (!track?.id) continue;

        const normalized = normalizeTrack(track);
        const trackArtists = normalized.artists?.map(a => a.name.toLowerCase()).join(', ') || 'unknown';
        
        if (trackCounts.has(track.id)) {
          const existing = trackCounts.get(track.id)!;
          existing.count++;
          existing.playlists.add(playlistName);
        } else {
          trackCounts.set(track.id, { 
            track: normalized, 
            count: 1,
            playlists: new Set([playlistName])
          });
        }
      }
    } else {
      console.warn(`[SEARCH_PLAYLISTS] Failed to get tracks from "${playlistName}": ${tracksResponse.status}`);
    }
  }

  // 3. Filtrar por consenso, ordenar parcialmente y mezclar
  const allTrackData = Array.from(trackCounts.values());
  
  // Detectar y reportar artistas sospechosos
  const suspiciousArtists = ['frank ocean'];
  const suspiciousTracks: Array<{ track: Track; count: number; playlists: string[] }> = [];
  
  const filteredTracks = allTrackData
    .filter(({ count, track }) => {
      const trackArtists = track.artists?.map(a => a.name.toLowerCase()).join(', ') || '';
      const isSuspicious = suspiciousArtists.some(sus => trackArtists.includes(sus));
      
      if (isSuspicious) {
        suspiciousTracks.push({
          track,
          count,
          playlists: Array.from(playlists)
        });
      }
      
      return count >= min_consensus;
    })
    .sort((a, b) => b.count - a.count)
    .map(({ track }) => track);
  
  // Reportar tracks sospechosos si los hay
  if (suspiciousTracks.length > 0) {
    console.warn(`[SEARCH_PLAYLISTS] ⚠️ Found ${suspiciousTracks.length} suspicious tracks:`);
    for (const { track, count, playlists } of suspiciousTracks) {
      const trackArtists = track.artists?.map(a => a.name).join(', ') || 'unknown';
      const status = count >= min_consensus ? 'ACCEPTED' : 'REJECTED';
      console.warn(`[SEARCH_PLAYLISTS] 🔍 SUSPICIOUS ${status}: "${track.name}" by ${trackArtists} (consensus: ${count}/${min_consensus}, playlists: ${playlists.join(', ')})`);
    }
  }

  // 4. Mezclar para variedad (manteniendo cierta preferencia por consenso)
  // Dividir en grupos y mezclar dentro de cada grupo
  const highConsensus = filteredTracks.slice(0, Math.ceil(filteredTracks.length * 0.3));
  const medConsensus = filteredTracks.slice(Math.ceil(filteredTracks.length * 0.3), Math.ceil(filteredTracks.length * 0.7));
  const lowConsensus = filteredTracks.slice(Math.ceil(filteredTracks.length * 0.7));
  
  const shuffledTracks = [
    ...shuffleArray(highConsensus),
    ...shuffleArray(medConsensus),
    ...shuffleArray(lowConsensus)
  ];

  console.log(`[SEARCH_PLAYLISTS] ✅ Found ${allTrackData.length} unique tracks, ${filteredTracks.length} passed consensus (>=${min_consensus}), returning ${shuffledTracks.length}`);
  return shuffledTracks;
}

// ═══════════════════════════════════════════════════════════════
// HERRAMIENTA 6: adjust_distribution
// ═══════════════════════════════════════════════════════════════

async function executeAdjustDistribution(
  allTracks: Track[],
  params: {
    max_per_artist?: number;
    priority_artists?: string[];
    priority_cap?: number;
    others_cap?: number;
    shuffle?: boolean;
    avoid_consecutive_same_artist?: boolean;
    total_target: number;
  }
): Promise<Track[]> {
  const {
    max_per_artist,
    priority_artists = [],
    priority_cap = 10,
    others_cap = 3,
    shuffle = true,
    avoid_consecutive_same_artist = true,
    total_target
  } = params;

  console.log(`[ADJUST_DISTRIBUTION] Input: ${allTracks.length} tracks, target: ${total_target}`);

  // 1. Mezclar los tracks de entrada para variedad
  const shuffledInput = shuffleArray(allTracks);
  
  // 2. Contar tracks por artista
  const artistCounts = new Map<string, number>();
  const priorityLower = priority_artists.map(a => a.toLowerCase());
  const result: Track[] = [];

  // 3. Aplicar caps
  for (const track of shuffledInput) {
    const mainArtist = (track.artists?.[0]?.name || track.artistNames?.[0] || 'Unknown').toLowerCase();
    const currentCount = artistCounts.get(mainArtist) || 0;

    // Determinar el cap para este artista
    const isPriority = priorityLower.includes(mainArtist);
    const cap = max_per_artist ?? (isPriority ? priority_cap : others_cap);

    if (currentCount < cap) {
      result.push(track);
      artistCounts.set(mainArtist, currentCount + 1);
    }

    if (result.length >= total_target) break;
  }

  // 5. Shuffle si está habilitado (usando Fisher-Yates)
  let finalTracks = result;
  if (shuffle) {
    finalTracks = shuffleArray(result);
  }

  // 4. Evitar artistas consecutivos
  if (avoid_consecutive_same_artist && finalTracks.length > 1) {
    const reordered: Track[] = [];
    const remaining = [...finalTracks];

    while (remaining.length > 0) {
      const lastArtist = reordered.length > 0 
        ? (reordered[reordered.length - 1].artists?.[0]?.name || '').toLowerCase()
        : null;

      // Buscar un track de un artista diferente
      const differentIdx = remaining.findIndex(t => {
        const artist = (t.artists?.[0]?.name || '').toLowerCase();
        return artist !== lastArtist;
      });

      if (differentIdx >= 0) {
        reordered.push(remaining.splice(differentIdx, 1)[0]);
      } else {
        // No hay alternativa, añadir el primero
        reordered.push(remaining.shift()!);
      }
    }

    finalTracks = reordered;
  }

  console.log(`[ADJUST_DISTRIBUTION] Output: ${finalTracks.length} tracks`);
  return finalTracks.slice(0, total_target);
}

// ═══════════════════════════════════════════════════════════════
// BÚSQUEDA DIRECTA DE TRACKS POR NOMBRE DE ARTISTA
// ═══════════════════════════════════════════════════════════════

async function searchTracksByName(
  accessToken: string,
  artistName: string,
  limit: number
): Promise<Track[]> {
  console.log(`[SEARCH_TRACKS_BY_NAME] Fallback search for: "${artistName}"`);
  
  const tracks: Track[] = [];
  const artistNameLower = artistName.toLowerCase();
  
  // Búsqueda directa de tracks que contengan el nombre del artista
  const queries = [
    `artist:${encodeURIComponent(artistName)}`,
    encodeURIComponent(artistName)
  ];
  
  for (const query of queries) {
    if (tracks.length >= limit) break;
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (response.ok) {
      const data = await response.json();
      const items = data.tracks?.items || [];
      
      for (const track of items) {
        if (tracks.length >= limit) break;
        
        // Verificar que el artista buscado está en los artistas del track
        const trackArtists = track.artists?.map((a: any) => a.name.toLowerCase()) || [];
        const hasArtist = trackArtists.some((a: string) => 
          a.includes(artistNameLower) || artistNameLower.includes(a)
        );
        
        if (hasArtist && !tracks.some(t => t.id === track.id)) {
          tracks.push(normalizeTrack(track));
        }
      }
    }
  }
  
  console.log(`[SEARCH_TRACKS_BY_NAME] Found ${tracks.length} tracks for "${artistName}"`);
  return tracks;
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

function normalizeTrack(raw: any): Track {
  return {
    id: raw.id,
    name: raw.name,
    artists: raw.artists?.map((a: any) => ({ name: a.name, id: a.id })) || [],
    artistNames: raw.artists?.map((a: any) => a.name) || [],
    album: raw.album ? { 
      name: raw.album.name, 
      id: raw.album.id,
      images: raw.album.images || [] // NUEVO: Incluir imágenes del álbum
    } : undefined,
    uri: raw.uri,
    popularity: raw.popularity,
    duration_ms: raw.duration_ms,
    preview_url: raw.preview_url,
    external_urls: raw.external_urls
  };
}

