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
  }
): Promise<ToolResult> {
  const startTime = Date.now();
  let tracks: Track[] = [];

  console.log(`[AGENT-EXECUTOR] Executing tool: ${toolCall.tool}`, toolCall.params);

  try {
    switch (toolCall.tool) {
      case 'get_artist_tracks':
        tracks = await executeGetArtistTracks(accessToken, toolCall.params as any);
        break;
      
      case 'get_collaborations':
        tracks = await executeGetCollaborations(accessToken, toolCall.params as any);
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
        // adjust_distribution NO pasa por filtro de duplicados porque reordena tracks existentes
        tracks = await executeAdjustDistribution(context.allTracksSoFar, toolCall.params);
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

    // Filtrar duplicados (solo para herramientas que añaden tracks nuevos)
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

  console.log(`[GENERATE_CREATIVE] mood=${mood}, theme=${theme}, genre=${genre}, era=${era}, count=${count}`);

  const tracks: Track[] = [];
  
  // Detectar si se pide en español (necesario para queries y LLM)
  const isSpanish = theme?.toLowerCase().includes('español') || 
                   theme?.toLowerCase().includes('espanol') ||
                   theme?.toLowerCase().includes('española') ||
                   theme?.toLowerCase().includes('espanola') ||
                   mood?.toLowerCase().includes('español') ||
                   mood?.toLowerCase().includes('espanol');
  
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
      if (genre) {
        queries.push(...genre.split(',').map(g => g.trim()));
      }
      if (mood) {
        queries.push(...mood.split(',').map(m => `${m.trim()} music`));
      }
      if (theme) {
        queries.push(theme);
      }
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

  // 2. Extraer tracks de cada playlist (con offset aleatorio para variedad)
  for (const playlist of playlists) {
    if (!playlist?.id) continue;

    // Offset aleatorio para no siempre empezar desde el principio
    const randomOffset = Math.floor(Math.random() * 30);
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
        
        if (trackCounts.has(track.id)) {
          trackCounts.get(track.id)!.count++;
        } else {
          trackCounts.set(track.id, { track: normalized, count: 1 });
        }
      }
    }
  }

  // 3. Filtrar por consenso, ordenar parcialmente y mezclar
  const filteredTracks = Array.from(trackCounts.values())
    .filter(({ count }) => count >= min_consensus)
    .sort((a, b) => b.count - a.count)
    .map(({ track }) => track);

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

  console.log(`[SEARCH_PLAYLISTS] Found ${shuffledTracks.length} tracks with consensus >= ${min_consensus}`);
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
    album: raw.album ? { name: raw.album.name, id: raw.album.id } : undefined,
    uri: raw.uri,
    popularity: raw.popularity,
    duration_ms: raw.duration_ms,
    preview_url: raw.preview_url,
    external_urls: raw.external_urls
  };
}

