// web/app/api/playlist/stream/route.js
// SSE streaming endpoint to prevent Vercel timeouts

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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

// Festival and scene detection
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
 * Generator for LLM tracks in chunks
 */
async function* yieldLLMChunks(accessToken, intent, target_tracks, traceId) {
  console.log(`[STREAM:${traceId}] Starting LLM phase`);
  
  const llmTracks = intent.tracks_llm || [];
  const chunkSize = 10;
  
  if (llmTracks.length === 0) {
    console.log(`[STREAM:${traceId}] No LLM tracks to process`);
    return;
  }
  
  // Process LLM tracks in chunks
  for (let i = 0; i < llmTracks.length; i += chunkSize) {
    const chunk = llmTracks.slice(i, i + chunkSize);
    console.log(`[STREAM:${traceId}] Processing LLM chunk ${Math.floor(i/chunkSize) + 1}: ${chunk.length} tracks`);
    
    try {
      const resolved = await resolveTracksBySearch(accessToken, chunk);
      const filtered = resolved.filter(track => notExcluded(track, intent.exclusions));
      
      if (filtered.length > 0) {
        yield filtered;
      }
    } catch (error) {
      console.error(`[STREAM:${traceId}] Error processing LLM chunk:`, error);
    }
  }
  
  console.log(`[STREAM:${traceId}] LLM phase completed`);
}

/**
 * Generator for Spotify tracks in chunks
 */
async function* yieldSpotifyChunks(accessToken, intent, remaining, traceId) {
  console.log(`[STREAM:${traceId}] Starting Spotify phase, remaining: ${remaining}`);
  
  if (remaining <= 0) {
    console.log(`[STREAM:${traceId}] No remaining tracks needed`);
    return;
  }
  
  const mode = determineMode(intent, intent.prompt);
  const chunkSize = 10;
  
  try {
    // Detect underground strict mode
    const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
    
    if (isUndergroundStrict && intent.contexts && intent.contexts.key === 'underground_es') {
      // Use underground search
      const allowedArtists = intent.filtered_artists && intent.filtered_artists.length > 0 
        ? intent.filtered_artists 
        : intent.contexts.compass;
      
      const prompt = intent.prompt || '';
      const isInclusive = /\b(con|que contenga|que tenga alguna|con alguna|con canciones|con temas|con música|con tracks)\b/i.test(prompt);
      const isRestrictive = !isInclusive && /\b(solo|tan solo|solamente|nada más que|solo de|con solo|únicamente|exclusivamente)\b/i.test(prompt);
      
      const priorityArtists = isInclusive ? (intent.priority_artists || []) : [];
      const maxPerArtist = isRestrictive ? Math.ceil(remaining / allowedArtists.length) : 3;
      
      console.log(`[STREAM:${traceId}] Underground strict: ${allowedArtists.length} artists, priority: ${priorityArtists.length}`);
      
      const undergroundTracks = await searchUndergroundTracks(accessToken, allowedArtists, remaining, maxPerArtist, null, priorityArtists);
      
      // Yield in chunks
      for (let i = 0; i < undergroundTracks.length; i += chunkSize) {
        const chunk = undergroundTracks.slice(i, i + chunkSize);
        if (chunk.length > 0) {
          yield chunk;
        }
      }
      
      return;
    }
    
    // Normal Spotify recommendations
    const llmArtists = intent.artists_llm || [];
    
    if (llmArtists.length > 0) {
      const spotifyTracks = await radioFromRelatedTop(accessToken, llmArtists, remaining);
      const filtered = spotifyTracks.filter(track => notExcluded(track, intent.exclusions));
      
      // Yield in chunks
      for (let i = 0; i < filtered.length; i += chunkSize) {
        const chunk = filtered.slice(i, i + chunkSize);
        if (chunk.length > 0) {
          yield chunk;
        }
      }
    }
    
  } catch (error) {
    console.error(`[STREAM:${traceId}] Error in Spotify phase:`, error);
  }
  
  console.log(`[STREAM:${traceId}] Spotify phase completed`);
}

/**
 * Enrich artists with Spotify metadata
 */
async function enrichArtistsWithSpotify(tracks, accessToken) {
  const needIdx = [];
  const ids = [];

  function uriToId(uri) {
    if (!uri) return null;
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

  if (!ids.length) return tracks;

  const chunk = (arr, n = 50) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, k) => arr.slice(k * n, k * n + n));

  for (const idBatch of chunk(ids, 50)) {
    try {
      const res = await fetch('https://api.spotify.com/v1/tracks?ids=' + idBatch.join(','), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const got = data?.tracks || [];
      got.forEach((spTrack) => {
        if (!spTrack) return;
        const id = spTrack.id;
        needIdx.forEach((idx) => {
          const t = tracks[idx];
          const idOfT =
            t.id ||
            uriToId(t.uri || t.trackUri);
          if (idOfT === id) {
            const names = (spTrack.artists || []).map((a) => a.name);
            t.artists = names;
            t.artistNames = names.join(', ');
            if (!t.name && spTrack.name) t.name = spTrack.name;
          }
        });
      });
    } catch (error) {
      console.warn('Error enriching track metadata:', error);
    }
  }
  return tracks;
}

/**
 * Main SSE streaming handler - supports both GET and POST
 */
export async function GET(request) {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt');
    const target_tracks = parseInt(searchParams.get('target_tracks')) || 50;
    const playlist_name = searchParams.get('playlist_name');
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    
    console.log(`[STREAM:${traceId}] Starting SSE streaming (GET) for: "${prompt}"`);
    
    // Get session and access token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      console.log(`[STREAM:${traceId}] No valid session found`);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const accessToken = session.accessToken;
    console.log(`[STREAM:${traceId}] Session found for user: ${session.user?.email || 'unknown'}`);
    
    // Create SSE response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        let allTracks = [];
        let heartbeatInterval;
        
        // Set up heartbeat
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: HEARTBEAT\ndata: {"timestamp": ${Date.now()}}\n\n`));
          } catch (error) {
            clearInterval(heartbeatInterval);
          }
        }, 8000);
        
        // Set up timeout
        const timeout = setTimeout(() => {
          console.log(`[STREAM:${traceId}] Timeout reached, sending partial results`);
          clearInterval(heartbeatInterval);
          
          if (allTracks.length > 0) {
            controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
              tracks: allTracks,
              totalSoFar: allTracks.length,
              partial: true,
              reason: 'timeout'
            })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`event: ERROR\ndata: ${JSON.stringify({
              error: 'Timeout without results',
              totalSoFar: 0
            })}\n\n`));
          }
          
          controller.close();
        }, 55000);
        
        // Main processing
        (async () => {
          try {
            // Get intent from LLM
            controller.enqueue(encoder.encode(`event: LLM_START\ndata: {"message": "Generating intent..."}\n\n`));
            
            const intent = await getIntentFromLLM(prompt, target_tracks);
            if (!intent) {
              throw new Error("Failed to generate intent");
            }
            
            console.log(`[STREAM:${traceId}] Intent generated: ${intent.tracks_llm?.length || 0} tracks, ${intent.artists_llm?.length || 0} artists`);
            
            // Process LLM tracks
            controller.enqueue(encoder.encode(`event: LLM_START\ndata: {"message": "Processing LLM tracks..."}\n\n`));
            
            for await (const chunk of yieldLLMChunks(accessToken, intent, target_tracks, traceId)) {
              allTracks = [...allTracks, ...chunk];
              
              controller.enqueue(encoder.encode(`event: LLM_CHUNK\ndata: ${JSON.stringify({
                tracks: chunk,
                totalSoFar: allTracks.length
              })}\n\n`));
              
              console.log(`[STREAM:${traceId}] LLM chunk sent: ${chunk.length} tracks, total: ${allTracks.length}`);
            }
            
            controller.enqueue(encoder.encode(`event: LLM_DONE\ndata: {"totalSoFar": ${allTracks.length}}\n\n`));
            
            // Process Spotify tracks if needed
            const remaining = target_tracks - allTracks.length;
            if (remaining > 0) {
              controller.enqueue(encoder.encode(`event: SPOTIFY_START\ndata: {"message": "Getting Spotify recommendations...", "remaining": ${remaining}}\n\n`));
              
              for await (const chunk of yieldSpotifyChunks(accessToken, intent, remaining, traceId)) {
                allTracks = [...allTracks, ...chunk];
                
                controller.enqueue(encoder.encode(`event: SPOTIFY_CHUNK\ndata: ${JSON.stringify({
                  tracks: chunk,
                  totalSoFar: allTracks.length
                })}\n\n`));
                
                console.log(`[STREAM:${traceId}] Spotify chunk sent: ${chunk.length} tracks, total: ${allTracks.length}`);
              }
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_DONE\ndata: {"totalSoFar": ${allTracks.length}}\n\n`));
            }
            
            // Ensure we have the target number of tracks
            if (allTracks.length > target_tracks) {
              allTracks = allTracks.slice(0, target_tracks);
            }
            
            // Apply audio features (optional, non-blocking)
            try {
              const idsOrUris = allTracks.map((t) => t.uri || t.trackUri || t.id).filter(Boolean);
              const featuresMap = await fetchAudioFeaturesSafe(accessToken, idsOrUris);
              allTracks = allTracks.map(track => ({
                ...track,
                audio_features: featuresMap[track.id] || null
              }));
            } catch (error) {
              console.warn(`[STREAM:${traceId}] Audio features failed:`, error);
            }
            
            // Enrich artists with Spotify
            allTracks = await enrichArtistsWithSpotify(allTracks, accessToken);
            
            // Store for debugging
            try {
              await storeLastRun({
                prompt,
                target_tracks,
                final_tracks: allTracks.length,
                mode: determineMode(intent, prompt),
                duration: Date.now() - startTime,
                success: true
              });
            } catch (e) {
              console.warn(`[STREAM:${traceId}] Failed to store debug data:`, e.message);
            }
            
            // Send final result
            clearTimeout(timeout);
            clearInterval(heartbeatInterval);
            
            controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
              tracks: allTracks,
              totalSoFar: allTracks.length,
              partial: false,
              duration: Date.now() - startTime
            })}\n\n`));
            
            controller.close();
            
          } catch (error) {
            console.error(`[STREAM:${traceId}] Processing error:`, error);
            
            clearTimeout(timeout);
            clearInterval(heartbeatInterval);
            
            if (allTracks.length > 0) {
              controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
                tracks: allTracks,
                totalSoFar: allTracks.length,
                partial: true,
                reason: 'error',
                error: error.message
              })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`event: ERROR\ndata: ${JSON.stringify({
                error: error.message || 'Processing failed',
                totalSoFar: 0
              })}\n\n`));
            }
            
            controller.close();
          }
        })();
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error(`[STREAM:${traceId}] Fatal error:`, error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      ok: false 
    }, { status: 500 });
  }
}

/**
 * Main SSE streaming handler - supports both GET and POST
 */
export async function POST(request) {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const { prompt, target_tracks = 50 } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    
    console.log(`[STREAM:${traceId}] Starting SSE streaming for: "${prompt}"`);
    
    // Get session and access token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      console.log(`[STREAM:${traceId}] No valid session found`);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const accessToken = session.accessToken;
    console.log(`[STREAM:${traceId}] Session found for user: ${session.user?.email || 'unknown'}`);
    
    // Create SSE response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        let allTracks = [];
        let heartbeatInterval;
        
        // Set up heartbeat
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: HEARTBEAT\ndata: {"timestamp": ${Date.now()}}\n\n`));
          } catch (error) {
            clearInterval(heartbeatInterval);
          }
        }, 8000);
        
        // Set up timeout
        const timeout = setTimeout(() => {
          console.log(`[STREAM:${traceId}] Timeout reached, sending partial results`);
          clearInterval(heartbeatInterval);
          
          if (allTracks.length > 0) {
            controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
              tracks: allTracks,
              totalSoFar: allTracks.length,
              partial: true,
              reason: 'timeout'
            })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`event: ERROR\ndata: ${JSON.stringify({
              error: 'Timeout without results',
              totalSoFar: 0
            })}\n\n`));
          }
          
          controller.close();
        }, 55000);
        
        // Main processing
        (async () => {
          try {
            // Get intent from LLM
            controller.enqueue(encoder.encode(`event: LLM_START\ndata: {"message": "Generating intent..."}\n\n`));
            
            const intent = await getIntentFromLLM(prompt, target_tracks);
            if (!intent) {
              throw new Error("Failed to generate intent");
            }
            
            console.log(`[STREAM:${traceId}] Intent generated: ${intent.tracks_llm?.length || 0} tracks, ${intent.artists_llm?.length || 0} artists`);
            
            // Process LLM tracks
            controller.enqueue(encoder.encode(`event: LLM_START\ndata: {"message": "Processing LLM tracks..."}\n\n`));
            
            for await (const chunk of yieldLLMChunks(accessToken, intent, target_tracks, traceId)) {
              allTracks = [...allTracks, ...chunk];
              
              controller.enqueue(encoder.encode(`event: LLM_CHUNK\ndata: ${JSON.stringify({
                tracks: chunk,
                totalSoFar: allTracks.length
              })}\n\n`));
              
              console.log(`[STREAM:${traceId}] LLM chunk sent: ${chunk.length} tracks, total: ${allTracks.length}`);
            }
            
            controller.enqueue(encoder.encode(`event: LLM_DONE\ndata: {"totalSoFar": ${allTracks.length}}\n\n`));
            
            // Process Spotify tracks if needed
            const remaining = target_tracks - allTracks.length;
            if (remaining > 0) {
              controller.enqueue(encoder.encode(`event: SPOTIFY_START\ndata: {"message": "Getting Spotify recommendations...", "remaining": ${remaining}}\n\n`));
              
              for await (const chunk of yieldSpotifyChunks(accessToken, intent, remaining, traceId)) {
                allTracks = [...allTracks, ...chunk];
                
                controller.enqueue(encoder.encode(`event: SPOTIFY_CHUNK\ndata: ${JSON.stringify({
                  tracks: chunk,
                  totalSoFar: allTracks.length
                })}\n\n`));
                
                console.log(`[STREAM:${traceId}] Spotify chunk sent: ${chunk.length} tracks, total: ${allTracks.length}`);
              }
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_DONE\ndata: {"totalSoFar": ${allTracks.length}}\n\n`));
            }
            
            // Ensure we have the target number of tracks
            if (allTracks.length > target_tracks) {
              allTracks = allTracks.slice(0, target_tracks);
            }
            
            // Apply audio features (optional, non-blocking)
            try {
              const idsOrUris = allTracks.map((t) => t.uri || t.trackUri || t.id).filter(Boolean);
              const featuresMap = await fetchAudioFeaturesSafe(accessToken, idsOrUris);
              allTracks = allTracks.map(track => ({
                ...track,
                audio_features: featuresMap[track.id] || null
              }));
            } catch (error) {
              console.warn(`[STREAM:${traceId}] Audio features failed:`, error);
            }
            
            // Enrich artists with Spotify
            allTracks = await enrichArtistsWithSpotify(allTracks, accessToken);
            
            // Store for debugging
            try {
              await storeLastRun({
                prompt,
                target_tracks,
                final_tracks: allTracks.length,
                mode: determineMode(intent, prompt),
                duration: Date.now() - startTime,
                success: true
              });
            } catch (e) {
              console.warn(`[STREAM:${traceId}] Failed to store debug data:`, e.message);
            }
            
            // Send final result
            clearTimeout(timeout);
            clearInterval(heartbeatInterval);
            
            controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
              tracks: allTracks,
              totalSoFar: allTracks.length,
              partial: false,
              duration: Date.now() - startTime
            })}\n\n`));
            
            controller.close();
            
          } catch (error) {
            console.error(`[STREAM:${traceId}] Processing error:`, error);
            
            clearTimeout(timeout);
            clearInterval(heartbeatInterval);
            
            if (allTracks.length > 0) {
              controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
                tracks: allTracks,
                totalSoFar: allTracks.length,
                partial: true,
                reason: 'error',
                error: error.message
              })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`event: ERROR\ndata: ${JSON.stringify({
                error: error.message || 'Processing failed',
                totalSoFar: 0
              })}\n\n`));
            }
            
            controller.close();
          }
        })();
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error(`[STREAM:${traceId}] Fatal error:`, error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      ok: false 
    }, { status: 500 });
  }
}
