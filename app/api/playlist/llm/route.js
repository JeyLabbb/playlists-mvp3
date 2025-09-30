// web/app/api/playlist/llm/route.js
// Clean orchestration for playlist generation with streaming to avoid timeouts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth/config";
import { storeLastRun } from "../../../../lib/debug/utils";

// Clean imports from lib modules
import { mapLLMTrack, mapSpotifyTrack } from "../../../../lib/tracks/mapper";
import { resolveTracksBySearch } from "../../../../lib/spotify/resolve";
import { radioFromRelatedTop } from "../../../../lib/spotify/radio";
import { getArtistTopRecent } from "../../../../lib/spotify/artistTop";
import { fetchAudioFeaturesSafe } from "../../../../lib/spotify/audioFeatures";
import { createPlaylist, addTracksToPlaylist } from "../../../../lib/spotify/playlist";
import { collectFromPlaylistsByConsensus, searchFestivalLikePlaylists, loadPlaylistItemsBatch } from "../../../../lib/spotify/playlistSearch";
import { toTrackId } from "../../../../lib/spotify/ids";
import { fetchTracksMeta } from "../../../../lib/spotify/meta";
import { normalizeArtistName, MUSICAL_CONTEXTS } from "../../../../lib/music/contexts";
import { searchUndergroundTracks } from "../../../../lib/spotify/artistSearch";

// Festival and scene detection (keep existing)
import { extractFestivalInfo, calculateStringSimilarity } from "../../../../lib/intent/festival";
import { detectMusicalScene, cleanSpotifyHint } from "../../../../lib/music/scenes";
import { cleanHint } from "../../../../lib/music/hint";

/**
 * Helper to pick more tracks from LLM pool without duplicates
 */
function pickMoreFromLLM(llmResolved, alreadyChosen, need, exclusions) {
  if (!need || !llmResolved.length) return [];
  
  const chosenIds = new Set(alreadyChosen.map(t => t.id).filter(Boolean));
  const available = llmResolved.filter(track => 
    track.id && 
    !chosenIds.has(track.id) && 
    notExcluded(track, exclusions)
  );
  
  return available.slice(0, need);
}

/**
 * Exclusion filter helper
 */
function notExcluded(track, exclusions){
  if(!exclusions) return true;
  const { banned_artists = [], banned_terms = [] } = exclusions || {};
  const name = (track?.name || '').toLowerCase();
  const artistNames = (track?.artistNames || track?.artists || [])
    .map(a => typeof a === 'string' ? a : a?.name)
    .filter(Boolean)
    .map(x=>x.toLowerCase());

  // artista vetado
  if (banned_artists.some(b => artistNames.includes(b.toLowerCase()))) return false;
  // término vetado en el título
  if (banned_terms.some(t => name.includes(t.toLowerCase()))) return false;

  return true;
}

/**
 * Generate a chunk of playlist tracks
 */
async function generatePlaylistChunk(accessToken, intent, chunkSize, traceId, mode, offset = 0) {
  console.log(`[TRACE:${traceId}] Generating chunk: ${chunkSize} tracks, offset: ${offset}, mode: ${mode}`);
  
  switch (mode) {
    case 'NORMAL':
      return await generateNormalPlaylist(accessToken, intent, chunkSize, traceId);
    case 'VIRAL':
      return await generateViralPlaylist(accessToken, intent, chunkSize, traceId);
    case 'FESTIVAL':
      return await generateFestivalPlaylist(accessToken, intent, chunkSize, traceId);
    case 'ARTIST_STYLE':
      return await generateArtistStylePlaylist(accessToken, intent, chunkSize, traceId);
    default:
      return await generateNormalPlaylist(accessToken, intent, chunkSize, traceId);
  }
}

/**
 * Main playlist generation handler with streaming to avoid timeouts
 */
export async function POST(request) {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const { prompt, target_tracks = 50 } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    
    console.log(`[TRACE:${traceId}] Starting streaming playlist generation for: "${prompt}"`);
    
    // Get session and access token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      console.log(`[TRACE:${traceId}] No valid session found`);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const accessToken = session.accessToken;
    console.log(`[TRACE:${traceId}] Session found for user: ${session.user?.email || 'unknown'}`);
    
    // Get intent from LLM
    const intent = await getIntentFromLLM(prompt, target_tracks);
    if (!intent) {
      return NextResponse.json({ error: "Failed to generate intent" }, { status: 500 });
    }
    
    console.log(`[TRACE:${traceId}] Intent generated: ${intent.tracks_llm?.length || 0} tracks, ${intent.artists_llm?.length || 0} artists`);
    
    // Log exclusions
    console.log(`[EXCLUDE] banned_artists=${intent?.exclusions?.banned_artists?.length||0} banned_terms=${intent?.exclusions?.banned_terms?.length||0}`);
    
    // Determine mode
    const mode = determineMode(intent, prompt);
    console.log(`[TRACE:${traceId}] Mode determined: ${mode}`);
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial response with metadata
          const initialResponse = {
            ok: true,
            mode,
            target_tracks,
            streaming: true,
            tracks: [],
            count: 0,
            status: 'generating'
          };
          
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initialResponse)}\n\n`));
          
          // Generate tracks in chunks
          const chunkSize = Math.min(20, Math.ceil(target_tracks / 3)); // First chunk is 20 or 1/3 of target
          console.log(`[TRACE:${traceId}] Starting with chunk size: ${chunkSize}`);
          
          let allTracks = [];
          let currentChunk = 0;
          
          // Generate first chunk
          const firstChunk = await generatePlaylistChunk(accessToken, intent, chunkSize, traceId, mode, 0);
          allTracks = [...firstChunk];
          
          // Send first chunk
          const firstChunkResponse = {
            ok: true,
            mode,
            target_tracks,
            streaming: true,
            tracks: allTracks,
            count: allTracks.length,
            status: 'generating',
            chunk: 1,
            progress: Math.round((allTracks.length / target_tracks) * 100)
          };
          
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(firstChunkResponse)}\n\n`));
          console.log(`[TRACE:${traceId}] Sent first chunk: ${allTracks.length} tracks`);
          
          // Generate remaining chunks in parallel
          const remainingTracks = target_tracks - allTracks.length;
          if (remainingTracks > 0) {
            const remainingChunks = Math.ceil(remainingTracks / chunkSize);
            const chunkPromises = [];
            
            for (let i = 1; i <= remainingChunks; i++) {
              const chunkStart = i * chunkSize;
              const chunkTarget = Math.min(chunkSize, target_tracks - chunkStart);
              
              chunkPromises.push(
                generatePlaylistChunk(accessToken, intent, chunkTarget, traceId, mode, chunkStart)
                  .then(chunkTracks => ({ chunkIndex: i, tracks: chunkTracks }))
              );
            }
            
            // Process chunks as they complete
            const chunkResults = await Promise.allSettled(chunkPromises);
            
            for (const result of chunkResults) {
              if (result.status === 'fulfilled') {
                const { chunkIndex, tracks } = result.value;
                allTracks = [...allTracks, ...tracks];
                
                // Send chunk update
                const chunkResponse = {
                  ok: true,
                  mode,
                  target_tracks,
                  streaming: true,
                  tracks: allTracks,
                  count: allTracks.length,
                  status: 'generating',
                  chunk: chunkIndex + 1,
                  progress: Math.round((allTracks.length / target_tracks) * 100)
                };
                
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunkResponse)}\n\n`));
                console.log(`[TRACE:${traceId}] Sent chunk ${chunkIndex + 1}: ${allTracks.length} total tracks`);
              }
            }
          }
          
          // Ensure we have the target number of tracks
          if (allTracks.length < target_tracks) {
            console.warn(`[TRACE:${traceId}] Only got ${allTracks.length}/${target_tracks} tracks - this should not happen with exact count requirement`);
          } else if (allTracks.length > target_tracks) {
            allTracks = allTracks.slice(0, target_tracks);
            console.log(`[TRACE:${traceId}] Trimmed to exact target: ${target_tracks}`);
          }
          
          // Apply audio features (optional, non-blocking)
          const idsOrUris = allTracks.map((t) => t.uri || t.trackUri || t.id).filter(Boolean);
          const featuresMap = await fetchAudioFeaturesSafe(accessToken, idsOrUris);
          const tracksWithFeatures = allTracks.map(track => ({
            ...track,
            audio_features: featuresMap[track.id] || null
          }));
          
          // Apply smooth ordering if we have features
          const orderedTracks = applySmoothOrdering(tracksWithFeatures);
          
          // Final validation
          const validTracks = orderedTracks.filter(t => t.id && t.uri && t.name);
          console.log(`[TRACE:${traceId}] Final validation: ${validTracks.length}/${target_tracks} tracks`);
          
          // Enrich artists with Spotify
          const enriched = await enrichArtistsWithSpotify(validTracks, accessToken);
          
          // Store for debugging
          try {
            await storeLastRun({
              prompt,
              target_tracks,
              final_tracks: enriched.length,
              mode,
              duration: Date.now() - startTime,
              success: true
            });
          } catch (e) {
            console.warn(`[TRACE:${traceId}] Failed to store debug data:`, e.message);
          }
          
          // Send final response
          const finalResponse = {
            ok: true,
            mode,
            target_tracks,
            streaming: false,
            tracks: enriched,
            count: enriched.length,
            status: 'completed',
            progress: 100,
            duration: Date.now() - startTime
          };
          
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finalResponse)}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error(`[TRACE:${traceId}] Streaming error:`, error);
          
          const errorResponse = {
            ok: false,
            error: error.message || 'Playlist generation failed',
            streaming: false,
            status: 'error'
          };
          
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error(`[TRACE:${traceId}] Fatal error:`, error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      ok: false 
    }, { status: 500 });
  }
}

/**
 * Enrich artists with Spotify metadata
 */
async function enrichArtistsWithSpotify(tracks, accessToken) {
      // IDs a pedir para los que no tengan artista claro
      const needIdx = [];
      const ids = [];

      function uriToId(uri) {
        if (!uri) return null;
        // soporta 'spotify:track:ID' o 'https://open.spotify.com/track/ID'
        const colon = uri.split(':');
        if (colon.length === 3 && colon[1] === 'track') return colon[2];
        const m = uri.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
        return m ? m[1] : null;
      }

      tracks.forEach((t, i) => {
        const hasArtists =
          (t.artists && t.artists.length) ||
          (t.track?.artists && t.track.artists.length) ||
          t.artist || t.artistName || t.artistNames;
        if (!hasArtists) {
          const id = t.id || uriToId(t.uri || t.trackUri);
          if (id) {
            needIdx.push(i);
            ids.push(id);
          }
        }
      });

      // Nada que enriquecer
      if (!ids.length) return tracks;

      // Peticiones en lotes de 50
      const chunk = (arr, n = 50) =>
        Array.from({ length: Math.ceil(arr.length / n) }, (_, k) => arr.slice(k * n, k * n + n));

      for (const idBatch of chunk(ids, 50)) {
        const res = await fetch('https://api.spotify.com/v1/tracks?ids=' + idBatch.join(','), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) continue;
        const data = await res.json();
        const got = data?.tracks || [];
        got.forEach((spTrack) => {
          if (!spTrack) return;
          const id = spTrack.id;
          // encuentra los índices que correspondan a este id
          needIdx.forEach((idx) => {
            const t = tracks[idx];
            const idOfT =
              t.id ||
              uriToId(t.uri || t.trackUri);
            if (idOfT === id) {
              const names = (spTrack.artists || []).map((a) => a.name);
              t.artists = names;
              t.artistNames = names.join(', ');
              // también rellena el nombre de track si faltara
              if (!t.name && spTrack.name) t.name = spTrack.name;
            }
          });
        });
      }
      return tracks;
    }

    // Helper para hidratar tracks sin metadata
    async function hydrateTracks(accessToken, items) {
      const need = items.filter(x => !x?.name || !extractArtistNames(x) || extractArtistNames(x) === '-');
      if (!need.length) return items;

      const ids = [...new Set(need.map(x => x?.id).filter(Boolean))];
      const out = [...items];

      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${chunk.join(',')}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) continue;
        const json = await res.json();
        (json?.tracks || []).forEach(tr => {
          const idx = out.findIndex(x => x?.id === tr?.id);
          if (idx >= 0) {
            out[idx] = {
              ...out[idx],
              name: tr?.name || out[idx].name,
              artists: tr?.artists || out[idx].artists,
              artistNames: (tr?.artists || []).map(a => a?.name).filter(Boolean),
              track: tr,
              uri: out[idx].uri || tr?.uri || (tr?.id ? `spotify:track:${tr.id}` : undefined),
            };
          }
        });
      }
      return out;
    }

    // Helper para convertir artistNames a string
    function toArtistNamesString(t) {
      if (typeof t?.artistNames === 'string' && t.artistNames.trim()) return t.artistNames.trim();
      if (Array.isArray(t?.artistNames) && t.artistNames.length) return t.artistNames.filter(Boolean).join(', ');
      if (Array.isArray(t?.artists) && t.artists.length) return t.artists.map(a => (a?.name || a)).filter(Boolean).join(', ');
      if (t?.track?.artists?.length) return t.track.artists.map(a => a?.name).filter(Boolean).join(', ');
      if (typeof t?.artist === 'string' && t.artist.trim()) return t.artist.trim();
      return '-';
    }

    // --- NUEVO helper robusto ---
    function extractArtistNames(t) {
      // 1) String ya listo
      if (typeof t?.artistNames === 'string' && t.artistNames.trim() !== '') {
        return t.artistNames.trim();
      }

      // 2) Array de strings
      if (Array.isArray(t?.artistNames)) {
        const arr = t.artistNames.filter(Boolean).map(String);
        if (arr.length) return arr.join(', ');
      }

      // 3) Array de artistas (objetos o strings)
      const fromArtistsField = Array.isArray(t?.artists)
        ? t.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean)
        : [];

      if (fromArtistsField.length) return fromArtistsField.join(', ');

      // 4) Respuesta cruda de Spotify (track.artists)
      const spot = t?.track;
      if (spot?.artists && Array.isArray(spot.artists)) {
        const names = spot.artists.map(a => a?.name).filter(Boolean);
        if (names.length) return names.join(', ');
      }

      // 5) Último intento: artista único en campos sueltos
      if (typeof t?.artist === 'string' && t.artist.trim()) return t.artist.trim();

      return '-';
    }

    // 1) Construimos items base desde tu `enriched`
    const rawItems = enriched.map((t) => {
      const uri = t.uri || t.trackUri || null;
      const id = toTrackId(uri || t.id);
      const name = t.name || t.track?.name || null;
      const artistNames = extractArtistNames(t);
      return { id, uri, name, artistNames, image: t.image, album: t.album };
    });

    // 2) Detectar cuáles necesitan backfill (sin name o con artistas desconocidos/"-")
    const needIds = rawItems
      .filter(x => x.id && (!x.name || !x.artistNames || x.artistNames === '-' || x.artistNames === 'Artista desconocido'))
      .map(x => x.id);

    // 3) Pedimos metadata a Spotify (batches de 50). Si falla, seguimos igual.
    let metaById = {};
    try {
      if (accessToken && needIds.length) {
        metaById = await fetchTracksMeta(accessToken, needIds);
      }
    } catch { /* no romper */ }

    // 4) Mezclamos metadata (sin forzar si ya teníamos nombre)
    const rawItemsWithMeta = rawItems.map(x => {
      const id = x.id;
      if (id && metaById[id]) {
        const m = metaById[id];
        const metaName = m.name && m.name.trim() ? m.name : null;
        const metaArtists = Array.isArray(m.artists) && m.artists.length ? m.artists.join(', ') : null;
        return {
          ...x,
          name: x.name || metaName || 'Sin título',
          artistNames: (x.artistNames && x.artistNames !== '-' && x.artistNames !== 'Artista desconocido')
            ? x.artistNames
            : (metaArtists || 'Artista desconocido'),
        };
      }
      // sin meta o no necesario
      return {
        ...x,
        name: x.name || 'Sin título',
        artistNames: (x.artistNames && x.artistNames !== '-') ? x.artistNames : 'Artista desconocido',
      };
    });

    // Aplicar filtro UNDERGROUND_STRICT 100% restrictivo si está activado
    let filteredTracks = finalTracks;
    const isUndergroundStrict = /underground/i.test(intent.prompt || '');
    
    if (isUndergroundStrict && intent.contexts && intent.contexts.key === 'underground_es') {
      // Normalización con diacríticos
      const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
      const ALLOWED = new Set(intent.contexts.compass.map(norm));
      
      const candidates = finalTracks;
      let kept = 0;
      let dropped = 0;
      
      console.log(`[UNDERGROUND_STRICT] allowed=${ALLOWED.size} keep_outside=true`);
      console.log(`[UNDERGROUND_STRICT] ALLOWED ARTISTS:`, Array.from(ALLOWED).slice(0, 10).join(', '), '...');
      console.log(`[UNDERGROUND_STRICT] CANDIDATES TO FILTER: ${candidates.length}`);
      
      // 1. Resolver solo por ARTISTA permitido - coincidencia exacta normalizada
      const validCandidates = candidates.filter(track => {
        const artistNames = track.artistNames || '';
        const artistNamesStr = typeof artistNames === 'string' ? artistNames : String(artistNames);
        const artists = artistNamesStr.split(',').map(a => norm(a.trim()));
        
        // Aceptar si AL MENOS UN artista está en ALLOWED (permite colaboraciones)
        const hasAllowedArtist = artists.some(artist => ALLOWED.has(artist));
        
        if (!hasAllowedArtist) {
          dropped++;
          console.log(`[UNDERGROUND_STRICT] REJECTED: "${track.name}" by "${artistNamesStr}" - artists normalized: [${artists.join(', ')}]`);
        } else {
          kept++;
          console.log(`[UNDERGROUND_STRICT] ACCEPTED: "${track.name}" by "${artistNamesStr}" - artists normalized: [${artists.join(', ')}]`);
        }
        return hasAllowedArtist;
      });
      
      // 2. Agrupar por artista permitido
      const byArtist = new Map();
      for (const t of validCandidates) {
        const artistNames = t.artistNames || '';
        const artistNamesStr = typeof artistNames === 'string' ? artistNames : String(artistNames);
        const artists = artistNamesStr.split(',').map(a => norm(a.trim()));
        
        // Usar el primer artista para agrupar
        const firstArtist = artists.find(artist => ALLOWED.has(artist));
        if (firstArtist) {
          if (!byArtist.has(firstArtist)) {
            byArtist.set(firstArtist, []);
          }
          byArtist.get(firstArtist).push(t);
        }
      }
      
      // 3. Aleatoriedad estable con seed
      const seed = (intent.prompt || '') + Date.now();
      const artistKeys = [...byArtist.keys()];
      const shuffled = artistKeys.sort(() => Math.random() - 0.5);
      
      // 4. Construir final priorizando cobertura amplia y límite 3/artist
      const cap = 3;
      const final = [];
      const counts = new Map();
      
      for (const artist of shuffled) {
        const list = byArtist.get(artist) || [];
        for (const t of list) {
          if ((counts.get(artist) || 0) >= cap) break;
          if (!final.some(x => x.id === t.id)) {
            final.push(t);
            counts.set(artist, (counts.get(artist) || 0) + 1);
            kept++;
            if (final.length >= target_tracks) break;
          }
        }
        if (final.length >= target_tracks) break;
      }
      
      filteredTracks = final;
      
      // 5. Filtros finales obligatorios - verificar que AL MENOS UN artista está permitido
      filteredTracks = filteredTracks.filter(t => {
        const artistNames = t.artists?.map(a => a.name).join(', ') || t.artistNames || '';
        const artistNamesStr = typeof artistNames === 'string' ? artistNames : String(artistNames);
        const artists = artistNamesStr.split(',').map(a => norm(a.trim()));
        return artists.some(artist => ALLOWED.has(artist));
      });
      
      console.log(`[UNDERGROUND_STRICT] allowed=${ALLOWED.size} kept=${filteredTracks.length} dropped=${dropped}`);
    }

    // Construir items finales para el cliente - ULTRA SIMPLE

/**
 * Gets intent from LLM
 */
async function getIntentFromLLM(prompt, target_tracks) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, target_tracks })
    });
    
    if (!response.ok) {
      throw new Error(`Intent API failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to get intent from LLM:', error);
    return null;
  }
}

/**
 * Determines the mode based on intent and prompt
 */
function determineMode(intent, prompt) {
  const promptLower = prompt.toLowerCase();
  
  // Check for viral/current mode
  const viralKeywords = ['tiktok', 'viral', 'virales', 'top', 'charts', 'tendencia', 'tendencias', '2024', '2025'];
  if (viralKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'VIRAL';
  }
  
  // Check for festival mode
  const festivalInfo = extractFestivalInfo(prompt);
  if (festivalInfo.name && festivalInfo.year) {
    return 'FESTIVAL';
  }
  
  // Check for artist style mode (contains "como" or "like")
  if (promptLower.includes('como') || promptLower.includes('like')) {
    return 'ARTIST_STYLE';
  }
  
  return 'NORMAL';
}

/**
 * Generates normal mode playlist (70% LLM, 30% Spotify)
 */
async function generateNormalPlaylist(accessToken, intent, target_tracks, traceId) {
  console.log(`[TRACE:${traceId}] Generating NORMAL playlist`);
  
  // Detectar modo UNDERGROUND_STRICT
  const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
  
  console.log(`[UNDERGROUND_DETECTION] prompt_match=${/underground/i.test(intent.prompt || '')} filtered_artists=${intent.filtered_artists?.length || 0} isUndergroundStrict=${isUndergroundStrict}`);
  
  if (isUndergroundStrict && intent.contexts && intent.contexts.key === 'underground_es') {
    // Usar artistas filtrados por el LLM si están disponibles, sino usar la lista completa
    const allowedArtists = intent.filtered_artists && intent.filtered_artists.length > 0 
      ? intent.filtered_artists 
      : intent.contexts.compass;
    
    console.log(`[UNDERGROUND_STRICT] Using direct Spotify search for ${allowedArtists.length} artists (${intent.filtered_artists ? 'filtered by LLM' : 'full list'})`);
    
    if (intent.priority_artists && intent.priority_artists.length > 0) {
      console.log(`[UNDERGROUND_STRICT] INCLUSIVE MODE: Priority artists detected: ${intent.priority_artists.join(', ')}`);
    } else if (allowedArtists.length < 50) {
      console.log(`[UNDERGROUND_STRICT] RESTRICTIVE MODE: Only ${allowedArtists.length} artists selected`);
    } else {
      console.log(`[UNDERGROUND_STRICT] NORMAL MODE: Using all ${allowedArtists.length} artists`);
    }
    
    const seed = intent.prompt + Date.now(); // Semilla estable
    
    const undergroundTracks = await searchUndergroundTracks(
      accessToken, 
      allowedArtists, 
      target_tracks, 
      3, // max 3 por artista normal
      seed,
      intent.priority_artists || [] // artistas prioritarios (max 5 cada uno)
    );
    
    console.log(`[UNDERGROUND_STRICT] Got ${undergroundTracks.length} tracks from Spotify direct search`);
    return undergroundTracks;
  }
  
  // Modo normal (LLM + Spotify)
  console.log(`[NORMAL] Using traditional LLM + Spotify approach`);
  
  // Step 1: Resolve LLM tracks to Spotify
  const llmTracks = (intent.tracks_llm || []).map(mapLLMTrack);
  let llmResolved = await resolveTracksBySearch(accessToken, llmTracks, { market: 'from_token' });
  llmResolved = (llmResolved || []).filter(t => notExcluded(t, intent.exclusions));
  console.log(`[LLM-RESOLVE] requested=${llmTracks.length} resolved=${llmResolved.length}`);
  console.log(`[EXCLUDE] llm_after=${llmResolved?.length||0}`);
  
  // Step 2: Get Spotify tracks via related artists (sin /recommendations)
  const seedTracks = (llmResolved || []).filter(t => notExcluded(t, intent.exclusions));
  const seedIds = seedTracks.map(t => t.id).filter(Boolean);
  
  const spTarget = Math.floor(target_tracks * 0.3);
  const llmTarget = target_tracks - spTarget;
  
  let spCandidates = [];
  
  if (seedIds.length > 0) {
    // Preparar exclusiones
    const bannedArtistNames = new Set((intent.exclusions?.artists || []).map(a => a.toLowerCase()));
    const bannedArtistIds = new Set(); // Si tienes IDs, añádelas aquí
    
    // Usa la nueva función sin /recommendations
    spCandidates = await radioFromRelatedTop(accessToken, seedIds, {
      need: spTarget,
      market: 'ES',
      bannedArtistIds,
      bannedArtistNames
    });
    
    console.log(`[RADIO-RELATED] seeds_in=${seedIds.length} got=${spCandidates.length}`);
    console.log(`[EXCLUDE] sp_after=${spCandidates?.length||0}`);
  }
  
  // Fallback to artist top if track radio fails
  if (spCandidates.length === 0 && intent.artists_llm?.length > 0) {
    console.log(`[TRACE:${traceId}] Track radio failed, trying artist top`);
    // Note: In a real implementation, you'd need to resolve artist names to IDs first
    // For now, we'll skip this fallback
  }
  
  // Step 3: Apply 70/30 split
  const llmChosen = llmResolved.slice(0, llmTarget);
  let spChosen = spCandidates.slice(0, spTarget);
  
  console.log(`[SPLIT] llmTarget=${llmTarget} spTarget=${spTarget} llmChosen=${llmChosen.length} spChosen=${spChosen.length}`);
  
  // HOTFIX: Fallback fuerte si Spotify devuelve menos de lo esperado
  if (spChosen.length < spTarget) {
    const need = spTarget - spChosen.length;
    console.log(`[FALLBACK] Spotify shortage: need ${need} more tracks`);
    
    // Fallback fuerte: completa desde LLM (no duplicados, respeta exclusiones)
    const fallback = pickMoreFromLLM(llmResolved, llmChosen, need, intent.exclusions);
    spChosen = [...spChosen, ...fallback];
    console.log(`[FALLBACK] Added ${fallback.length} LLM tracks to Spotify section`);
  }
  
  // --- EXACT COUNT BUILDER ---
  function dedupeById(arr){ const seen=new Set(); return arr.filter(t=>t?.id && !seen.has(t.id) && seen.add(t.id)); }
  const target = Number(target_tracks || 50);
  const bannedNames = new Set((intent.exclusions?.artists||[]).map(a=>a.toLowerCase()));

  function notBanned(t){
    const names = (t?.artistNames||[]).map(n=>String(n||'').toLowerCase());
    return !names.some(n=>bannedNames.has(n));
  }

  // pools
  const llmPool = dedupeById(llmResolved).filter(notBanned);
  const spPool  = dedupeById(spCandidates || []).filter(notBanned);

  // elegidos por porcentaje
  let finalTracks = dedupeById([...(llmChosen||[]), ...(spChosen||[])]).filter(notBanned);

  // 1) completar con Spotify primero
  for(const t of spPool){
    if(finalTracks.length >= target) break;
    if(!finalTracks.find(x=>x.id===t.id)) finalTracks.push(t);
  }

  // 2) si falta, completar con LLM sobrantes
  for(const t of llmPool){
    if(finalTracks.length >= target) break;
    if(!finalTracks.find(x=>x.id===t.id)) finalTracks.push(t);
  }

  // 3) si sigue faltando, relajar: coger más de related-top (pedido extra pequeño)
  if(finalTracks.length < target){
    const extraNeed = target - finalTracks.length;
    const extra = await radioFromRelatedTop(accessToken, (llmResolved||[]).map(t=>t.id), {
      need: extraNeed*2, market:'ES',
      bannedArtistNames: bannedNames
    });
    for(const t of dedupeById(extra).filter(notBanned)){
      if(finalTracks.length >= target) break;
      if(!finalTracks.find(x=>x.id===t.id)) finalTracks.push(t);
    }
  }

  // recorte por seguridad
  if(finalTracks.length > target) finalTracks = finalTracks.slice(0, target);
  
  // Final exclusion filter (defense final)
  finalTracks = (finalTracks || []).filter(t => notExcluded(t, intent.exclusions));
  
  console.log(`[FINAL] size=${finalTracks.length} (llm=${llmChosen?.length||0} sp=${spChosen?.length||0})`);
  
  return finalTracks;
}

// util rápido de timeout
async function withTimeout(promise, ms = 15000, label = 'op') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[TIMEOUT] ${label} > ${ms}ms`)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); })
           .catch(e => { clearTimeout(t); reject(e); });
  });
}

/**
 * Generates viral mode playlist using playlist consensus with timeouts and guards
 */
async function generateViralPlaylist(accessToken, intent, target_tracks, traceId) {
  try {
    console.log(`[TRACE:${traceId}] Generating VIRAL playlist`);
    
    // Use canonized data from intent
    const canonized = intent.canonized;
    if (!canonized) {
      console.warn(`[VIRAL] No canonized data found, using fallback`);
      return await generateNormalPlaylist(accessToken, intent, target_tracks, traceId);
    }
    
    const baseQuery = canonized.baseQuery;
    const year = canonized.year;
    const target = target_tracks;

    console.log(`[MODE] VIRAL start base="${baseQuery}" year=${year}`);

    // 1) RNG estable por ventana de 5 min
    function h32(s) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }
    function rngSeeded(seed) {
      return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    const seedStr = `${baseQuery}|${year}|${Math.floor(Date.now() / 300000)}`; // 5 min
    const rng = rngSeeded(h32(seedStr));
    const pick = (arr, k) => arr.map(x => [rng(), x]).sort((a, b) => a[0] - b[0]).slice(0, k).map(([, x]) => x);

    // 2) Buscar playlists con fallback "suave"
    const allPlaylists = await withTimeout(
      searchFestivalLikePlaylists({ accessToken, baseQuery, year }),
      15000,
      'searchFestivalLikePlaylists'
    );

    if (!Array.isArray(allPlaylists)) {
      console.warn('[PL-SEARCH] not array, forcing []');
      return [];
    }

    console.log(`[PL-SEARCH] found=${allPlaylists.length}`);

    // Si 0 playlists, sal limpia con []
    if (allPlaylists.length === 0) {
      console.warn('[PL-SEARCH] 0 playlists -> return [] (no hang)');
      return [];
    }

    // 3) Diversidad de playlists: muestrea 8-12 aleatorias
    const playlists = pick(allPlaylists, Math.min(12, Math.max(8, Math.floor(allPlaylists.length * 0.4) || 8)));
    console.log(`[PL-SEARCH] sampled=${playlists.length} from ${allPlaylists.length}`);

    // 4) Consenso+relleno con timeout y cap (con aleatoriedad)
    const picked = await withTimeout(
      collectFromPlaylistsByConsensus({ accessToken, playlists, target, artistCap: 3, rng }),
      20000,
      'collectFromPlaylistsByConsensus'
    );

    let final = Array.isArray(picked) ? picked.slice(0, target) : [];
    

    // Relleno ultra-seguro si faltan temas
    if (final.length < target && playlists[0]) {
      const extra = await withTimeout(
        loadPlaylistItemsBatch(accessToken, [playlists[0]], { limitPerPlaylist: 200 }),
        15000,
        'loadPlaylistItemsBatch(extra)'
      ).catch(() => []);

      const flat = (extra?.flat?.() || [])
        .filter(Boolean);

      const seen = new Set(final.map(t => t.id));
      const artistCount = new Map();
      for (const t of final) {
        const a = (t.artists?.[0]?.name || 'x').toLowerCase();
        artistCount.set(a, (artistCount.get(a) || 0) + 1);
      }

      for (const t of flat) {
        if (final.length >= target) break;
        if (!t?.id || seen.has(t.id)) continue;
        const a = (t.artists?.[0]?.name || 'x').toLowerCase();
        const c = artistCount.get(a) || 0;
        if (c >= 3) continue;
        
        // Normalizar el campo artist para la preview
        const artistNames = Array.isArray(t.artists) ? t.artists.map(artist => artist?.name).filter(Boolean).join(', ') : '';
        const normalizedTrack = {
          ...t,
          artist: artistNames || t.artist || t.artistName || t.artist_names || '-',
          artistNames: artistNames || t.artistNames || t.artist || t.artistName || t.artist_names || 'Artista desconocido', // ← ARREGLAR AQUÍ
        };
        
        final.push(normalizedTrack); 
        seen.add(t.id); 
        artistCount.set(a, c + 1);
      }
    }

    console.log(`[FINAL] picked=${final.length}/${target}`);
    return final.slice(0, target);
  } catch (err) {
    console.error('[VIRAL] fail-safe error:', err);
    // Nunca colgar: responde vacío (UI lo maneja) y deja logs.
    return [];
  }
}

/**
 * Generates festival mode playlist using playlist consensus
 */
async function generateFestivalPlaylist(accessToken, intent, target_tracks, traceId) {
  console.log(`[TRACE:${traceId}] Generating FESTIVAL playlist`);
  
  // Use canonized data from intent
  const canonized = intent.canonized;
  if (!canonized) {
    console.warn(`[FESTIVAL] No canonized data found, using fallback`);
    return await generateNormalPlaylist(accessToken, intent, target_tracks, traceId);
  }
  
  console.log(`[FESTIVAL] baseQuery="${canonized.baseQuery}" year=${canonized.year}`);
  
  return await collectFromPlaylistsByConsensus(accessToken, {
    baseQuery: canonized.baseQuery,
    year: canonized.year,
    target: target_tracks,
    festival: true
  });
}

/**
 * Generates artist style playlist
 */
async function generateArtistStylePlaylist(accessToken, intent, target_tracks, traceId) {
  console.log(`[TRACE:${traceId}] Generating ARTIST_STYLE playlist`);
  
  // This would implement the artist style logic
  // For now, fallback to normal mode
  return await generateNormalPlaylist(accessToken, intent, target_tracks, traceId);
}

/**
 * Applies smooth ordering to tracks
 */
function applySmoothOrdering(tracks) {
  const tracksWithFeatures = tracks.filter(t => t.audio_features);
  
  if (tracksWithFeatures.length < tracks.length * 0.3) {
    console.log(`[SMOOTH-ORDERING] features_ok=${tracksWithFeatures.length}, fallback=true`);
    return tracks; // Return as-is if not enough features
  }
  
  // Sort by tempo for smooth progression
  const sorted = [...tracks].sort((a, b) => {
    const tempoA = a.audio_features?.tempo || 120;
    const tempoB = b.audio_features?.tempo || 120;
    return tempoA - tempoB;
  });
  
  console.log(`[SMOOTH-ORDERING] features_ok=${tracksWithFeatures.length}, fallback=false`);
  return sorted;
}
