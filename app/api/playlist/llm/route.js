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
    .map(x => (x || '').toLowerCase());

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
    
    console.log(`[UNDERGROUND_STRICT] Using direct Spotify search for ${allowedArtists.length} artists (filtered by LLM)`);
    
    // Detectar modo inclusivo/restrictivo
    const prompt = intent.prompt || '';
    const isInclusive = /\b(con|que contenga|que tenga alguna|con alguna|con canciones|con temas|con música|con tracks)\b/i.test(prompt);
    const isRestrictive = !isInclusive && /\b(solo|tan solo|solamente|nada más que|solo de|con solo|únicamente|exclusivamente)\b/i.test(prompt);
    
    console.log(`[UNDERGROUND_STRICT] INCLUSIVE MODE: ${isInclusive}, RESTRICTIVE MODE: ${isRestrictive}`);
    
    if (isInclusive) {
      // Modo inclusivo: artistas prioritarios + otros artistas
      const priorityArtists = intent.priority_artists || [];
      console.log(`[UNDERGROUND_STRICT] INCLUSIVE MODE: Priority artists detected: ${priorityArtists.join(', ')}`);
      
      return await searchUndergroundTracks(accessToken, allowedArtists, target_tracks, 3, null, priorityArtists);
    } else if (isRestrictive) {
      // Modo restrictivo: solo artistas específicos
      console.log(`[UNDERGROUND_STRICT] RESTRICTIVE MODE: Only specific artists allowed`);
      
      return await searchUndergroundTracks(accessToken, allowedArtists, target_tracks, Math.ceil(target_tracks / allowedArtists.length), null, []);
    } else {
      // Modo normal: mezcla de artistas
      return await searchUndergroundTracks(accessToken, allowedArtists, target_tracks, 3, null, []);
    }
  }
  
  // Modo normal: usar LLM + Spotify
  const llmTracks = intent.tracks_llm || [];
  const llmArtists = intent.artists_llm || [];
  
  console.log(`[NORMAL] LLM tracks: ${llmTracks.length}, LLM artists: ${llmArtists.length}`);
  
  // Resolve LLM tracks first
  const llmResolved = await resolveTracksBySearch(accessToken, llmTracks);
  console.log(`[NORMAL] LLM resolved: ${llmResolved.length} tracks`);
  
  // Get Spotify recommendations
  const spotifyTracks = await radioFromRelatedTop(accessToken, llmArtists, target_tracks);
  console.log(`[NORMAL] Spotify tracks: ${spotifyTracks.length} tracks`);
  
  // Combine and deduplicate
  const allTracks = [...llmResolved, ...spotifyTracks];
  const deduplicated = dedupeById(allTracks);
  
  // Apply exclusions
  const filtered = deduplicated.filter(track => notExcluded(track, intent.exclusions));
  
  // Return target amount
  return filtered.slice(0, target_tracks);
}

/**
 * Generates viral mode playlist using consensus from popular playlists
 */
async function generateViralPlaylist(accessToken, intent, target_tracks, traceId) {
  console.log(`[TRACE:${traceId}] Generating VIRAL playlist`);
  
  try {
    const llmChosen = intent.tracks_llm || [];
    const spChosen = await radioFromRelatedTop(accessToken, intent.artists_llm || [], target_tracks);
    
    let finalTracks = dedupeById([...(llmChosen||[]), ...(spChosen||[])]).filter(notBanned);
    
    // Fill with more tracks if needed
    const target = target_tracks;
    if(finalTracks.length < target) {
      const moreFromLLM = pickMoreFromLLM(llmChosen, finalTracks, target - finalTracks.length, intent.exclusions);
      finalTracks = [...finalTracks, ...moreFromLLM];
    }
    
    if(finalTracks.length < target) {
      const moreFromSpotify = await radioFromRelatedTop(accessToken, intent.artists_llm || [], target - finalTracks.length);
      finalTracks = [...finalTracks, ...moreFromSpotify.filter(t => !finalTracks.find(x=>x.id===t.id))];
    }
    
    if(finalTracks.length < target){
      const extraNeed = target - finalTracks.length;
      const extraTracks = await radioFromRelatedTop(accessToken, ['pop', 'hip hop', 'electronic'], extraNeed);
      finalTracks = [...finalTracks, ...extraTracks.filter(t => !finalTracks.find(x=>x.id===t.id))];
    }
    
    if(finalTracks.length > target) finalTracks = finalTracks.slice(0, target);
    
    finalTracks = (finalTracks || []).filter(t => notExcluded(t, intent.exclusions));
    
    console.log(`[FINAL] size=${finalTracks.length} (llm=${llmChosen?.length||0} sp=${spChosen?.length||0})`);
    
    return finalTracks;
  } catch (err) {
    console.error('[VIRAL] fail-safe error:', err);
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

/**
 * Deduplicate tracks by ID
 */
function dedupeById(tracks) {
  const seen = new Set();
  return tracks.filter(track => {
    if (!track.id || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

/**
 * Filter out banned tracks
 */
function notBanned(track) {
  return notExcluded(track, null); // No exclusions for this filter
}