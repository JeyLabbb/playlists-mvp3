/**
 * PLEIA Agent Tool Executor
 * 
 * Implementación de cada herramienta del agente.
 * Cada herramienta recibe parámetros y devuelve tracks.
 */

import { ToolCall } from './tools';

// Tipos
export interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string; id?: string }>;
  artistNames?: string[];
  album?: { name: string; id?: string };
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
// EJECUTOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export async function executeToolCall(
  toolCall: ToolCall,
  accessToken: string,
  context: {
    allTracksSoFar: Track[];
    usedTrackIds: Set<string>;
  }
): Promise<ToolResult> {
  const startTime = Date.now();
  let tracks: Track[] = [];

  console.log(`[AGENT-EXECUTOR] Executing tool: ${toolCall.tool}`, toolCall.params);

  try {
    switch (toolCall.tool) {
      case 'get_artist_tracks':
        tracks = await executeGetArtistTracks(accessToken, toolCall.params);
        break;
      
      case 'get_collaborations':
        tracks = await executeGetCollaborations(accessToken, toolCall.params);
        break;
      
      case 'get_similar_style':
        tracks = await executeGetSimilarStyle(accessToken, toolCall.params);
        break;
      
      case 'generate_creative_tracks':
        tracks = await executeGenerateCreativeTracks(accessToken, toolCall.params);
        break;
      
      case 'search_playlists':
        tracks = await executeSearchPlaylists(accessToken, toolCall.params);
        break;
      
      case 'adjust_distribution':
        tracks = await executeAdjustDistribution(context.allTracksSoFar, toolCall.params);
        break;
      
      default:
        console.warn(`[AGENT-EXECUTOR] Unknown tool: ${toolCall.tool}`);
        tracks = [];
    }

    // Filtrar duplicados
    tracks = tracks.filter(track => {
      if (!track.id || context.usedTrackIds.has(track.id)) return false;
      context.usedTrackIds.add(track.id);
      return true;
    });

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
  const foundArtist = searchData.artists?.items?.[0];

  if (!foundArtist) {
    console.warn(`[GET_ARTIST_TRACKS] Artist not found: "${artist}"`);
    return [];
  }

  console.log(`[GET_ARTIST_TRACKS] Found artist: ${foundArtist.name} (${foundArtist.id})`);

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
    // 3. Buscar tracks del artista
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(foundArtist.name)}"&type=track&limit=${Math.min(limit * 2, 50)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (tracksResponse.ok) {
      const tracksData = await tracksResponse.json();
      const rawTracks = tracksData.tracks?.items || [];

      for (const track of rawTracks) {
        const artistNames = track.artists.map((a: any) => a.name.toLowerCase());
        const isMainArtist = artistNames[0] === foundArtist.name.toLowerCase();
        const isCollaboration = artistNames.includes(foundArtist.name.toLowerCase()) && !isMainArtist;

        if (isMainArtist || (include_collaborations && isCollaboration)) {
          tracks.push(normalizeTrack(track));
        }

        if (tracks.length >= limit) break;
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

  console.log(`[GET_COLLABORATIONS] Searching: "${main_artist}" with [${must_collaborate_with.join(', ')}]`);

  // Normalizar nombres para comparación
  const mainArtistLower = main_artist.toLowerCase();
  const collaboratorsLower = must_collaborate_with.map(a => a.toLowerCase());

  // Buscar tracks del artista principal
  const searchResponse = await fetch(
    `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(main_artist)}"&type=track&limit=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchResponse.ok) {
    console.error(`[GET_COLLABORATIONS] Search failed: ${searchResponse.status}`);
    return [];
  }

  const searchData = await searchResponse.json();
  const rawTracks = searchData.tracks?.items || [];

  for (const track of rawTracks) {
    const artistNames = track.artists.map((a: any) => a.name.toLowerCase());
    
    // Verificar que el artista principal está en el track
    const hasMainArtist = artistNames.includes(mainArtistLower);
    if (!hasMainArtist) continue;

    // Verificar que al menos uno de los colaboradores está en el track
    const hasCollaborator = collaboratorsLower.some(collab => 
      artistNames.includes(collab)
    );

    if (hasCollaborator) {
      tracks.push(normalizeTrack(track));
      console.log(`[GET_COLLABORATIONS] Found collab: "${track.name}" by ${artistNames.join(', ')}`);
    }

    if (tracks.length >= limit) break;
  }

  console.log(`[GET_COLLABORATIONS] Found ${tracks.length} collaborations`);
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
  }
): Promise<Track[]> {
  const { seed_artists, limit = 20, include_seed_artists = false } = params;
  const tracks: Track[] = [];
  const artistIds: string[] = [];

  console.log(`[GET_SIMILAR_STYLE] Seeds: [${seed_artists.join(', ')}], limit: ${limit}`);

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

  // 2. Obtener recomendaciones de Spotify
  const seedArtists = artistIds.slice(0, 5).join(',');
  const recsResponse = await fetch(
    `https://api.spotify.com/v1/recommendations?seed_artists=${seedArtists}&limit=${Math.min(limit * 2, 100)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (recsResponse.ok) {
    const recsData = await recsResponse.json();
    const recTracks = recsData.tracks || [];

    for (const track of recTracks) {
      const trackArtistIds = track.artists.map((a: any) => a.id);
      const isSeedArtist = trackArtistIds.some((id: string) => artistIds.includes(id));

      if (include_seed_artists || !isSeedArtist) {
        tracks.push(normalizeTrack(track));
      }

      if (tracks.length >= limit) break;
    }
  }

  // 3. Si include_seed_artists, añadir top tracks de los seeds
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

  console.log(`[GET_SIMILAR_STYLE] Found ${tracks.length} similar tracks`);
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
  }
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

  console.log(`[GENERATE_CREATIVE] mood=${mood}, theme=${theme}, genre=${genre}, count=${count}`);

  // Esta herramienta necesita llamar al LLM para generar tracks
  // Por ahora, usamos búsquedas inteligentes basadas en los parámetros

  const tracks: Track[] = [];
  const queries: string[] = [];

  // Construir queries basadas en los parámetros
  if (genre) {
    queries.push(...genre.split(',').map(g => g.trim()));
  }
  if (mood) {
    queries.push(...mood.split(',').map(m => `${m.trim()} music`));
  }
  if (theme) {
    queries.push(theme);
  }
  if (era) {
    queries.push(era);
  }

  // Buscar tracks de artistas específicos mencionados
  for (const artist of artists_to_include.slice(0, 5)) {
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=artist:"${encodeURIComponent(artist)}"&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchResponse.ok) {
      const data = await searchResponse.json();
      const artistTracks = (data.tracks?.items || [])
        .filter((t: any) => {
          const artistNames = t.artists.map((a: any) => a.name.toLowerCase());
          return !artists_to_exclude.some(ex => artistNames.includes(ex.toLowerCase()));
        })
        .slice(0, 5)
        .map(normalizeTrack);
      tracks.push(...artistTracks);
    }
  }

  // Buscar por queries de género/mood
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
          return !artists_to_exclude.some(ex => artistNames.includes(ex.toLowerCase()));
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

  console.log(`[GENERATE_CREATIVE] Generated ${tracks.length} tracks`);
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
  const { 
    query, 
    limit_playlists = 5, 
    tracks_per_playlist = 15,
    min_consensus = 1 
  } = params;

  console.log(`[SEARCH_PLAYLISTS] Query: "${query}", playlists: ${limit_playlists}`);

  const allTracks: Track[] = [];
  const trackCounts = new Map<string, { track: Track; count: number }>();

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

  console.log(`[SEARCH_PLAYLISTS] Found ${playlists.length} playlists`);

  // 2. Extraer tracks de cada playlist
  for (const playlist of playlists) {
    if (!playlist?.id) continue;

    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=${tracks_per_playlist}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (tracksResponse.ok) {
      const tracksData = await tracksResponse.json();
      const items = tracksData.items || [];

      for (const item of items) {
        const track = item.track;
        if (!track?.id) continue;

        const normalized = normalizeTrack(track);
        
        if (trackCounts.has(track.id)) {
          trackCounts.get(track.id)!.count++;
        } else {
          trackCounts.set(track.id, { track: normalized, count: 1 });
        }
      }
    }
  }

  // 3. Filtrar por consenso y ordenar
  const filteredTracks = Array.from(trackCounts.values())
    .filter(({ count }) => count >= min_consensus)
    .sort((a, b) => b.count - a.count)
    .map(({ track }) => track);

  console.log(`[SEARCH_PLAYLISTS] Found ${filteredTracks.length} tracks with consensus >= ${min_consensus}`);
  return filteredTracks;
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

  // 1. Contar tracks por artista
  const artistCounts = new Map<string, number>();
  const priorityLower = priority_artists.map(a => a.toLowerCase());
  const result: Track[] = [];

  // 2. Aplicar caps
  for (const track of allTracks) {
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

  // 3. Shuffle si está habilitado
  let finalTracks = result;
  if (shuffle) {
    finalTracks = [...result].sort(() => Math.random() - 0.5);
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
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

function normalizeTrack(raw: any): Track {
  return {
    id: raw.id,
    name: raw.name,
    artists: raw.artists?.map((a: any) => ({ name: a.name, id: a.id })) || [],
    artistNames: raw.artists?.map((a: any) => a.name) || [],
    album: raw.album ? { name: raw.album.name, id: raw.album.id } : undefined,
    uri: raw.uri,
    popularity: raw.popularity,
    duration_ms: raw.duration_ms,
    preview_url: raw.preview_url,
    external_urls: raw.external_urls
  };
}

