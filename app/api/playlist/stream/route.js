// web/app/api/playlist/stream/route.js
// SSE streaming endpoint to prevent Vercel timeouts

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextResponse } from "next/server";
import { storeLastRun } from "../../../../lib/debug/utils";
import logger from "../../../../lib/logger";
import { getPleiaServerUser } from "../../../../lib/auth/serverUser";
import { getHubAccessToken } from "../../../../lib/spotify/hubAuth";
import { getUsageSummary, getUserPlan, refundUsage, getUsageLimit, getOrCreateUsageUser } from '../../../../lib/billing/usage';

// Clean imports from lib modules
import { mapLLMTrack, mapSpotifyTrack } from "../../../../lib/tracks/mapper";
import { resolveTracksBySearch } from "../../../../lib/spotify/resolve";
import { radioFromRelatedTop } from "../../../../lib/spotify/radio";
import { getArtistTopRecent } from "../../../../lib/spotify/artistTop";
import { fetchAudioFeaturesSafe } from "../../../../lib/spotify/audioFeatures";
import { createPlaylist, addTracksToPlaylist } from "../../../../lib/spotify/playlist";
import { collectFromPlaylistsByConsensus, searchFestivalLikePlaylists, loadPlaylistItemsBatch, searchPlaylists } from "../../../../lib/spotify/playlistSearch";

// LOG LEVEL CONFIGURATION
const VERBOSE_LOGS = false; // Set to false for clean logs (only essentials)

// Helper for verbose logging
const vlog = (...args) => {
  if (VERBOSE_LOGS) console.log(...args);
};

// Helper to log metrics to Supabase via telemetry API
async function logMetrics(userEmail, action, meta) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'usage',
        payload: {
          email: userEmail,
          event: action,
          meta: meta
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[METRICS] Error logging metrics:', errorText);
      return { ok: false, error: errorText };
    } else {
      const result = await response.json();
      console.log(`[METRICS] logged ${action} for ${userEmail}`, result);
      return result;
    }
  } catch (error) {
    console.error('[METRICS] Error in logMetrics:', error);
    return { ok: false, error: error.message };
  }
}

// Helper to log playlists to Supabase via telemetry API
async function logPlaylist(userEmail, playlistName, prompt, spotifyUrl, spotifyId, trackCount) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'playlist',
        payload: {
          email: userEmail,
          playlistName: playlistName,
          prompt: prompt,
          spotifyUrl: spotifyUrl,
          spotifyId: spotifyId,
          trackCount: trackCount
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PLAYLIST] Error logging playlist:', errorText);
      return { ok: false, error: errorText };
    } else {
      const result = await response.json();
      console.log(`[PLAYLIST] logged playlist for ${userEmail}`, result);
      return result;
    }
  } catch (error) {
    console.error('[PLAYLIST] Error in logPlaylist:', error);
    return { ok: false, error: error.message };
  }
}

// Get top 3 tracks of an artist
async function getArtistTopTracks(accessToken, artistName, limit = 3) {
  vlog(`[ARTIST-TOP] Getting top ${limit} tracks for "${artistName}"`);
  
  try {
    // First, search for the artist
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!searchResponse.ok) {
      console.log(`[ARTIST-TOP] Failed to search for artist "${artistName}": ${searchResponse.status}`);
      return [];
    }
    
    const searchData = await searchResponse.json();
    const artists = searchData.artists?.items || [];
    
    if (artists.length === 0) {
      console.log(`[ARTIST-TOP] No artist found for "${artistName}"`);
      return [];
    }
    
    const artist = artists[0];
    console.log(`[ARTIST-TOP] Found artist: ${artist.name} (${artist.id})`);
    
    // Get top tracks
    const tracksResponse = await fetch(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!tracksResponse.ok) {
      console.log(`[ARTIST-TOP] Failed to get top tracks for "${artistName}": ${tracksResponse.status}`);
      return [];
    }
    
    const tracksData = await tracksResponse.json();
    const tracks = tracksData.tracks || [];
    
    console.log(`[ARTIST-TOP] Got ${tracks.length} top tracks for "${artistName}"`);
    return tracks.slice(0, limit);
    
  } catch (error) {
    console.log(`[ARTIST-TOP] Error getting top tracks for "${artistName}":`, error.message);
    return [];
  }
}

// Get all tracks from an artist to find collaborators
async function getArtistAllTracks(accessToken, artistName, limit = 50) {
  console.log(`[ARTIST-ALL] Getting all tracks for "${artistName}"`);
  try {
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!searchResponse.ok) {
      console.log(`[ARTIST-ALL] Failed to search for artist "${artistName}": ${searchResponse.status}`);
      return [];
    }
    
    const searchData = await searchResponse.json();
    const artists = searchData.artists?.items || [];
    
    if (artists.length === 0) {
      console.log(`[ARTIST-ALL] No artist found for "${artistName}"`);
      return [];
    }
    
    const artist = artists[0];
    console.log(`[ARTIST-ALL] Found artist: ${artist.name} (${artist.id})`);
    
    // Get all albums first (including appears_on for collaborations)
    const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artist.id}/albums?limit=50&include_groups=album,single,compilation,appears_on`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!albumsResponse.ok) {
      console.log(`[ARTIST-ALL] Failed to get albums for "${artistName}": ${albumsResponse.status}`);
      return [];
    }
    
    const albumsData = await albumsResponse.json();
    const albums = albumsData.items || [];
    console.log(`[ARTIST-ALL] Found ${albums.length} albums for "${artistName}"`);
    
    // Get tracks from each album (increase to 50 albums for maximum collaborator discovery)
    const allTracks = [];
    for (const album of albums.slice(0, 50)) { // Increase to 50 albums for maximum collaborator discovery
      const tracksResponse = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (tracksResponse.ok) {
        const tracksData = await tracksResponse.json();
        allTracks.push(...tracksData.items || []);
      }
    }
    
    console.log(`[ARTIST-ALL] Got ${allTracks.length} total tracks for "${artistName}"`);
    return allTracks;
    
  } catch (error) {
    console.log(`[ARTIST-ALL] Error getting all tracks for "${artistName}":`, error.message);
    return [];
  }
}

// Extract collaborators from tracks
function extractCollaborators(tracks, mainArtistName) {
  const collaborators = new Set();
  const mainArtistLower = mainArtistName.toLowerCase();
  
  for (const track of tracks) {
    // 🚨 CRITICAL: Buscar en ambos artistas (objetos) y artistNames (strings)
    const trackArtists = [];
    
    // Extraer de track.artists (objetos con {id, name})
    if (track.artists && Array.isArray(track.artists)) {
      for (const artist of track.artists) {
        const artistName = typeof artist === 'string' ? artist : (artist?.name || '');
        if (artistName) trackArtists.push(artistName);
      }
    }
    
    // Extraer de track.artistNames (array de strings)
    if (track.artistNames && Array.isArray(track.artistNames)) {
      for (const artistName of track.artistNames) {
        if (typeof artistName === 'string' && artistName) {
          trackArtists.push(artistName);
        }
      }
    }
    
    // Procesar todos los artistas encontrados
    for (const artistName of trackArtists) {
      const artistLower = artistName.toLowerCase();
      if (artistLower !== mainArtistLower) {
        // Filter out generic names that aren't real artists
        const trimmedName = artistName.trim();
        
        if (trimmedName && 
            !trimmedName.includes('Various Artists') &&
            !trimmedName.includes('Unknown Artist') &&
            !trimmedName.includes('Top Hits') &&
            !trimmedName.includes('Playlist') &&
            !trimmedName.includes('Mix') &&
            trimmedName.length > 1) {
          collaborators.add(trimmedName);
        }
      }
    }
  }
  
  const collaboratorList = Array.from(collaborators);
  console.log(`[COLLABORATORS] Found ${collaboratorList.length} unique collaborators for "${mainArtistName}"`);
  return collaboratorList;
}

// Get radio recommendations for a specific track
async function getTrackRadio(accessToken, trackId, limit = 20) {
  console.log(`[TRACK-RADIO] Getting radio for track ${trackId}`);
  
  try {
    const url = `https://api.spotify.com/v1/recommendations?seed_tracks=${trackId}&limit=${limit}`;
    console.log(`[TRACK-RADIO] URL: ${url}`);
    console.log(`[TRACK-RADIO] Token length: ${accessToken.length}`);
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[TRACK-RADIO] Failed to get radio for track ${trackId}: ${response.status}`);
      console.log(`[TRACK-RADIO] Error response: ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    const tracks = data.tracks || [];
    
    console.log(`[TRACK-RADIO] Got ${tracks.length} radio tracks for track ${trackId}`);
    return tracks;
    
  } catch (error) {
    console.log(`[TRACK-RADIO] Error getting radio for track ${trackId}:`, error.message);
    return [];
  }
}
import { toTrackId } from "../../../../lib/spotify/ids";
import { fetchTracksMeta } from "../../../../lib/spotify/meta";
import { normalizeArtistName, MUSICAL_CONTEXTS } from "../../../../lib/music/contexts";
import { searchUndergroundTracks, resolveArtistsWithDeduplication } from "../../../../lib/spotify/artistSearch";
import { searchTracksByArtists } from "../../../../search_helpers";
import { calculateMultiArtistDistribution, checkCapInTime, calculateCompensationPlan, normalizeForComparison, detectSpecialCases, calculateDynamicCaps } from "../../../../lib/helpers";

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
  // Handle both array and string formats for artists
  let artistNames = [];
  if (track?.artistNames && Array.isArray(track.artistNames)) {
    artistNames = track.artistNames.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
  } else if (track?.artists) {
    if (Array.isArray(track.artists)) {
      artistNames = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
    } else if (typeof track.artists === 'string') {
      // Handle string format like "Baby Pantera, Mda"
      artistNames = track.artists.split(',').map(a => a.trim()).filter(Boolean);
    }
  }
  artistNames = artistNames.map(x => (x || '').toLowerCase());

  // Normalizar nombres de artistas para mejor matching
  const normalizeArtistName = (artist) => {
    return artist.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize spaces
      .trim();
  };

  // Check banned artists with improved matching
  for (const bannedArtist of banned_artists) {
    const bannedNormalized = normalizeArtistName(bannedArtist);
    
    // Check exact match
    if (artistNames.some(artist => normalizeArtistName(artist) === bannedNormalized)) {
      console.log(`[EXCLUSION] Filtered track "${track.name}" - contains banned artist "${bannedArtist}"`);
      return false;
    }
    
    // Check partial match for collaborations (e.g., "Bad Bunny" in "J Balvin feat. Bad Bunny")
    if (artistNames.some(artist => {
      const normalizedArtist = normalizeArtistName(artist);
      return normalizedArtist.includes(bannedNormalized) || bannedNormalized.includes(normalizedArtist);
    })) {
      console.log(`[EXCLUSION] Filtered track "${track.name}" - contains banned artist "${bannedArtist}" in collaboration`);
      return false;
    }
    
    // Check track name for artist mentions (e.g., "Bad Bunny - Dakiti")
    if (name.includes(bannedNormalized)) {
      console.log(`[EXCLUSION] Filtered track "${track.name}" - banned artist "${bannedArtist}" mentioned in title`);
      return false;
    }
  }

  // Check banned terms in title
  for (const bannedTerm of banned_terms) {
    if (name.includes(bannedTerm.toLowerCase())) {
      console.log(`[EXCLUSION] Filtered track "${track.name}" - contains banned term "${bannedTerm}"`);
      return false;
    }
  }

  return true;
}

// Global usedTracks to prevent repetition across all streaming contexts
let globalUsedTracks = new Set();

/**
 * Deduplicate tracks by ID
 */
function dedupeById(tracks) {
  const seen = new Set();
  const originalLength = tracks.length;
  const filtered = tracks.filter(track => {
    if (!track.id) {
      console.warn(`[DEDUPE-BY-ID] Track without ID:`, track.name);
      return false;
    }
    if (seen.has(track.id)) {
      console.log(`[DEDUPE-BY-ID] Duplicate track found: ${track.name} (${track.id})`);
      return false;
    }
    seen.add(track.id);
    return true;
  });
  
  const duplicateCount = originalLength - filtered.length;
  if (duplicateCount > 0) {
    console.log(`[DEDUPE-BY-ID] Removed ${duplicateCount} duplicate tracks (${originalLength} -> ${filtered.length})`);
  }
  
  return filtered;
}

/**
 * Deduplicate tracks against a global set of used tracks
 */
function dedupeAgainstUsed(tracks, usedTracks) {
  const originalLength = tracks.length;
  const filtered = tracks.filter(track => {
    if (!track.id) {
      console.warn(`[DEDUPE] Track without ID:`, track.name);
      return false;
    }
    const isUsed = usedTracks.has(track.id);
    if (isUsed) {
      console.log(`[DEDUPE] Filtering out already used track: ${track.name} (${track.id})`);
    }
    return !isUsed;
  });
  
  const filteredCount = originalLength - filtered.length;
  if (filteredCount > 0) {
    console.log(`[DEDUPE] Filtered out ${filteredCount} already used tracks (${originalLength} -> ${filtered.length})`);
  }
  
  return filtered;
}

/**
 * Gets intent from LLM
 */
async function getIntentFromLLM(prompt, target_tracks) {
  try {
    // 🚨 CRITICAL: Use proper URL construction for production
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://playlists.jeylabbb.com');
    
    const intentUrl = `${baseUrl}/api/intent`;
    
    console.log('[INTENT][FETCH] Calling intent API:', {
      url: intentUrl,
      hasNextPublicSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasVercelUrl: !!process.env.VERCEL_URL,
      promptSnippet: (prompt || '').slice(0, 50)
    });
    
    const response = await fetch(intentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, target_tracks })
    });
    
    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (e) {
        bodyText = `<failed to read body: ${e?.message || e}>`;
      }
      console.error('[INTENT][FETCH] Intent API failed', {
        status: response.status,
        statusText: response.statusText,
        url: intentUrl,
        promptSnippet: (prompt || '').slice(0, 120),
        target_tracks,
        body: bodyText?.slice(0, 2000)
      });
      throw new Error(`Intent API failed: ${response.status} - ${bodyText?.slice(0, 200)}`);
    }
    
    const result = await response.json();
    console.log('[INTENT][FETCH] Intent API success:', {
      mode: result?.mode,
      tracksCount: result?.tracks?.length || 0,
      artistsCount: result?.artists?.length || 0
    });
    
    return result;
  } catch (error) {
    console.error('[INTENT][FETCH] Failed to get intent from LLM:', {
      error: error.message,
      stack: error.stack,
      promptSnippet: (prompt || '').slice(0, 50)
    });
    return null;
  }
}

/**
 * Determines the mode based on intent and prompt
 */
function determineMode(intent, prompt) {
  const promptLower = (prompt || '').toLowerCase();
  
  console.log(`[MODE-DETECTION] ===== STARTING MODE DETECTION =====`);
  console.log(`[MODE-DETECTION] Original prompt: "${prompt}"`);
  console.log(`[MODE-DETECTION] Intent data:`, {
    mode: intent.mode,
    contexts: intent.contexts?.key || 'none',
    artists_llm: intent.artists_llm?.length || 0,
    tracks_llm: intent.tracks_llm?.length || 0,
    priority_artists: intent.priority_artists?.length || 0,
    filtered_artists: intent.filtered_artists?.length || 0,
    exclusions: intent.exclusions ? 'yes' : 'no'
  });
  
  // If LLM provided a mode, trust it (normalize to known values)
  const llmMode = (intent?.mode || '').toUpperCase();
  if (['NORMAL','VIRAL','FESTIVAL','ARTIST_STYLE','SINGLE_ARTIST'].includes(llmMode)) {
    console.log(`[MODE-DETECTION] Using LLM-provided mode: ${llmMode}`);
    return llmMode;
  }

  // Check for underground mode FIRST (highest priority) - enhanced detection
  const undergroundKeywords = ['underground', 'indie', 'alternativo', 'alternativa', 'independiente', 'independientes'];
  const hasUndergroundKeyword = undergroundKeywords.some(keyword => promptLower.includes(keyword));
  const hasUndergroundContext = intent.contexts && intent.contexts.key === 'underground_es';
  const hasFilteredArtists = intent.filtered_artists && intent.filtered_artists.length > 0;
  
  // Enhanced underground detection: if context is underground_es, force underground mode
  const forceUndergroundMode = hasUndergroundContext;
  
  console.log(`[MODE-DETECTION] Underground analysis:`, {
    promptLower,
    undergroundKeywords,
    hasUndergroundKeyword,
    hasUndergroundContext,
    hasFilteredArtists,
    forceUndergroundMode,
    contextKey: intent.contexts?.key,
    filteredArtistsCount: intent.filtered_artists?.length || 0,
    compassArtists: intent.contexts?.compass?.length || 0
  });
  
  // Return UNDERGROUND if:
  // 1. Has underground keywords AND underground context, OR
  // 2. Has underground context AND filtered artists, OR  
  // 3. FORCE: Has underground context (most important)
  if ((hasUndergroundKeyword && hasUndergroundContext) || 
      (hasUndergroundContext && hasFilteredArtists) || 
      forceUndergroundMode) {
    console.log(`[MODE-DETECTION] ✅ UNDERGROUND MODE DETECTED`);
    console.log(`[MODE-DETECTION] Reason: hasUndergroundKeyword=${hasUndergroundKeyword}, hasUndergroundContext=${hasUndergroundContext}, hasFilteredArtists=${hasFilteredArtists}, forceUndergroundMode=${forceUndergroundMode}`);
    return 'UNDERGROUND';
  }
  
  // Check for viral/current mode
  const viralKeywords = ['tiktok', 'viral', 'virales', 'top', 'charts', 'tendencia', 'tendencias', '2024', '2025'];
  const matchedViralKeywords = viralKeywords.filter(keyword => promptLower.includes(keyword));
  if (matchedViralKeywords.length > 0) {
    console.log(`[MODE-DETECTION] ✅ VIRAL MODE DETECTED`);
    console.log(`[MODE-DETECTION] Reason: Matched viral keywords:`, matchedViralKeywords);
    return 'VIRAL';
  }
  
  // Check for festival mode - detect festival names even without year
  const festivalKeywords = ['coachella', 'ultra', 'tomorrowland', 'edc', 'lollapalooza', 'glastonbury', 'bonnaroo', 'sxsw', 'primavera', 'sonar', 'ibiza', 'festival', 'festivales'];
  const matchedFestivalKeywords = festivalKeywords.filter(keyword => promptLower.includes(keyword));
  
  if (matchedFestivalKeywords.length > 0) {
    console.log(`[MODE-DETECTION] ✅ FESTIVAL MODE DETECTED`);
    console.log(`[MODE-DETECTION] Reason: Matched festival keywords:`, matchedFestivalKeywords);
    return 'FESTIVAL';
  }
  
  // Also check with extractFestivalInfo for more complex festival detection
  const festivalInfo = extractFestivalInfo(prompt);
  if (festivalInfo.name) {
    console.log(`[MODE-DETECTION] ✅ FESTIVAL MODE DETECTED (extracted)`);
    console.log(`[MODE-DETECTION] Reason: extractFestivalInfo found festival:`, festivalInfo);
    return 'FESTIVAL';
  }
  
  // Check for single artist mode (just artist name, no style keywords)
  const styleKeywords = ['estilo', 'como', 'like', 'música', 'canciones', 'playlist', 'mix'];
  const hasStyleKeywords = styleKeywords.some(keyword => promptLower.includes(keyword));
  const words = prompt.trim().split(/\s+/);
  
  console.log(`[MODE-DETECTION] Single artist analysis:`, {
    hasStyleKeywords,
    styleKeywords,
    matchedStyleKeywords: styleKeywords.filter(k => promptLower.includes(k)),
    words,
    wordCount: words.length
  });
  
  if (!hasStyleKeywords && words.length <= 3 && words.length >= 1) {
    console.log(`[MODE-DETECTION] ✅ SINGLE_ARTIST MODE DETECTED`);
    console.log(`[MODE-DETECTION] Reason: No style keywords, word count=${words.length}, prompt="${prompt}"`);
    return 'SINGLE_ARTIST';
  }
  
  // Check for artist style mode (contains "estilo" or "como" or "like") - can include restrictions
  if (promptLower.includes('estilo') || promptLower.includes('como') || promptLower.includes('like')) {
    console.log(`[MODE-DETECTION] ✅ ARTIST_STYLE MODE DETECTED`);
    console.log(`[MODE-DETECTION] Reason: Contains "como" or "like" (can include restrictions)`);
    return 'ARTIST_STYLE';
  }
  
  console.log(`[MODE-DETECTION] ✅ NORMAL MODE DETECTED (default)`);
  console.log(`[MODE-DETECTION] Reason: No specific mode conditions met`);
  return 'NORMAL';
}

/**
 * Limits tracks per artist to avoid excessive repetition
 * 🚨 MEJORADO: Maneja casos especiales (cap infinito, cap 0 para excluidos)
 * @param {Array} tracks - Array of tracks
 * @param {number} maxPerArtist - Maximum tracks per artist (default: 5)
 * @param {Object} specialCases - Casos especiales detectados
 * @param {Object} dynamicCaps - Caps dinámicos calculados
 * @returns {Array} - Filtered tracks array
 */
function limitTracksPerArtist(tracks, maxPerArtist = 5, specialCases = {}, dynamicCaps = {}) {
  const artistCounts = new Map();
  const limitedTracks = [];
  const excludedArtists = (specialCases.excludedArtists || []).map(a => a.toLowerCase());
  const onlyArtists = (specialCases.onlyArtists || []).map(a => a.toLowerCase());
  const onlyArtistsCap = dynamicCaps.onlyArtistsCap === Infinity;
  
  for (const track of tracks) {
    // Normalize artistNames to array of strings
    let namesArr = [];
    if (Array.isArray(track?.artistNames)) {
      namesArr = track.artistNames;
    } else if (typeof track?.artistNames === 'string') {
      namesArr = track.artistNames.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(track?.artists)) {
      namesArr = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
    }

    if (!track || namesArr.length === 0) {
      limitedTracks.push(track);
      continue;
    }
    
    // 🚨 CRITICAL: Verificar si algún artista está excluido (cap = 0)
    const trackArtistsLower = namesArr.map(a => a.toLowerCase());
    const hasExcludedArtist = trackArtistsLower.some(a => excludedArtists.includes(a));
    if (hasExcludedArtist) {
      console.log(`[ARTIST-LIMIT] Skipping track "${track.name}" - contains excluded artist`);
      continue;
    }
    
    // 🚨 CRITICAL: Si hay "solo de X", solo permitir tracks de esos artistas
    if (onlyArtists.length > 0) {
      const hasOnlyArtist = trackArtistsLower.some(a => onlyArtists.includes(a));
      if (!hasOnlyArtist) {
        console.log(`[ARTIST-LIMIT] Skipping track "${track.name}" - not from only artists: ${onlyArtists.join(', ')}`);
        continue;
      }
      // Si es un artista "solo de", cap infinito - siempre permitir
      for (const artist of namesArr) {
        artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      }
      limitedTracks.push(track);
      continue;
    }
    
    // Check if any artist has reached the limit
    let canAdd = true;
    const trackArtists = namesArr;
    
    for (const artist of trackArtists) {
      const artistLower = artist.toLowerCase();
      const count = artistCounts.get(artistLower) || 0;
      
      // Cap infinito para casos especiales
      if (maxPerArtist === Infinity) {
        canAdd = true;
        break;
      }
      
      if (count >= maxPerArtist) {
        canAdd = false;
        console.log(`[ARTIST-LIMIT] Skipping track "${track.name}" by "${artist}" - limit reached (${count}/${maxPerArtist})`);
        break;
      }
    }
    
    if (canAdd) {
      // Increment counters for all artists in this track
      for (const artist of trackArtists) {
        const artistLower = artist.toLowerCase();
        artistCounts.set(artistLower, (artistCounts.get(artistLower) || 0) + 1);
      }
      limitedTracks.push(track);
    }
  }
  
  console.log(`[ARTIST-LIMIT] Limited tracks: ${tracks.length} → ${limitedTracks.length}`);
  for (const [artist, count] of artistCounts.entries()) {
    console.log(`[ARTIST-LIMIT] ${artist}: ${count} tracks`);
  }
  
  return limitedTracks;
}

/**
 * Generator for LLM tracks in chunks - MODE NORMAL: 75% LLM (get 50 by default), others: exact target
 */
async function* yieldLLMChunks(accessToken, intent, target_tracks, traceId, usedTracks = globalUsedTracks) {
  console.log(`[STREAM:${traceId}] ===== STARTING LLM PHASE =====`);
  console.log(`[STREAM:${traceId}] Target tracks: ${target_tracks}`);
  
  // 🚨 CRITICAL: Skip LLM phase for delegated modes, EXCEPT if ARTIST_STYLE with 0 tracks (need fan-out)
  // FEATURE_MULTI_ARTIST_FANOUT: siempre activo por defecto (puede desactivarse con 'false')
  const mode = determineMode(intent, intent.prompt || '');
  const llmTracks = intent.tracks_llm || [];
  const FEATURE_MULTI_ARTIST_FANOUT = process.env.FEATURE_MULTI_ARTIST_FANOUT !== 'false';
  
  // Si es ARTIST_STYLE con tracks_llm=[], NO saltar (ejecutar fan-out en Spotify phase)
  const shouldSkipLLMPhase = (mode === 'ARTIST_STYLE' || mode === 'SINGLE_ARTIST' || mode === 'VIRAL' || mode === 'FESTIVAL') &&
                              !(mode === 'ARTIST_STYLE' && (FEATURE_MULTI_ARTIST_FANOUT || llmTracks.length === 0));
  
  if (shouldSkipLLMPhase) {
    console.log(`[STREAM:${traceId}] 🚨 Delegated mode detected (${mode}) - SKIPPING LLM PHASE COMPLETELY`);
    return;
  }
  
  // Fix crítico: ARTIST_STYLE con tracks_llm=[] debe ejecutar fan-out multi-artista, no saltar
  if (mode === 'ARTIST_STYLE' && llmTracks.length === 0) {
    console.log(`[STREAM:${traceId}] 🚨 ARTIST_STYLE with 0 LLM tracks - will execute multi-artist fan-out in Spotify phase (FEATURE_MULTI_ARTIST_FANOUT=${FEATURE_MULTI_ARTIST_FANOUT})`);
    // No retornar aquí; dejar que continúe (aunque no haya tracks LLM, el fan-out se ejecutará en yieldSpotifyChunks)
  }
  
  console.log(`[STREAM:${traceId}] Intent data:`, {
    mode,
    contexts: intent.contexts?.key || 'none',
    llmTracksCount: intent.tracks_llm?.length || 0,
    artistsCount: intent.artists_llm?.length || 0,
    filteredArtistsCount: intent.filtered_artists?.length || 0,
    priorityArtistsCount: intent.priority_artists?.length || 0,
    exclusions: intent.exclusions ? 'yes' : 'no'
  });
  
  console.log(`[STREAM:${traceId}] LLM TRACKS SOURCE:`, {
    tracks_llm: intent.tracks_llm?.slice(0, 5) || [],
    total_llm_tracks: intent.tracks_llm?.length || 0,
    sample_tracks: intent.tracks_llm?.slice(0, 3).map(t => ({ title: t.title, artist: t.artist })) || []
  });
  
  console.log(`[STREAM:${traceId}] LLM ARTISTS SOURCE:`, {
    artists_llm: intent.artists_llm || [],
    priority_artists: intent.priority_artists || [],
    filtered_artists: intent.filtered_artists || []
  });
  
  // Pre-deduplicate LLM tracks to avoid processing duplicates (llmTracks ya está declarado arriba)
  const uniqueLLMTracks = [];
  const seenTracks = new Set();
  
  for (const track of llmTracks) {
    const trackKey = `${track.title?.toLowerCase()}-${track.artist?.toLowerCase()}`;
    if (!seenTracks.has(trackKey)) {
      seenTracks.add(trackKey);
      uniqueLLMTracks.push(track);
    }
  }
  
  console.log(`[STREAM:${traceId}] LLM tracks deduplication: ${llmTracks.length} → ${uniqueLLMTracks.length}`);
  
  const chunkSize = 20; // Increased chunk size
  let totalYielded = 0;
  let chunkCounter = 0;
  
  if (uniqueLLMTracks.length === 0) {
    console.log(`[STREAM:${traceId}] No unique LLM tracks to process, skipping LLM phase`);
    return;
  }
  
  // Determine mode and LLM target (mode already declared above)
  const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
  const hasContexts = intent.contexts && intent.contexts.key && intent.contexts.key !== 'normal';
  
  let llmTarget;
  if (mode === 'NORMAL' && !isUndergroundStrict && !hasContexts) {
    // MODE NORMAL: Get 70% LLM (but get 50 by default to be safe)
    llmTarget = Math.max(50, Math.ceil(target_tracks * 0.70));
    console.log(`[STREAM:${traceId}] NORMAL mode: LLM target = ${llmTarget} (70% of ${target_tracks})`);
    console.log(`[STREAM:${traceId}] NORMAL mode conditions: isUndergroundStrict=${isUndergroundStrict}, hasContexts=${hasContexts}`);
  } else if (mode === 'VIRAL') {
    // VIRAL mode: LLM prepares terms and delegates everything to Spotify
    llmTarget = 0;
    console.log(`[STREAM:${traceId}] VIRAL mode: LLM target = ${llmTarget} (delegates to Spotify)`);
  } else {
    // Other modes (FESTIVAL, ARTIST_STYLE, CONTEXTS, UNDERGROUND): exact target
    llmTarget = target_tracks;
    console.log(`[STREAM:${traceId}] ${mode} mode: LLM target = ${llmTarget} (exact target)`);
    console.log(`[STREAM:${traceId}] ${mode} mode conditions: isUndergroundStrict=${isUndergroundStrict}, hasContexts=${hasContexts}`);
  }
  
             // Process LLM tracks in chunks until we have enough or run out
             // For NORMAL mode, be more aggressive to reach target
             const maxLLMIterations = mode === 'NORMAL' ? 10 : 5;
             let iteration = 0;
             
             for (let i = 0; i < uniqueLLMTracks.length && totalYielded < llmTarget && iteration < maxLLMIterations; i += chunkSize) {
               iteration++;
    const chunk = uniqueLLMTracks.slice(i, i + chunkSize);
    chunkCounter++;
    console.log(`[STREAM:${traceId}] Processing LLM chunk ${chunkCounter}: ${chunk.length} tracks`);
    
    try {
      const resolved = await resolveTracksBySearch(accessToken, chunk, { exclusions: intent.exclusions });
      const filtered = resolved.filter(track => notExcluded(track, intent.exclusions));
      const deduped = dedupeAgainstUsed(filtered, usedTracks);
      
      if (deduped.length > 0) {
        // Only yield up to the remaining LLM target
        const remaining = llmTarget - totalYielded;
        const toYield = deduped.slice(0, remaining);
        totalYielded += toYield.length;
        
        console.log(`[STREAM:${traceId}] LLM chunk yielded: ${toYield.length} tracks, total: ${totalYielded}/${llmTarget}`);
        yield toYield;
        
        // Add delay between chunks for better UX
        if (totalYielded < llmTarget) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
        
        if (totalYielded >= llmTarget) {
          console.log(`[STREAM:${traceId}] LLM phase reached target: ${totalYielded}`);
          break;
        }
      }
    } catch (error) {
      console.error(`[STREAM:${traceId}] Error processing LLM chunk:`, error);
    }
  }
  
             console.log(`[STREAM:${traceId}] LLM phase completed: ${totalYielded} tracks`);
             
             // If we didn't reach target and have more LLM tracks, try again with smaller chunks
             if (totalYielded < llmTarget && llmTracks.length > totalYielded) {
               console.log(`[STREAM:${traceId}] LLM phase incomplete, trying with smaller chunks...`);
               const remainingLLMTracks = llmTracks.slice(totalYielded);
               const smallChunkSize = 5;
               
               for (let i = 0; i < remainingLLMTracks.length && totalYielded < llmTarget; i += smallChunkSize) {
                 const chunk = remainingLLMTracks.slice(i, i + smallChunkSize);
                 console.log(`[STREAM:${traceId}] Processing small LLM chunk: ${chunk.length} tracks`);
                 
                 try {
                   const resolved = await resolveTracksBySearch(accessToken, chunk, { exclusions: intent.exclusions });
                   const filtered = resolved.filter(track => notExcluded(track, intent.exclusions));
                   
                   if (filtered.length > 0) {
                     const remaining = llmTarget - totalYielded;
                     const toYield = filtered.slice(0, remaining);
                     totalYielded += toYield.length;
                     
                     console.log(`[STREAM:${traceId}] Small LLM chunk yielded: ${toYield.length} tracks, total: ${totalYielded}/${llmTarget}`);
                     yield toYield;
                     
                     if (totalYielded >= llmTarget) break;
                   }
                 } catch (error) {
                   console.error(`[STREAM:${traceId}] Error processing small LLM chunk:`, error);
                 }
               }
             }
}

/**
 * Generator for Spotify tracks in chunks - guarantees exact remaining count for all modes
 */
async function* yieldSpotifyChunks(accessToken, intent, remaining, traceId, usedTracks = globalUsedTracks, targetTracksTotal = null) {
  console.log(`[STREAM:${traceId}] Starting Spotify phase, remaining: ${remaining}, targetTracksTotal: ${targetTracksTotal || 'N/A'}`);
  console.log(`[STREAM:${traceId}] Global usedTracks size: ${usedTracks.size}`);
  console.log(`[STREAM:${traceId}] Spotify phase intent data:`, {
    mode: determineMode(intent, intent.prompt || ''),
    contexts: intent.contexts?.key || 'none',
    artistsCount: intent.artists_llm?.length || 0,
    filteredArtistsCount: intent.filtered_artists?.length || 0,
    priorityArtistsCount: intent.priority_artists?.length || 0,
    canonized: intent.canonized ? 'yes' : 'no',
    exclusions: intent.exclusions ? 'yes' : 'no'
  });
  
  if (remaining <= 0) {
    console.log(`[STREAM:${traceId}] No remaining tracks needed`);
    return;
  }
  
  const mode = determineMode(intent, intent.prompt || '');
  console.log(`[STREAM:${traceId}] DETERMINED MODE: ${mode}`);
  console.log(`[STREAM:${traceId}] PROMPT: "${intent.prompt}"`);
             const chunkSize = 20; // Increased chunk size
  let totalYielded = 0;
  let attempts = 0;
  const maxAttempts = 20; // Increased attempts for better completion
  let chunkCounter = 0;
  
  try {
    // Detect underground strict mode
    const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
    
    if (isUndergroundStrict && intent.contexts && intent.contexts.key === 'underground_es') {
      // Use underground search
      // Enforce exact whitelist matching (diacritics/case-insensitive)
      const norm = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
      const whitelist = Array.isArray(intent.contexts.compass) ? intent.contexts.compass : [];
      const whitelistSet = new Set(whitelist.map(norm));
      const proposed = (intent.filtered_artists && intent.filtered_artists.length > 0 ? intent.filtered_artists : whitelist) || [];
      let allowedArtists = proposed.filter(a => whitelistSet.has(norm(a)));
      // Random subset of whitelist for each execution
      const subsetSize = Math.min(allowedArtists.length, Math.max(8, Math.ceil((remaining || 20) / 3)));
      allowedArtists = allowedArtists.sort(() => Math.random() - 0.5).slice(0, subsetSize);
      
      const prompt = (intent?.prompt || '').toString();
      const isInclusive = /\b(con|que contenga|que tenga alguna|con alguna|con canciones|con temas|con música|con tracks)\b/i.test(prompt);
      const isRestrictive = !isInclusive && /\b(solo|tan solo|solamente|nada más que|solo de|con solo|únicamente|exclusivamente)\b/i.test(prompt);
      
      const priorityArtists = isInclusive ? (intent.priority_artists || []).filter(a => whitelistSet.has(norm(a))) : [];
      const maxPerArtist = 3; // Cap fijo 3 por artista en UNDERGROUND_STRICT
      
      console.log(`[STREAM:${traceId}] UNDERGROUND STRICT MODE DETECTED`);
      console.log(`[STREAM:${traceId}] Underground details:`, {
        allowedArtists: allowedArtists.length,
        priorityArtists: priorityArtists.length,
        maxPerArtist: maxPerArtist,
        isInclusive: isInclusive,
        isRestrictive: isRestrictive,
        prompt: (prompt || '').substring(0, 100) + '...'
      });
      console.log(`[STREAM:${traceId}] Allowed artists sample:`, allowedArtists.slice(0, 5));
      console.log(`[STREAM:${traceId}] Priority artists:`, priorityArtists);
      
      // Add randomness component for UNDERGROUND mode
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
      const seedStr = `${prompt}|${allowedArtists.length}|${Math.floor(Date.now() / 300000)}`; // 5 min window
      const rng = rngSeeded(h32(seedStr));
      console.log(`[STREAM:${traceId}] UNDERGROUND: RNG seeded with "${seedStr}"`);
      
      // Deterministically shuffle allowed artists within 5-min window to avoid always starting from the same heads
      function shuffleWithRng(list, rngFn) {
        const arr = list.slice();
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rngFn() * (i + 1));
          const tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
        return arr;
      }
      const shuffledAllowed = shuffleWithRng(allowedArtists, rng);
      console.log(`[STREAM:${traceId}] UNDERGROUND: Shuffled allowed artists (first 10):`, shuffledAllowed.slice(0, 10));

      const undergroundTracks = dedupeById(await searchUndergroundTracks(
        accessToken,
        shuffledAllowed,
        remaining,
        maxPerArtist,
        rng,
        priorityArtists
      ));
      
      console.log(`[STREAM:${traceId}] Underground search completed: ${undergroundTracks.length} tracks found`);
      console.log(`[STREAM:${traceId}] Underground tracks sample:`, undergroundTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
      
      // Yield in chunks
      for (let i = 0; i < undergroundTracks.length && totalYielded < remaining; i += chunkSize) {
        const chunk = undergroundTracks.slice(i, i + chunkSize);
        const toYield = chunk.slice(0, remaining - totalYielded);
        totalYielded += toYield.length;
        
        if (toYield.length > 0) {
          chunkCounter++;
          console.log(`[STREAM:${traceId}] Underground chunk ${chunkCounter} yielded: ${toYield.length} tracks, total: ${totalYielded}/${remaining}`);
          console.log(`[STREAM:${traceId}] Chunk tracks:`, toYield.map(t => ({ name: t.name, artists: t.artistNames })));
          yield toYield;
          
          // Add delay between chunks for better UX
          if (totalYielded < remaining) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
          }
        }
        
        if (totalYielded >= remaining) break;
      }
      
      console.log(`[STREAM:${traceId}] Underground phase completed: ${totalYielded}/${remaining} tracks`);
      return;
    }
    
    // Mode-specific Spotify generation
    let spotifyTracks = [];
    
    console.log(`[STREAM:${traceId}] ===== MODE SPECIFIC SPOTIFY GENERATION =====`);
    console.log(`[STREAM:${traceId}] Determined mode: "${mode}"`);
    console.log(`[STREAM:${traceId}] Intent mode: "${intent.mode}"`);
    console.log(`[STREAM:${traceId}] Mode comparison - Determined: ${mode}, Intent: ${intent.mode}`);
    console.log(`[STREAM:${traceId}] Mode type check - mode === 'ARTIST_STYLE': ${mode === 'ARTIST_STYLE'}`);
    console.log(`[STREAM:${traceId}] Mode type check - typeof mode: ${typeof mode}`);
    console.log(`[STREAM:${traceId}] Mode type check - mode length: ${mode?.length}`);
    
    if (mode === 'VIRAL') {
      // VIRAL mode: Use consensus from popular playlists
      console.log(`[STREAM:${traceId}] ===== ENTERING VIRAL MODE =====`);
      console.log(`[STREAM:${traceId}] VIRAL MODE: Using playlist consensus`);
      console.log(`[STREAM:${traceId}] VIRAL mode details:`, {
        llmTracks: intent.tracks_llm?.length || 0,
        artists: intent.artists_llm?.length || 0,
        remaining: remaining
      });
      
      try {
        // VIRAL mode: Delegate EVERYTHING to Spotify using playlist consensus
        console.log(`[STREAM:${traceId}] VIRAL: Delegating completely to Spotify via playlist consensus`);
        console.log(`[STREAM:${traceId}] VIRAL: Using canonized data for viral search`);
        
        const canonized = intent.canonized;
        if (!canonized) {
          console.warn(`[STREAM:${traceId}] VIRAL: No canonized data found, skipping viral mode`);
          spotifyTracks = [];
          console.log(`[STREAM:${traceId}] VIRAL: Skipped due to no canonized data`);
        } else {
          console.log(`[STREAM:${traceId}] VIRAL: Using canonized data`, {
            baseQuery: canonized.baseQuery,
            year: canonized.year,
            target: remaining
          });
          
          // Add randomness component for VIRAL mode
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
          const seedStr = `${canonized.baseQuery}|${canonized.year}|${Math.floor(Date.now() / 300000)}`; // 5 min window
          const rng = rngSeeded(h32(seedStr));
          console.log(`[STREAM:${traceId}] VIRAL: RNG seeded with "${seedStr}"`);
          
          // Build queries: prefer intent.search_queries, else name+year variants
          const queries = Array.isArray(intent.search_queries) && intent.search_queries.length
            ? intent.search_queries
            : [
                `${canonized.baseQuery} ${canonized.year || ''}`.trim(),
                `${canonized.year || ''} ${canonized.baseQuery}`.trim(),
                `${canonized.baseQuery} ${canonized.year || ''} lineup`.trim(),
                `${canonized.baseQuery} lineup ${canonized.year || ''}`.trim()
              ].filter(Boolean);

          // Search and merge playlists from queries, remove dups
          let viralPlaylists = [];
          const seenPl = new Set();
          for (const q of queries) {
            const found = await searchPlaylists(accessToken, q, 20);
            for (const p of found) {
              if (p?.id && !seenPl.has(p.id)) {
                seenPl.add(p.id);
                viralPlaylists.push(p);
              }
            }
          }
          
          console.log(`[STREAM:${traceId}] VIRAL: Raw search found ${viralPlaylists.length} playlists (before filtering)`);
          
          // CRITICAL: Filter playlists to ensure ALL search terms are present in title
          if (intent.search_queries && intent.search_queries.length > 0) {
            const searchTerms = intent.search_queries;
            const beforeFilter = viralPlaylists.length;
            
            viralPlaylists = viralPlaylists.filter(p => {
              const titleNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
              // ALL terms MUST be in title
              const hasAllTerms = searchTerms.every(term => {
                const termNorm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');
                return titleNorm.includes(termNorm);
              });
              return hasAllTerms;
            });
            
            console.log(`[STREAM:${traceId}] VIRAL: Filtered playlists: ${beforeFilter} → ${viralPlaylists.length} (ALL terms required: ${searchTerms.join(', ')})`);
          }
          
          // Fallback to generic function if still empty
          if (viralPlaylists.length === 0) {
            viralPlaylists = await searchFestivalLikePlaylists({ 
              accessToken, 
              baseQuery: canonized.baseQuery, 
              year: canonized.year,
              searchTerms: intent.search_queries || null
            });
          }
          
          console.log(`[STREAM:${traceId}] VIRAL: Found ${viralPlaylists.length} playlists (after all filtering)`);
          
            if (viralPlaylists.length > 0) {
              // Sort playlists by popularity (followers)
              const sortedPlaylists = [...viralPlaylists].sort((a, b) => 
                (b.followers?.total || 0) - (a.followers?.total || 0)
              );
              
              console.log(`[STREAM:${traceId}] VIRAL: Sorted ${sortedPlaylists.length} playlists by popularity`);
              console.log(`[STREAM:${traceId}] ========== ALL VIRAL PLAYLISTS FOUND ==========`);
              sortedPlaylists.forEach((p, idx) => {
                console.log(`[STREAM:${traceId}] VIRAL PL ${idx + 1}/${sortedPlaylists.length}: "${p.name}" (${p.followers?.total || 0} followers, owner: ${p.owner?.display_name || 'unknown'})`);
              });
              console.log(`[STREAM:${traceId}] ========== END OF PLAYLISTS ==========`);
              
              // Step 1: Try consensus with artist cap of 3 (ALL playlists)
              let candidateTracks = await collectFromPlaylistsByConsensus({
                accessToken,
                playlists: sortedPlaylists,
                target: remaining, // Get exactly what we need
                artistCap: 3,
                rng: rng
              });
              
              console.log(`[STREAM:${traceId}] VIRAL: Consensus with cap=3 yielded ${candidateTracks.length} tracks`);
              
              // If we have enough tracks, skip all compensation
              if (candidateTracks.length >= remaining) {
                console.log(`[STREAM:${traceId}] VIRAL: Already have enough tracks (${candidateTracks.length}/${remaining}), skipping compensation`);
                spotifyTracks = dedupeById(candidateTracks.slice(0, remaining));
              }
              // If not enough tracks, start adding full playlists one by one (most popular first)
              else if (candidateTracks.length < remaining) {
                console.log(`[STREAM:${traceId}] VIRAL: Not enough tracks (${candidateTracks.length}/${remaining}), adding full playlists`);
                
                const usedTrackIds = new Set(candidateTracks.map(t => t.id));
                
                for (const playlist of sortedPlaylists) {
                  if (candidateTracks.length >= remaining) break;
                  
                  console.log(`[STREAM:${traceId}] VIRAL: Adding all tracks from "${playlist.name}" (${playlist.followers?.total || 0} followers)`);
                  
                  // Get ALL tracks from this playlist
                  const playlistTracks = await loadPlaylistItemsBatch(accessToken, [playlist], { limitPerPlaylist: 200 });
                  
                  for (const track of playlistTracks) {
                    if (candidateTracks.length >= remaining) break;
                    if (!track.id || usedTrackIds.has(track.id)) continue;
                    
                    candidateTracks.push(track);
                    usedTrackIds.add(track.id);
                  }
                  
                  console.log(`[STREAM:${traceId}] VIRAL: Now have ${candidateTracks.length} tracks`);
                }
              }
              
              // If still not enough, fill 1 by 1 with artists already used
              if (candidateTracks.length < remaining) {
                const missing = remaining - candidateTracks.length;
                console.log(`[STREAM:${traceId}] VIRAL: Still missing ${missing} tracks, filling 1 by 1 with existing artists`);
                
                // Get unique artists from tracks we have
                const artistCounts = new Map();
                candidateTracks.forEach(track => {
                  let namesArr = [];
                  if (Array.isArray(track?.artistNames)) namesArr = track.artistNames;
                  else if (typeof track?.artistNames === 'string') namesArr = track.artistNames.split(',').map(s => s.trim()).filter(Boolean);
                  else if (Array.isArray(track?.artists)) namesArr = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                  
                  namesArr.forEach(artist => {
                    artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
                  });
                });
                
                // Sort artists by count (least used first)
                const sortedArtists = [...artistCounts.entries()].sort((a, b) => a[1] - b[1]);
                console.log(`[STREAM:${traceId}] VIRAL: Have ${sortedArtists.length} unique artists to fill from`);
                
                const usedTrackIds = new Set(candidateTracks.map(t => t.id));
                let fillAttempts = 0;
                const maxFillAttempts = sortedArtists.length * 3; // Max 3 rounds
                
                while (candidateTracks.length < remaining && fillAttempts < maxFillAttempts) {
                  const artistIndex = fillAttempts % sortedArtists.length;
                  const [artistName, currentCount] = sortedArtists[artistIndex];
                  
                  // Search for 1 track from this artist
                  const moreTracks = await searchTracksByArtists(accessToken, [artistName], 5);
                  
                  for (const track of moreTracks) {
                    if (candidateTracks.length >= remaining) break;
                    if (!track.id || usedTrackIds.has(track.id)) continue;
                    
                    candidateTracks.push(track);
                    usedTrackIds.add(track.id);
                    sortedArtists[artistIndex][1]++; // Update count
                    break; // Only add 1 track per attempt
                  }
                  
                  fillAttempts++;
                }
                
                console.log(`[STREAM:${traceId}] VIRAL: After 1-by-1 fill: ${candidateTracks.length} tracks (${fillAttempts} attempts)`);
                spotifyTracks = dedupeById(candidateTracks.slice(0, remaining));
              }
          } else {
            console.log(`[STREAM:${traceId}] VIRAL: No playlists found, skipping viral mode`);
            spotifyTracks = [];
          }
          
          console.log(`[STREAM:${traceId}] VIRAL final: ${spotifyTracks.length} tracks`);
        }
        
        console.log(`[STREAM:${traceId}] VIRAL: Generated ${spotifyTracks.length}/${remaining} tracks`);
        console.log(`[STREAM:${traceId}] VIRAL tracks sample:`, spotifyTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
      } catch (err) {
        console.error(`[STREAM:${traceId}] VIRAL Error:`, err);
        spotifyTracks = [];
      }
      
    } else if (mode === 'FESTIVAL') {
      // FESTIVAL mode: Use playlist consensus
      console.log(`[STREAM:${traceId}] ===== ENTERING FESTIVAL MODE =====`);
      console.log(`[STREAM:${traceId}] FESTIVAL MODE: Using playlist consensus`);
      
      try {
        const canonized = intent.canonized;
        if (!canonized) {
          console.warn(`[STREAM:${traceId}] FESTIVAL: No canonized data found, using fallback`);
          spotifyTracks = dedupeById(await radioFromRelatedTop(accessToken, intent.artists_llm || [], remaining));
          console.log(`[STREAM:${traceId}] FESTIVAL fallback: ${spotifyTracks.length} tracks`);
        } else {
          console.log(`[STREAM:${traceId}] FESTIVAL: Using canonized data`, {
            baseQuery: canonized.baseQuery,
            year: canonized.year,
            target: remaining
          });
          
          // Add randomness component for FESTIVAL mode
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
          // 🚨 MEJORA: Seed más variado para mejor aleatoriedad (incluye timestamp más granular)
          const seedStr = `${canonized.baseQuery}|${canonized.year}|${Date.now()}`; // Timestamp completo para más variabilidad
          const rng = rngSeeded(h32(seedStr));
          console.log(`[STREAM:${traceId}] FESTIVAL: RNG seeded with "${seedStr}"`);
          
          // Build queries: prefer intent.search_queries, else name+year variants
          const queries = Array.isArray(intent.search_queries) && intent.search_queries.length
            ? intent.search_queries
            : [
                `${canonized.baseQuery} ${canonized.year || ''}`.trim(),
                `${canonized.year || ''} ${canonized.baseQuery}`.trim(),
                `${canonized.baseQuery} ${canonized.year || ''} lineup`.trim(),
                `${canonized.baseQuery} lineup ${canonized.year || ''}`.trim()
              ].filter(Boolean);

          // Search and merge playlists from queries, remove dups
          let festivalPlaylists = [];
          const seenPl = new Set();
          for (const q of queries) {
            const found = await searchPlaylists(accessToken, q, 20);
            for (const p of found) {
              if (p?.id && !seenPl.has(p.id)) {
                seenPl.add(p.id);
                festivalPlaylists.push(p);
              }
            }
          }
          
          console.log(`[STREAM:${traceId}] FESTIVAL: Raw search found ${festivalPlaylists.length} playlists (before filtering)`);
          
          // 🚨 MEJORA: Priorizar playlists con año en el título, solo buscar sin año si no hay suficientes
          let playlistsWithYear = [];
          let playlistsWithoutYear = [];
          
          if (intent.search_queries && intent.search_queries.length > 0) {
            const searchTerms = intent.search_queries;
            const beforeFilter = festivalPlaylists.length;
            const yearStr = canonized.year ? String(canonized.year) : null;
            
            // Separar playlists: con año vs sin año
            for (const p of festivalPlaylists) {
              const titleNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
              // Verificar que TODOS los términos estén en el título
              const hasAllTerms = searchTerms.every(term => {
                const termNorm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');
                return titleNorm.includes(termNorm);
              });
              
              if (hasAllTerms) {
                // Verificar si tiene el año en el título
                const hasYearInTitle = yearStr ? titleNorm.includes(yearStr) : true;
                if (hasYearInTitle) {
                  playlistsWithYear.push(p);
                } else {
                  playlistsWithoutYear.push(p);
                }
              }
            }
            
            console.log(`[STREAM:${traceId}] FESTIVAL: Filtered playlists: ${beforeFilter} → ${playlistsWithYear.length} with year, ${playlistsWithoutYear.length} without year (ALL terms required: ${searchTerms.join(', ')})`);
            
            // 🚨 CRITICAL: Solo usar playlists sin año si no hay suficientes con año
            // Necesitamos al menos 2-3 playlists para tener buen consenso
            const MIN_PLAYLISTS_WITH_YEAR = 2;
            if (playlistsWithYear.length >= MIN_PLAYLISTS_WITH_YEAR) {
              festivalPlaylists = playlistsWithYear;
              console.log(`[STREAM:${traceId}] FESTIVAL: Using ${playlistsWithYear.length} playlists WITH year (sufficient)`);
            } else if (playlistsWithYear.length > 0) {
              // Si hay algunas con año pero no suficientes, combinarlas con las sin año
              festivalPlaylists = [...playlistsWithYear, ...playlistsWithoutYear];
              console.log(`[STREAM:${traceId}] FESTIVAL: Using ${playlistsWithYear.length} with year + ${playlistsWithoutYear.length} without year (insufficient with year)`);
            } else {
              // Si no hay ninguna con año, usar las sin año como último recurso
              festivalPlaylists = playlistsWithoutYear;
              console.log(`[STREAM:${traceId}] FESTIVAL: No playlists with year found, using ${playlistsWithoutYear.length} without year (fallback)`);
            }
          } else {
            // Si no hay search_queries, filtrar por año si está disponible
            if (canonized.year) {
              const yearStr = String(canonized.year);
              const beforeFilter = festivalPlaylists.length;
              
              playlistsWithYear = festivalPlaylists.filter(p => {
                const titleNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                return titleNorm.includes(yearStr);
              });
              
              playlistsWithoutYear = festivalPlaylists.filter(p => {
                const titleNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                return !titleNorm.includes(yearStr);
              });
              
              const MIN_PLAYLISTS_WITH_YEAR = 2;
              if (playlistsWithYear.length >= MIN_PLAYLISTS_WITH_YEAR) {
                festivalPlaylists = playlistsWithYear;
                console.log(`[STREAM:${traceId}] FESTIVAL: Filtered by year: ${beforeFilter} → ${playlistsWithYear.length} with year (sufficient)`);
              } else if (playlistsWithYear.length > 0) {
                festivalPlaylists = [...playlistsWithYear, ...playlistsWithoutYear];
                console.log(`[STREAM:${traceId}] FESTIVAL: Filtered by year: ${beforeFilter} → ${playlistsWithYear.length} with year + ${playlistsWithoutYear.length} without (insufficient)`);
              } else {
                festivalPlaylists = playlistsWithoutYear;
                console.log(`[STREAM:${traceId}] FESTIVAL: No playlists with year, using ${playlistsWithoutYear.length} without year (fallback)`);
              }
            }
          }
          
          // Fallback to generic function ONLY if still empty
          if (festivalPlaylists.length === 0) {
            console.log(`[STREAM:${traceId}] FESTIVAL: No playlists found after filtering, trying fallback search`);
            festivalPlaylists = await searchFestivalLikePlaylists({ 
              accessToken, 
              baseQuery: canonized.baseQuery, 
              year: canonized.year,
              searchTerms: intent.search_queries || null
            });
          }
          
          console.log(`[STREAM:${traceId}] FESTIVAL: Found ${festivalPlaylists.length} playlists (after all filtering)`);
          
          if (festivalPlaylists.length > 0) {
            // 🚨 MEJORA: Añadir aleatoriedad en la selección de playlists
            // Mezclar playlists antes de ordenar para añadir variabilidad
            const shuffled = [...festivalPlaylists];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(rng() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // Sort playlists by popularity (followers), pero con ligera aleatoriedad
            // Añadir un factor aleatorio pequeño para variar el orden
            const sortedPlaylists = shuffled.sort((a, b) => {
              const followersA = (a.followers?.total || 0);
              const followersB = (b.followers?.total || 0);
              // Añadir ruido aleatorio pequeño (±10% de diferencia) para variar el orden
              const noiseA = (rng() - 0.5) * followersA * 0.1;
              const noiseB = (rng() - 0.5) * followersB * 0.1;
              return (followersB + noiseB) - (followersA + noiseA);
            });
            
            console.log(`[STREAM:${traceId}] FESTIVAL: Sorted ${sortedPlaylists.length} playlists by popularity (with randomness)`);
            console.log(`[STREAM:${traceId}] ========== ALL FESTIVAL PLAYLISTS FOUND ==========`);
            sortedPlaylists.forEach((p, idx) => {
              console.log(`[STREAM:${traceId}] FESTIVAL PL ${idx + 1}/${sortedPlaylists.length}: "${p.name}" (${p.followers?.total || 0} followers, owner: ${p.owner?.display_name || 'unknown'})`);
            });
            console.log(`[STREAM:${traceId}] ========== END OF PLAYLISTS ==========`);
            
            // Step 1: Try consensus with artist cap of 3 (ALL playlists)
            let candidateTracks = await collectFromPlaylistsByConsensus({
              accessToken,
              playlists: sortedPlaylists,
              target: remaining, // Get exactly what we need
              artistCap: 3,
              rng: rng
            });
            
            console.log(`[STREAM:${traceId}] FESTIVAL: Consensus with cap=3 yielded ${candidateTracks.length} tracks`);
            
            // If we have enough tracks, skip all compensation
            if (candidateTracks.length >= remaining) {
              console.log(`[STREAM:${traceId}] FESTIVAL: Already have enough tracks (${candidateTracks.length}/${remaining}), skipping compensation`);
              spotifyTracks = candidateTracks.slice(0, remaining);
            }
            // If not enough tracks, start adding full playlists one by one (most popular first)
            else if (candidateTracks.length < remaining) {
              console.log(`[STREAM:${traceId}] FESTIVAL: Not enough tracks (${candidateTracks.length}/${remaining}), adding full playlists`);
              
              const usedTrackIds = new Set(candidateTracks.map(t => t.id));
              
              for (const playlist of sortedPlaylists) {
                if (candidateTracks.length >= remaining) break;
                
                console.log(`[STREAM:${traceId}] FESTIVAL: Adding all tracks from "${playlist.name}" (${playlist.followers?.total || 0} followers)`);
                
                // Get ALL tracks from this playlist
                const playlistTracks = await loadPlaylistItemsBatch(accessToken, [playlist], { limitPerPlaylist: 200 });
                
                for (const track of playlistTracks) {
                  if (candidateTracks.length >= remaining) break;
                  if (!track.id || usedTrackIds.has(track.id)) continue;
                  
                  candidateTracks.push(track);
                  usedTrackIds.add(track.id);
                }
                
                console.log(`[STREAM:${traceId}] FESTIVAL: Now have ${candidateTracks.length} tracks`);
              }
            }
            
            // If still not enough, fill 1 by 1 with artists already used
            if (candidateTracks.length < remaining) {
              const missing = remaining - candidateTracks.length;
              console.log(`[STREAM:${traceId}] FESTIVAL: Still missing ${missing} tracks, filling 1 by 1 with existing artists`);
              
              // Get unique artists from tracks we have
              const artistCounts = new Map();
              candidateTracks.forEach(track => {
                let namesArr = [];
                if (Array.isArray(track?.artistNames)) namesArr = track.artistNames;
                else if (typeof track?.artistNames === 'string') namesArr = track.artistNames.split(',').map(s => s.trim()).filter(Boolean);
                else if (Array.isArray(track?.artists)) namesArr = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                
                namesArr.forEach(artist => {
                  artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
                });
              });
              
              // Sort artists by count (least used first)
              const sortedArtists = [...artistCounts.entries()].sort((a, b) => a[1] - b[1]);
              console.log(`[STREAM:${traceId}] FESTIVAL: Have ${sortedArtists.length} unique artists to fill from`);
              
              const usedTrackIds = new Set(candidateTracks.map(t => t.id));
              let fillAttempts = 0;
              const maxFillAttempts = sortedArtists.length * 3; // Max 3 rounds
              
              while (candidateTracks.length < remaining && fillAttempts < maxFillAttempts) {
                const artistIndex = fillAttempts % sortedArtists.length;
                const [artistName, currentCount] = sortedArtists[artistIndex];
                
                // Search for 1 track from this artist
                const moreTracks = await searchTracksByArtists(accessToken, [artistName], 5);
                
                for (const track of moreTracks) {
                  if (candidateTracks.length >= remaining) break;
                  if (!track.id || usedTrackIds.has(track.id)) continue;
                  
                  candidateTracks.push(track);
                  usedTrackIds.add(track.id);
                  sortedArtists[artistIndex][1]++; // Update count
                  break; // Only add 1 track per attempt
                }
                
                fillAttempts++;
              }
              
              console.log(`[STREAM:${traceId}] FESTIVAL: After 1-by-1 fill: ${candidateTracks.length} tracks (${fillAttempts} attempts)`);
              spotifyTracks = candidateTracks.slice(0, remaining);
            }
          } else {
            console.log(`[STREAM:${traceId}] FESTIVAL: No playlists found, using radio fallback`);
            spotifyTracks = dedupeById(await radioFromRelatedTop(accessToken, intent.artists_llm || [], remaining));
          }
          
          console.log(`[STREAM:${traceId}] FESTIVAL final: ${spotifyTracks.length} tracks`);
        }
        
        spotifyTracks = spotifyTracks.slice(0, remaining); // Ensure exact count
        console.log(`[STREAM:${traceId}] FESTIVAL: Final result: ${spotifyTracks.length}/${remaining} tracks`);
        console.log(`[STREAM:${traceId}] FESTIVAL tracks sample:`, spotifyTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
      } catch (err) {
        console.error(`[STREAM:${traceId}] FESTIVAL Error:`, err);
        spotifyTracks = [];
      }
      
    } else if (mode === 'SINGLE_ARTIST') {
      // SINGLE_ARTIST mode: Search ONLY tracks from the specific artist
      console.log(`[STREAM:${traceId}] ===== ENTERING SINGLE_ARTIST MODE =====`);
      console.log(`[STREAM:${traceId}] SINGLE_ARTIST MODE: Searching only tracks from specific artist`);
      console.log(`[STREAM:${traceId}] SINGLE_ARTIST details:`, {
        prompt: intent.prompt,
        remaining: remaining
      });
      
      try {
        const artistName = (Array.isArray(intent.restricted_artists) && intent.restricted_artists[0])
          ? String(intent.restricted_artists[0]).trim()
          : String(intent.prompt || '').trim();
        if (!artistName) {
          console.warn(`[STREAM:${traceId}] SINGLE_ARTIST: No artist name found in prompt, skipping`);
          spotifyTracks = [];
        } else {
          console.log(`[STREAM:${traceId}] SINGLE_ARTIST: Searching tracks for "${artistName}"`);
          
          // Search for tracks where the artist appears (main artist OR collaborator)
          spotifyTracks = dedupeById(await searchTracksByArtists(accessToken, [artistName], remaining));
          
          // Filter to ensure the artist appears in the track (main artist OR collaborator)
          spotifyTracks = spotifyTracks.filter(track => {
            const artists = track.artistNames || track.artists || [];
            return artists.some(artist => 
              artist.toLowerCase().includes(artistName.toLowerCase())
            );
          });
          // Apply exclusions if any (shouldn't remove the target artist unless banned explicitly)
          if (intent.exclusions) {
            const before = spotifyTracks.length;
            spotifyTracks = spotifyTracks.filter(t => notExcluded(t, intent.exclusions));
            console.log(`[STREAM:${traceId}] SINGLE_ARTIST: Exclusions applied ${before} → ${spotifyTracks.length}`);
          }
          
          console.log(`[STREAM:${traceId}] SINGLE_ARTIST: Found ${spotifyTracks.length} tracks where "${artistName}" appears (main artist or collaborator)`);
        }
        
        spotifyTracks = spotifyTracks.slice(0, remaining); // Ensure exact count
        console.log(`[STREAM:${traceId}] SINGLE_ARTIST: Final result: ${spotifyTracks.length}/${remaining} tracks`);
        console.log(`[STREAM:${traceId}] SINGLE_ARTIST tracks sample:`, spotifyTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
      } catch (err) {
        console.error(`[STREAM:${traceId}] SINGLE_ARTIST Error:`, err);
        spotifyTracks = [];
      }
      
    } else if (mode === 'ARTIST_STYLE') {
      // Fan-out multi-artista orden-invariante con caps en tiempo real
      // FEATURE flags (siempre activos por defecto, pueden desactivarse explícitamente con 'false')
      const FEATURE_MULTI_ARTIST_FANOUT = process.env.FEATURE_MULTI_ARTIST_FANOUT !== 'false';
      const FEATURE_ENFORCE_CAPS_DURING_BUILD = process.env.FEATURE_ENFORCE_CAPS_DURING_BUILD !== 'false';
      const FEATURE_SMART_COMPENSATION = process.env.FEATURE_SMART_COMPENSATION !== 'false';
      const FEATURE_ARTIST_RESOLVER_STRICT = process.env.FEATURE_ARTIST_RESOLVER_STRICT !== 'false';
      const FEATURE_SPOTIFY_MARKET_FALLBACK = process.env.FEATURE_SPOTIFY_MARKET_FALLBACK !== 'false';
      
      // Configuración de caps (con defaults)
      const PRIORITY_PER_ARTIST_CAP_DEFAULT = Number.parseInt(process.env.PRIORITY_PER_ARTIST_CAP_DEFAULT || '10', 10);
      const NON_PRIORITY_PER_ARTIST_CAP_DEFAULT = Number.parseInt(process.env.NON_PRIORITY_PER_ARTIST_CAP_DEFAULT || '5', 10);
      
      console.log(`[STREAM:${traceId}] ===== ENTERING ARTIST_STYLE MODE =====`);
      console.log(`[STREAM:${traceId}] ARTIST_STYLE details:`, {
        priorityArtists: intent.priority_artists?.length || 0,
        remaining: remaining,
        flags: {
          FEATURE_MULTI_ARTIST_FANOUT,
          FEATURE_ENFORCE_CAPS_DURING_BUILD,
          FEATURE_SMART_COMPENSATION,
          FEATURE_ARTIST_RESOLVER_STRICT,
          FEATURE_SPOTIFY_MARKET_FALLBACK
        },
        caps: {
          PRIORITY_PER_ARTIST_CAP_DEFAULT,
          NON_PRIORITY_PER_ARTIST_CAP_DEFAULT
        }
      });
      
      try {
        const priorityArtistsRaw = intent.priority_artists || [];
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Raw priority artists:`, priorityArtistsRaw);
        
        if (priorityArtistsRaw.length === 0) {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: No priority artists, skipping`);
          spotifyTracks = [];
          return;
        }
        
        // Resolver artistas con deduplicación por ID
        // FEATURE_ARTIST_RESOLVER_STRICT: usa resolución estricta, sino fallback a nombres originales
        let priorityArtists = priorityArtistsRaw;
        let resolvedArtists = new Map(); // nombre → artista resuelto { id, name }
        let resolverDecisions = [];
        let distinctPriority = priorityArtistsRaw.length;
        let resolutionAliases = null; // Para log de alias colapsados
        
        if (FEATURE_ARTIST_RESOLVER_STRICT) {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Resolving artists with strict deduplication (FEATURE_ARTIST_RESOLVER_STRICT enabled)`);
          const market = process.env.SPOTIFY_MARKET || 'ES';
          const resolution = await resolveArtistsWithDeduplication(accessToken, priorityArtistsRaw, market);
          
          resolvedArtists = resolution.distinct;
          resolverDecisions = resolution.decisions;
          distinctPriority = resolution.distinct.size; // Colapsa por ID único
          resolutionAliases = resolution.aliases || null; // Guardar aliases para log
        } else {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Using raw artist names (FEATURE_ARTIST_RESOLVER_STRICT disabled)`);
          // Fallback: crear mapa de nombres → nombres (sin resolución)
          for (const name of priorityArtistsRaw) {
            resolvedArtists.set(name, { id: null, name });
          }
          distinctPriority = priorityArtistsRaw.length;
        }
        
        // Usar nombres resueltos (no los originales si son alias)
        priorityArtists = Array.from(resolvedArtists.keys());
        
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Resolved ${priorityArtistsRaw.length} names → ${distinctPriority} distinct IDs`);
        
        // Log resolverDecisions para telemetría
        if (FEATURE_ARTIST_RESOLVER_STRICT && resolverDecisions.length > 0) {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Resolver decisions:`, JSON.stringify(resolverDecisions, null, 2));
        }
        
        // Log alias colapsados
        if (resolutionAliases && resolutionAliases.size > 0) {
          for (const [artistId, aliases] of resolutionAliases.entries()) {
            if (aliases.length > 1) {
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Collapsed aliases ${aliases.join(', ')} → same ID ${artistId}`);
            }
          }
        }
        
        if (distinctPriority === 0) {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: No valid artists resolved, skipping`);
          spotifyTracks = [];
          return;
        }
        
        // 🚨 CRITICAL: Calcular distribución usando target_tracks TOTAL (no remaining)
        // 🚨 MEJORADO: Detectar casos especiales y calcular caps dinámicos
        const targetForDistribution = targetTracksTotal || remaining;
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Using targetTracksTotal=${targetForDistribution} for distribution (remaining=${remaining})`);
        
        // Detectar casos especiales del prompt
        const specialCases = detectSpecialCases(
          intent.prompt || '',
          priorityArtistsRaw,
          intent.exclusions?.banned_artists || []
        );
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Special cases detected:`, JSON.stringify(specialCases));
        
        // Calcular caps dinámicos
        const dynamicCaps = calculateDynamicCaps(
          targetForDistribution,
          distinctPriority,
          specialCases,
          specialCases.onlyArtists.length > 0
        );
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Dynamic caps calculated:`, JSON.stringify(dynamicCaps));
        
        const distribution = calculateMultiArtistDistribution(
          targetForDistribution,
          distinctPriority,
          dynamicCaps,
          specialCases
        );
        
        const { bucketPlan, perPriorityCap, nonPriorityCap } = distribution;
        
        // 🚨 CRITICAL: Guardar artistId en bucketPlan para verificación por ID
        // Mapear bucket idx → artista (orden-invariante: procesar en orden de entrada)
        const bucketToArtist = new Map();
        const bucketToArtistId = new Map(); // bucket idx → artistId
        let bucketIdx = 0;
        for (const artistName of priorityArtists) {
          bucketToArtist.set(bucketIdx, artistName);
          const resolvedArtist = resolvedArtists.get(artistName);
          const artistId = resolvedArtist?.id || null;
          const resolvedName = resolvedArtist?.name || artistName;
          bucketToArtistId.set(bucketIdx, artistId);
          
          // Actualizar bucketPlan con artistId y resolvedName
          const bucket = bucketPlan.get(bucketIdx);
          if (bucket) {
            bucket.artistId = artistId; // ✅ Nuevo: guardar artistId
            bucket.artistName = resolvedName; // ✅ Nuevo: guardar nombre resuelto
            bucket.originalNames = [artistName]; // Para alias
          }
          
          bucketIdx++;
        }
        
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Bucket plan:`, JSON.stringify(
          Array.from(bucketPlan.entries()).map(([idx, bucket]) => ({
            idx,
            artistId: bucket.artistId || null,
            artistName: bucket.artistName || null,
            target: bucket.target,
            cap: bucket.cap
          })),
          null,
          2
        ));
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Caps - priority=${perPriorityCap}, non-priority=${nonPriorityCap}`);
        
        // Contadores por artista (normalizados a lowercase) y por bucket
        const artistCounters = new Map(); // artista (lowercase) → count
        const bucketTracks = new Map(); // bucket idx → array de tracks
        const allTracksCollected = [];
        const seenTrackIds = new Set();
        const addsByArtist = new Map(); // artista → adds count
        const skipsByCap = new Map(); // artista → skips count
        
        // Helper: añade track con validación de cap en tiempo real Y verificación de bucket
        // FEATURE_ARTIST_RESOLVER_STRICT: verifica por ID primero, luego nombre normalizado
        const addTrackWithCap = (track, bucketIdx, isPriority = true, expectedBucketArtistName = null) => {
          if (!track || !track.id || seenTrackIds.has(track.id)) return false;
          
          // Aplicar exclusiones
          if (intent.exclusions && notExcluded(track, intent.exclusions) === false) {
            return false;
          }
          
          // Normalizar artista principal
          const mainArtistName = (track.artists?.[0]?.name || track.artistNames?.[0] || 'Unknown').toLowerCase();
          const currentArtistCount = artistCounters.get(mainArtistName) || 0;
          const cap = isPriority ? perPriorityCap : nonPriorityCap;
          
          // 🚨 CRITICAL: Verificar que el track pertenezca al bucket correcto
          // FEATURE_ARTIST_RESOLVER_STRICT: verifica por ID primero, luego nombre normalizado (fallback)
          if (isPriority && bucketIdx >= 0) {
            const bucket = bucketPlan.get(bucketIdx);
            if (!bucket) return false;
            
            const bucketArtistId = bucket.artistId || null;
            const bucketArtistName = bucket.artistName || expectedBucketArtistName || null;
            
            let belongsToBucket = false;
            
            // Estrategia 1: Verificar por ID (más preciso, solo si FEATURE_ARTIST_RESOLVER_STRICT)
            if (FEATURE_ARTIST_RESOLVER_STRICT && bucketArtistId) {
              const trackArtistIds = (track.artists || [])
                .map(a => (typeof a === 'object' && a?.id ? a.id : null))
                .filter(Boolean);
              
              belongsToBucket = trackArtistIds.includes(bucketArtistId);
              
              if (!belongsToBucket && bucketArtistName) {
                // Estrategia 2: Verificar por nombre normalizado (fallback para alias/variantes)
                // 🚨 MEJORA: Más tolerante con variantes de nombres (ej: "anuel" vs "anuelaa")
                const normalizedBucketName = normalizeForComparison(bucketArtistName);
                const trackArtistsNormalized = (track.artists || track.artistNames || [])
                  .map(a => {
                    const name = typeof a === 'string' ? a : (a?.name || '');
                    return normalizeForComparison(name);
                  })
                  .filter(Boolean);
                
                // Verificar coincidencia exacta
                belongsToBucket = trackArtistsNormalized.includes(normalizedBucketName);
                
                // Si no hay coincidencia exacta, verificar si uno contiene al otro (más tolerante)
                if (!belongsToBucket && normalizedBucketName.length > 0) {
                  for (const trackArtistNorm of trackArtistsNormalized) {
                    // Si el nombre del bucket está contenido en el nombre del track, o viceversa
                    // (ej: "anuel" está contenido en "anuelaa", o "anuelaa" contiene "anuel")
                    if (trackArtistNorm.includes(normalizedBucketName) || normalizedBucketName.includes(trackArtistNorm)) {
                      // Verificar que la coincidencia sea significativa (al menos 4 caracteres)
                      const minLength = Math.min(normalizedBucketName.length, trackArtistNorm.length);
                      if (minLength >= 4) {
                        belongsToBucket = true;
                        console.log(`[STREAM:${traceId}] ARTIST_STYLE: [bucket_match_fallback] Accepted track by name containment: bucket="${bucketArtistName}" (normalized: "${normalizedBucketName}") matches track artist="${trackArtistNorm}"`);
                        break;
                      }
                    }
                  }
                }
              }
            } else {
              // Fallback legacy: verificar por nombre (sin normalización avanzada)
              if (bucketArtistName || expectedBucketArtistName) {
                const expectedArtistLower = (bucketArtistName || expectedBucketArtistName).toLowerCase();
                const trackArtistsLower = (track.artists || track.artistNames || [])
                  .map(a => (typeof a === 'string' ? a : a?.name || '').toLowerCase())
                  .filter(Boolean);
                
                // Verificar coincidencia exacta
                belongsToBucket = trackArtistsLower.includes(expectedArtistLower);
                
                // Si no hay coincidencia exacta, verificar si uno contiene al otro (más tolerante)
                if (!belongsToBucket && expectedArtistLower.length > 0) {
                  for (const trackArtistLower of trackArtistsLower) {
                    if (trackArtistLower.includes(expectedArtistLower) || expectedArtistLower.includes(trackArtistLower)) {
                      const minLength = Math.min(expectedArtistLower.length, trackArtistLower.length);
                      if (minLength >= 4) {
                        belongsToBucket = true;
                        console.log(`[STREAM:${traceId}] ARTIST_STYLE: [bucket_match_fallback] Accepted track by name containment (legacy): bucket="${bucketArtistName || expectedBucketArtistName}" matches track artist="${trackArtistLower}"`);
                        break;
                      }
                    }
                  }
                }
              }
            }
            
            if (!belongsToBucket) {
              // Log de rechazo detallado para telemetría
              const bucketArtistIdStr = bucketArtistId || 'null';
              const trackArtistIds = (track.artists || [])
                .map(a => (typeof a === 'object' && a?.id ? a.id : null))
                .filter(Boolean);
              const trackArtistNames = (track.artists || track.artistNames || [])
                .map(a => (typeof a === 'string' ? a : a?.name || ''))
                .filter(Boolean);
              const trackArtistNamesNormalized = trackArtistNames.map(n => normalizeForComparison(n));
              
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: [bucket_mismatch] track="${track.name}" bucketArtistId=${bucketArtistIdStr} bucketName="${bucketArtistName || expectedBucketArtistName || 'unknown'}" trackArtistIds=[${trackArtistIds.join(', ')}] trackArtistNamesNormalized=[${trackArtistNamesNormalized.join(', ')}]`);
              return false;
            }
          }
          
          // Check cap en tiempo real (FEATURE_ENFORCE_CAPS_DURING_BUILD)
          if (FEATURE_ENFORCE_CAPS_DURING_BUILD) {
            const capCheck = checkCapInTime(track, artistCounters, cap, isPriority, specialCases, specialCases.onlyArtists || []);
            if (!capCheck.allowed) {
              const currentSkips = skipsByCap.get(mainArtistName) || 0;
              skipsByCap.set(mainArtistName, currentSkips + 1);
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Skipping "${track.name}" by "${mainArtistName}" - ${capCheck.reason || 'cap exceeded'} (${currentArtistCount}/${cap})`);
              return false;
            }
          }
          
          // Verificar bucket target
          const bucket = bucketPlan.get(bucketIdx);
          if (bucket && bucket.current >= bucket.target) {
            return false; // Bucket ya lleno
          }
          
          // Añadir track
          seenTrackIds.add(track.id);
          artistCounters.set(mainArtistName, currentArtistCount + 1);
          
          if (bucket) {
            bucket.current++;
            bucket.adds++;
          }
          
          const currentAdds = addsByArtist.get(mainArtistName) || 0;
          addsByArtist.set(mainArtistName, currentAdds + 1);
          
          if (!bucketTracks.has(bucketIdx)) {
            bucketTracks.set(bucketIdx, []);
          }
          bucketTracks.get(bucketIdx).push(track);
          allTracksCollected.push(track);
          
          return true;
        };
        
        // 🚨 CRITICAL: Usar targetTracksTotal en lugar de remaining para generar TODOS los tracks solicitados
        const targetTotal = targetTracksTotal || remaining;
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Starting multi-artist fan-out for ${distinctPriority} artists (order-invariant)`);
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Target total: ${targetTotal}, Remaining: ${remaining}`);
        
        // FASE 1: Fan-out multi-artista (orden-invariante) - procesar TODOS los priority artists
        // 🚨 CRITICAL: Si hay muchos priority artists, usar ROTACIÓN (1 canción de cada uno, luego otra vez)
        // para asegurar que todos aparezcan antes de cumplir caps individuales
        const totalPriorityTracksNeeded = Array.from(bucketPlan.values()).reduce((sum, bucket) => sum + bucket.target, 0);
        const useRotation = distinctPriority > 3 || totalPriorityTracksNeeded > targetTotal * 0.6; // Usar rotación si hay muchos priority o si ocupan >60% del total
        
        if (useRotation) {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Using ROTATION strategy (${distinctPriority} priority artists, ${totalPriorityTracksNeeded} tracks needed)`);
          
          // Pre-cargar tracks de todos los priority artists
          const artistTracksMap = new Map(); // bucketIdx → array de tracks disponibles
          
          for (const [idx, artistName] of bucketToArtist.entries()) {
            const bucket = bucketPlan.get(idx);
            if (!bucket) continue;
            
            const resolvedArtist = resolvedArtists.get(artistName);
            const artistToUse = resolvedArtist?.name || artistName;
            const artistId = resolvedArtist?.id || null;
            
            try {
              // Obtener más tracks de los necesarios para tener opciones en la rotación
              const tracksToFetch = Math.max(bucket.target * 2, 20);
              const topTracks = await getArtistTopTracks(accessToken, artistId || artistToUse, Math.min(tracksToFetch, 50));
              
              // Si aún necesitamos más, usar radio
              let allTracksForArtist = [...topTracks];
              if (topTracks.length > 0 && allTracksForArtist.length < tracksToFetch) {
                const trackIds = topTracks.slice(0, 5).map(t => t.id).filter(Boolean);
                if (trackIds.length > 0) {
                  const radioTracks = await radioFromRelatedTop(
                    accessToken,
                    trackIds,
                    {
                      need: tracksToFetch - allTracksForArtist.length,
                      market: FEATURE_SPOTIFY_MARKET_FALLBACK ? (process.env.SPOTIFY_MARKET || 'ES') : 'ES',
                      seedArtistIds: artistId ? [artistId] : null
                    }
                  );
                  allTracksForArtist.push(...radioTracks);
                }
              }
              
              // Si aún falta, usar búsqueda directa
              if (allTracksForArtist.length < tracksToFetch) {
                const directTracks = await searchTracksByArtists(accessToken, [artistToUse], tracksToFetch - allTracksForArtist.length);
                allTracksForArtist.push(...directTracks);
              }
              
              artistTracksMap.set(idx, allTracksForArtist);
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Pre-loaded ${allTracksForArtist.length} tracks for "${artistToUse}" (bucket ${idx})`);
            } catch (err) {
              console.error(`[STREAM:${traceId}] ARTIST_STYLE: Error pre-loading tracks for "${artistToUse}":`, err);
              artistTracksMap.set(idx, []);
            }
          }
          
          // ROTACIÓN: tomar 1 track de cada priority artist y volver al inicio
          let rotationIndex = 0;
          let roundsCompleted = 0;
          
          while (roundsCompleted < Math.max(...Array.from(bucketPlan.values()).map(b => b.target))) {
            let anyTrackAdded = false;
            
            for (let i = 0; i < distinctPriority; i++) {
              const bucketIdx = rotationIndex % distinctPriority;
              const bucket = bucketPlan.get(bucketIdx);
              const artistName = bucketToArtist.get(bucketIdx);
              
              if (!bucket || bucket.current >= bucket.target) {
                rotationIndex++;
                continue;
              }
              
              const tracksForThisArtist = artistTracksMap.get(bucketIdx) || [];
              
              // Buscar el primer track disponible que aún no se haya usado
              let trackAdded = false;
              for (let j = 0; j < tracksForThisArtist.length; j++) {
                const track = tracksForThisArtist[j];
                if (!track || seenTrackIds.has(track.id)) continue;
                
                if (addTrackWithCap(track, bucketIdx, true, artistName)) {
                  trackAdded = true;
                  anyTrackAdded = true;
                  // Remover el track usado del array para no usarlo de nuevo
                  tracksForThisArtist.splice(j, 1);
                  break;
                }
              }
              
              if (!trackAdded && tracksForThisArtist.length === 0) {
                // Si no hay más tracks disponibles para este artista, marcar como completo
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: No more tracks available for "${artistName}" (bucket ${bucketIdx}), marking as complete`);
                bucket.current = bucket.target; // Forzar completar para salir del loop
              }
              
              rotationIndex++;
            }
            
            if (!anyTrackAdded) {
              // Si no se añadió ningún track en esta ronda, salir
              break;
            }
            
            roundsCompleted++;
          }
          
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Rotation complete after ${roundsCompleted} rounds`);
        } else {
          // Estrategia normal: llenar cada bucket secuencialmente hasta su cap
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Using SEQUENTIAL strategy (${distinctPriority} priority artists)`);
          
          for (const [idx, artistName] of bucketToArtist.entries()) {
            const bucket = bucketPlan.get(idx);
            if (!bucket || bucket.current >= bucket.target) {
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Bucket ${idx} for "${artistName}" already full (${bucket?.current}/${bucket?.target}), skipping`);
              continue;
            }
            
            const needed = bucket.target - bucket.current;
            console.log(`[STREAM:${traceId}] ARTIST_STYLE: Processing bucket ${idx} for "${artistName}" (target: ${bucket.target}, current: ${bucket.current}, needed: ${needed})`);
            
            const resolvedArtist = resolvedArtists.get(artistName);
            const artistToUse = resolvedArtist?.name || artistName;
            const artistId = resolvedArtist?.id || null;
            
            try {
              // Estrategia 1: Top tracks del artista
              const topTracks = await getArtistTopTracks(accessToken, artistId || artistToUse, Math.min(needed * 3, 10));
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Got ${topTracks.length} top tracks for "${artistToUse}"`);
              
              for (const track of topTracks) {
                if (bucket.current >= bucket.target) break;
                addTrackWithCap(track, idx, true, artistName);
              }
              
              // Si aún necesitamos más tracks para este bucket, usar radio/related
              if (bucket.current < bucket.target && topTracks.length > 0) {
                const stillNeeded = bucket.target - bucket.current;
                const trackIds = topTracks.slice(0, 3).map(t => t.id).filter(Boolean);
                
                if (trackIds.length > 0) {
                  const radioTracks = await radioFromRelatedTop(
                    accessToken,
                    trackIds,
                    {
                      need: stillNeeded * 2,
                      market: FEATURE_SPOTIFY_MARKET_FALLBACK ? (process.env.SPOTIFY_MARKET || 'ES') : 'ES',
                      seedArtistIds: artistId ? [artistId] : null
                    }
                  );
                  
                  console.log(`[STREAM:${traceId}] ARTIST_STYLE: Got ${radioTracks.length} radio tracks for "${artistToUse}"`);
                  
                  for (const track of radioTracks) {
                    if (bucket.current >= bucket.target) break;
                    addTrackWithCap(track, idx, true, artistName);
                  }
                }
              }
              
              // Si aún falta material, usar búsqueda directa
              if (bucket.current < bucket.target) {
                const stillNeeded = bucket.target - bucket.current;
                const directTracks = await searchTracksByArtists(accessToken, [artistToUse], stillNeeded * 2);
                
                for (const track of directTracks) {
                  if (bucket.current >= bucket.target) break;
                  addTrackWithCap(track, idx, true, artistName);
                }
              }
              
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Bucket ${idx} for "${artistToUse}": ${bucket.current}/${bucket.target} tracks`);
              
            } catch (err) {
              console.error(`[STREAM:${traceId}] ARTIST_STYLE: Error processing "${artistToUse}":`, err);
            }
          }
        }
          
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Multi-artist fan-out complete: ${allTracksCollected.length} tracks collected (target: ${targetTotal})`);
        
        // Log telemetría: adds/skips por artista
        for (const [artist, adds] of addsByArtist.entries()) {
          const skips = skipsByCap.get(artist) || 0;
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: ${artist} - adds=${adds}, skipsByCap=${skips}`);
        }
        
        // FASE 2: Compensación inteligente (FEATURE_SMART_COMPENSATION)
        // 🚨 CRITICAL: Usar targetTotal en lugar de remaining para calcular missing tracks
        let compensationPlan = null;
        if (FEATURE_SMART_COMPENSATION && allTracksCollected.length < targetTotal) {
          const missing = targetTotal - allTracksCollected.length;
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Starting smart compensation for ${missing} missing tracks (collected: ${allTracksCollected.length}, target: ${targetTotal})`);
          
          compensationPlan = calculateCompensationPlan(bucketPlan, missing, nonPriorityCap);
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Compensation plan:`, JSON.stringify(compensationPlan, null, 2));
          
          // Completar buckets priority incompletos primero
          for (const compensation of compensationPlan.compensationPlan) {
            // 🚨 CRITICAL: Usar targetTotal en lugar de remaining
            if (allTracksCollected.length >= targetTotal) break;
            
            if (compensation.type === 'priority' && compensation.bucketIdx !== undefined) {
              const bucketIdx = compensation.bucketIdx;
              const bucket = bucketPlan.get(bucketIdx);
              if (!bucket) continue;
              
              const artistName = bucketToArtist?.get(bucketIdx) || priorityArtists[bucketIdx];
              const stillNeeded = Math.min(compensation.target, bucket.target - bucket.current);
              
              if (stillNeeded > 0) {
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: Compensating bucket ${bucketIdx} for "${artistName}" with ${stillNeeded} tracks`);
                
                const resolvedArtist = resolvedArtists.get(artistName);
                const artistToUse = resolvedArtist?.name || artistName;
                
                try {
                  const compTracks = await searchTracksByArtists(accessToken, [artistToUse], stillNeeded * 2);
                  for (const track of compTracks) {
                    // 🚨 CRITICAL: Usar targetTotal
                    if (allTracksCollected.length >= targetTotal) break;
                    if (bucket.current >= bucket.target) break;
                    addTrackWithCap(track, bucketIdx, true, artistName); // Pasar artistName para verificación
                  }
                } catch (err) {
                  console.error(`[STREAM:${traceId}] ARTIST_STYLE: Error compensating "${artistToUse}":`, err);
                }
              }
            } else if (compensation.type === 'non_priority') {
              // Rellenar con no-priority (respetando su cap)
              // 🚨 CRITICAL: Usar colaboradores REALES de los priority artists con ROTACIÓN
              const stillNeeded = compensation.target;
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Compensating with non-priority tracks from REAL collaborators with ROTATION (${stillNeeded})`);
              
              // Extraer colaboradores REALES de todos los priority artists
              const allCollaborators = new Set();
              for (const [bucketIdx, tracks] of bucketTracks.entries()) {
                const priorityArtistName = bucketToArtist.get(bucketIdx);
                if (!priorityArtistName) continue;
                
                // 🚨 CRITICAL: Asegurar que tracks es un array y tiene la estructura correcta
                const tracksArray = Array.isArray(tracks) ? tracks : [];
                
                // Extraer colaboradores de los tracks de este priority artist
                const collaborators = extractCollaborators(tracksArray, priorityArtistName);
                collaborators.forEach(collab => allCollaborators.add(collab));
                
                // 🚨 CRITICAL: Si no hay colaboradores en tracks, intentar obtenerlos de los top tracks del artista
                if (collaborators.length === 0) {
                  try {
                    const resolvedArtist = resolvedArtists.get(priorityArtistName);
                    if (resolvedArtist?.id) {
                      // Obtener top tracks del artista para extraer colaboradores
                      const topTracksResponse = await fetch(`https://api.spotify.com/v1/artists/${resolvedArtist.id}/top-tracks?market=ES`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                      });
                      if (topTracksResponse.ok) {
                        const topTracksData = await topTracksResponse.json();
                        const topTracks = topTracksData.tracks || [];
                        const topTracksCollaborators = extractCollaborators(topTracks, priorityArtistName);
                        topTracksCollaborators.forEach(collab => allCollaborators.add(collab));
                        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Found ${topTracksCollaborators.length} collaborators from top tracks for "${priorityArtistName}"`);
                      }
                    }
                  } catch (err) {
                    console.warn(`[STREAM:${traceId}] ARTIST_STYLE: Error getting top tracks for "${priorityArtistName}":`, err);
                  }
                }
              }
              
              const collaboratorList = Array.from(allCollaborators);
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Found ${collaboratorList.length} REAL collaborators from priority artists`);
              
              // 🚨 CRITICAL: Aplicar fórmula: (n canciones pedidas - x canciones de priority) / z priority artists
              // Esto distribuye los tracks no-priority equitativamente entre los priority artists
              const totalTracksForDistribution = targetTracksTotal || targetTotal;
              
              // Calcular cuántas canciones de priority artists ya tenemos
              let actualPriorityTracks = 0;
              for (const [bucketIdx, bucket] of bucketPlan.entries()) {
                actualPriorityTracks += bucket.current || 0;
              }
              
              // Fórmula: (n - x) / z donde:
              // n = totalTracksForDistribution (canciones pedidas)
              // x = actualPriorityTracks (canciones de priority artists ya recogidas)
              // z = distinctPriority (cantidad de priority artists)
              const nonPriorityTracksNeeded = totalTracksForDistribution - actualPriorityTracks;
              const tracksPerPriorityArtist = Math.max(0, Math.ceil(nonPriorityTracksNeeded / Math.max(1, distinctPriority)));
              
              console.log(`[STREAM:${traceId}] ARTIST_STYLE: Compensation formula: (${totalTracksForDistribution} - ${actualPriorityTracks}) / ${distinctPriority} = ${tracksPerPriorityArtist} tracks de estilo por cada priority artist`);
              
              // Crear set de nombres de priority artists (se usará en varias partes)
              const priorityArtistNamesSet = new Set(priorityArtists.map(a => a.toLowerCase()));
              
              // Si hay colaboradores, usar ROTACIÓN para distribuir equitativamente
              if (collaboratorList.length > 0) {
                // 🚨 CRITICAL: Filtrar colaboradores que NO están al límite y limitar a ~10
                const availableCollaborators = collaboratorList.filter(collab => {
                  const collabLower = collab.toLowerCase();
                  const currentCount = artistCounters.get(collabLower) || 0;
                  return currentCount < nonPriorityCap;
                }).slice(0, 10); // Limitar a 10 colaboradores máximo
                
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: Using ${availableCollaborators.length} available collaborators for rotation`);
                
                // 🚨 CRITICAL: Implementar ROTACIÓN - tomar 1 track de cada colaborador y volver al inicio
                let collaboratorIndex = 0;
                let tracksAddedFromRotation = 0;
                const maxTracksToFetch = stillNeeded * 2; // Fetch más de lo necesario para tener opciones
                
                // Primera pasada: buscar tracks de todos los colaboradores (1 por cada uno)
                const collaboratorTrackMap = new Map(); // colaborador → array de tracks disponibles
                
                for (const collaborator of availableCollaborators) {
                  if (tracksAddedFromRotation >= maxTracksToFetch) break;
                  try {
                    // Buscar ~2-3 tracks por colaborador inicialmente
                    const tracksToFetch = Math.min(3, Math.ceil(stillNeeded / availableCollaborators.length) + 2);
                    const collabTracks = await searchTracksByArtists(accessToken, [collaborator], tracksToFetch);
                    
                    // Filtrar tracks que NO tengan al priority artist (solo colaboradores)
                    const filteredCollabTracks = collabTracks.filter(track => {
                      const trackArtists = (track.artists || track.artistNames || [])
                        .map(a => (typeof a === 'string' ? a : a?.name || '').toLowerCase())
                        .filter(Boolean);
                      // El track NO debe tener ningún priority artist (solo colaboradores)
                      return !trackArtists.some(artist => priorityArtistNamesSet.has(artist));
                    });
                    
                    if (filteredCollabTracks.length > 0) {
                      collaboratorTrackMap.set(collaborator, filteredCollabTracks);
                    }
                  } catch (err) {
                    console.error(`[STREAM:${traceId}] ARTIST_STYLE: Error searching tracks for collaborator "${collaborator}":`, err);
                  }
                }
                
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: Fetched tracks from ${collaboratorTrackMap.size} collaborators for rotation`);
                
                // 🚨 CRITICAL: ROTACIÓN - tomar 1 track de cada colaborador y volver al inicio
                while (allTracksCollected.length < targetTotal && collaboratorTrackMap.size > 0) {
                  const collaborator = availableCollaborators[collaboratorIndex % availableCollaborators.length];
                  const tracksForThisCollaborator = collaboratorTrackMap.get(collaborator);
                  
                  if (tracksForThisCollaborator && tracksForThisCollaborator.length > 0) {
                    // Tomar el primer track disponible de este colaborador
                    const track = tracksForThisCollaborator.shift();
                    
                    // Verificar cap antes de añadir
                    const mainArtistName = (track.artists?.[0]?.name || track.artistNames?.[0] || '').toLowerCase();
                    const isPriority = priorityArtistNamesSet.has(mainArtistName);
                    
                    if (!isPriority) {
                      const capCheck = checkCapInTime(track, artistCounters, nonPriorityCap, false, specialCases, specialCases.onlyArtists || []);
                      if (capCheck.allowed) {
                        addTrackWithCap(track, -1, false);
                      }
                    }
                    
                    // Si ya no quedan tracks de este colaborador, remover del map
                    if (tracksForThisCollaborator.length === 0) {
                      collaboratorTrackMap.delete(collaborator);
                    }
                  } else {
                    // Si no hay tracks para este colaborador, removerlo del map
                    collaboratorTrackMap.delete(collaborator);
                  }
                  
                  // Avanzar al siguiente colaborador (rotación)
                  collaboratorIndex++;
                  
                  // Si ya no quedan colaboradores con tracks, salir
                  if (collaboratorTrackMap.size === 0) break;
                }
                
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: Rotation complete: added ${allTracksCollected.length - (targetTotal - stillNeeded)} tracks from collaborators`);
              } else {
                // 🚨 CRITICAL: Si no hay colaboradores directos, buscar colaboradores de segundo nivel y radios
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: No direct collaborators found, searching second-level collaborators and radio tracks`);
                
                // ESTRATEGIA 1: Radios de tracks ya seleccionados (más confiable)
                const allPriorityTracks = Array.from(bucketTracks.values()).flat().slice(0, 10); // Usar más tracks para mejor radio
                const seedTrackIds = allPriorityTracks.map(t => t.id).filter(Boolean);
                
                // ESTRATEGIA 2: Buscar colaboradores de segundo nivel (colaboradores de colaboradores)
                const secondLevelCollaborators = new Set();
                for (const priorityArtistName of priorityArtists) {
                  const resolvedArtist = resolvedArtists.get(priorityArtistName);
                  if (resolvedArtist?.id) {
                    try {
                      // Obtener top tracks del priority artist
                      const topTracksResponse = await fetch(`https://api.spotify.com/v1/artists/${resolvedArtist.id}/top-tracks?market=ES`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                      });
                      if (topTracksResponse.ok) {
                        const topTracksData = await topTracksResponse.json();
                        const topTracks = topTracksData.tracks || [];
                        
                        // Extraer colaboradores de primer nivel
                        const firstLevelCollabs = extractCollaborators(topTracks, priorityArtistName);
                        
                        // Para cada colaborador de primer nivel, buscar sus colaboradores (segundo nivel)
                        for (const firstLevelCollab of firstLevelCollabs.slice(0, 5)) { // Limitar a 5 para no hacer demasiadas llamadas
                          try {
                            // Buscar artista por nombre
                            const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(firstLevelCollab)}&type=artist&limit=1`, {
                              headers: { 'Authorization': `Bearer ${accessToken}` }
                            });
                            if (searchResponse.ok) {
                              const searchData = await searchResponse.json();
                              const collabArtist = searchData.artists?.items?.[0];
                              if (collabArtist?.id) {
                                // Obtener top tracks del colaborador de primer nivel
                                const collabTopTracksResponse = await fetch(`https://api.spotify.com/v1/artists/${collabArtist.id}/top-tracks?market=ES`, {
                                  headers: { 'Authorization': `Bearer ${accessToken}` }
                                });
                                if (collabTopTracksResponse.ok) {
                                  const collabTopTracksData = await collabTopTracksResponse.json();
                                  const collabTopTracks = collabTopTracksData.tracks || [];
                                  
                                  // Extraer colaboradores de segundo nivel (excluyendo el priority artist y el colaborador de primer nivel)
                                  const secondLevel = extractCollaborators(collabTopTracks, firstLevelCollab);
                                  secondLevel.forEach(collab => {
                                    // Excluir priority artists y colaboradores de primer nivel
                                    if (!priorityArtistNamesSet.has(collab.toLowerCase()) && 
                                        !firstLevelCollabs.some(fc => fc.toLowerCase() === collab.toLowerCase())) {
                                      secondLevelCollaborators.add(collab);
                                    }
                                  });
                                }
                              }
                            }
                          } catch (err) {
                            console.warn(`[STREAM:${traceId}] ARTIST_STYLE: Error getting second-level collaborators for "${firstLevelCollab}":`, err);
                          }
                        }
                      }
                    } catch (err) {
                      console.warn(`[STREAM:${traceId}] ARTIST_STYLE: Error getting top tracks for "${priorityArtistName}":`, err);
                    }
                  }
                }
                
                const secondLevelList = Array.from(secondLevelCollaborators);
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: Found ${secondLevelList.length} second-level collaborators`);
                
                // ESTRATEGIA 3: Usar radios de tracks ya seleccionados (sin géneros por defecto)
                let radioTracks = [];
                if (seedTrackIds.length > 0) {
                  try {
                    radioTracks = await radioFromRelatedTop(
                      accessToken,
                      seedTrackIds,
                      {
                        need: stillNeeded * 3, // Pedir más tracks para tener opciones después de filtrar
                        market: FEATURE_SPOTIFY_MARKET_FALLBACK ? (process.env.SPOTIFY_MARKET || 'ES') : 'ES',
                        seedArtistIds: null, // No usar artistas directamente (pueden fallar con 404)
                        seedGenres: null // 🚨 CRITICAL: NO usar géneros por defecto
                      }
                    );
                  } catch (err) {
                    console.warn(`[STREAM:${traceId}] ARTIST_STYLE: Error getting radio tracks:`, err);
                  }
                }
                
                // Si hay colaboradores de segundo nivel, buscar tracks de ellos también
                if (secondLevelList.length > 0 && allTracksCollected.length < targetTotal) {
                  const remainingFromRadio = targetTotal - allTracksCollected.length;
                  const tracksPerSecondLevel = Math.ceil(remainingFromRadio / secondLevelList.length);
                  
                  for (const secondLevelCollab of secondLevelList.slice(0, 10)) { // Limitar a 10
                    if (allTracksCollected.length >= targetTotal) break;
                    
                    try {
                      const secondLevelTracks = await searchTracksByArtists(accessToken, [secondLevelCollab], tracksPerSecondLevel);
                      
                      // Filtrar tracks que NO tengan priority artists
                      const filteredSecondLevelTracks = secondLevelTracks.filter(track => {
                        const trackArtists = (track.artists || track.artistNames || [])
                          .map(a => (typeof a === 'string' ? a : a?.name || '').toLowerCase())
                          .filter(Boolean);
                        return !trackArtists.some(artist => priorityArtistNamesSet.has(artist));
                      });
                      
                      for (const track of filteredSecondLevelTracks) {
                        if (allTracksCollected.length >= targetTotal) break;
                        const capCheck = checkCapInTime(track, artistCounters, nonPriorityCap, false, specialCases, specialCases.onlyArtists || []);
                        if (capCheck.allowed) {
                          addTrackWithCap(track, -1, false);
                        }
                      }
                    } catch (err) {
                      console.warn(`[STREAM:${traceId}] ARTIST_STYLE: Error searching tracks for second-level collaborator "${secondLevelCollab}":`, err);
                    }
                  }
                }
                
                // 🚨 CRITICAL: Filtrar tracks de radio que NO sean de priority artists
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: Got ${radioTracks.length} radio tracks, filtering priority artists...`);
                
                for (const track of radioTracks) {
                  if (allTracksCollected.length >= targetTotal) break;
                  
                  // Verificar todos los artistas del track
                  const trackArtists = (track.artists || track.artistNames || [])
                    .map(a => (typeof a === 'string' ? a : a?.name || '').toLowerCase())
                    .filter(Boolean);
                  
                  // El track NO debe tener ningún priority artist
                  const hasPriorityArtist = trackArtists.some(artist => priorityArtistNamesSet.has(artist));
                  
                  if (!hasPriorityArtist) {
                    const capCheck = checkCapInTime(track, artistCounters, nonPriorityCap, false, specialCases, specialCases.onlyArtists || []);
                    if (capCheck.allowed) {
                      addTrackWithCap(track, -1, false);
                      console.log(`[STREAM:${traceId}] ARTIST_STYLE: Added radio track "${track.name}" by ${trackArtists.join(', ')}`);
                    }
                  } else {
                    console.log(`[STREAM:${traceId}] ARTIST_STYLE: Skipped radio track "${track.name}" (contains priority artist)`);
                  }
                }
                
                console.log(`[STREAM:${traceId}] ARTIST_STYLE: Compensation complete: ${allTracksCollected.length}/${targetTotal} tracks (radio + second-level collaborators)`);
              }
            }
          }
          
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Smart compensation complete: ${allTracksCollected.length}/${targetTotal} tracks (target achieved)`);
        }
        
        // Aplicar exclusiones finales y asegurar que tenemos exactamente los tracks de priority artists
        // 🚨 CRITICAL: No cortar por remaining aquí - mantener todos los tracks recogidos que sean válidos
        // Usar targetTotal en lugar de remaining para el corte final
        spotifyTracks = allTracksCollected
          .filter(track => notExcluded(track, intent.exclusions));
        
        // 🚨 CRITICAL: Si tenemos más de targetTotal, cortar solo si es necesario (pero respetar buckets priority)
        // Usar targetTotal, NO remaining
        if (spotifyTracks.length > targetTotal) {
          // Priorizar tracks de priority artists primero
          const priorityTracks = [];
          const nonPriorityTracks = [];
          const priorityArtistNamesSet = new Set(priorityArtists.map(a => a.toLowerCase()));
          
          for (const track of spotifyTracks) {
            const mainArtistName = (track.artists?.[0]?.name || track.artistNames?.[0] || 'Unknown').toLowerCase();
            if (priorityArtistNamesSet.has(mainArtistName)) {
              priorityTracks.push(track);
            } else {
              nonPriorityTracks.push(track);
            }
          }
          
          // Combinar: priority primero, luego no-priority hasta targetTotal (NO remaining)
          spotifyTracks = [
            ...priorityTracks,
            ...nonPriorityTracks.slice(0, Math.max(0, targetTotal - priorityTracks.length))
          ];
        }
        
        // Log final de telemetría
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Final result: ${spotifyTracks.length}/${targetTotal} tracks (remaining was: ${remaining})`);
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: BucketPlan final:`, JSON.stringify(
          Array.from(bucketPlan.entries()).map(([idx, bucket]) => ({
            idx,
            target: bucket.target,
            current: bucket.current,
            adds: bucket.adds,
            skipsByCap: bucket.skipsByCap
          })),
          null,
          2
        ));
        
        if (resolverDecisions.length > 0) {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: ResolverDecisions:`, JSON.stringify(resolverDecisions, null, 2));
        }
        
        if (compensationPlan) {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: CompensationPlan:`, JSON.stringify(compensationPlan, null, 2));
        }
        
        console.log(`[STREAM:${traceId}] ARTIST_STYLE tracks sample:`, spotifyTracks.slice(0, 3).map(t => ({ 
          name: t.name, 
          artists: t.artists?.map(a => a.name) || t.artistNames || [] 
        })));
      } catch (err) {
        console.error(`[STREAM:${traceId}] ARTIST_STYLE Error:`, err);
        spotifyTracks = [];
      }
      
    } else {
      // NORMAL mode or unknown mode: Use LLM tracks to create Spotify radios
      console.log(`[STREAM:${traceId}] ===== UNKNOWN MODE FALLBACK (NORMAL PROCESS) =====`);
      console.log(`[STREAM:${traceId}] WARNING: Mode "${mode}" not recognized, falling back to NORMAL mode`);
      console.log(`[STREAM:${traceId}] NORMAL MODE: Using LLM tracks for Spotify radios`);
      console.log(`[STREAM:${traceId}] NORMAL mode details:`, {
        llmTracks: intent.tracks_llm?.length || 0,
        artists: intent.artists_llm?.length || 0,
        remaining: remaining,
        priority_artists: intent.priority_artists?.length || 0,
        contexts: intent.contexts?.key || 'none'
      });
      console.log(`[STREAM:${traceId}] 🚨 DEBUG: NORMAL MODE EXECUTED (mode="${mode}", intent.mode="${intent.mode}")`);
      
      console.log(`[STREAM:${traceId}] NORMAL FILLING STRATEGY:`, {
        step1: 'Priority artists -> LLM tracks -> LLM artists -> Context artists',
        step2: 'Create Spotify radios from resolved tracks',
        step3: 'Apply exclusions and deduplication',
        step4: 'Yield in chunks until remaining filled'
      });
      
      try {
        const llmTracks = intent.tracks_llm || [];
        const llmArtists = intent.artists_llm || [];
        
        console.log(`[STREAM:${traceId}] NORMAL: LLM tracks available:`, llmTracks.length);
        console.log(`[STREAM:${traceId}] NORMAL: LLM artists available:`, llmArtists.length);
        
        if (llmTracks.length > 0) {
          // Use LLM tracks to create radios
          console.log(`[STREAM:${traceId}] NORMAL: Creating radios from LLM tracks`);
          console.log(`[STREAM:${traceId}] NORMAL: LLM tracks sample:`, llmTracks.slice(0, 3).map(t => ({ title: t.title, artist: t.artist })));
          
          // PRIORITY: If there's a priority artist, search for their tracks first
          const priorityArtists = intent.priority_artists || [];
          if (priorityArtists.length > 0) {
            console.log(`[STREAM:${traceId}] NORMAL: Priority artist detected:`, priorityArtists);
            
            // Search for tracks by the priority artist specifically
            const priorityTracks = dedupeById(await searchTracksByArtists(accessToken, priorityArtists, Math.min(remaining, 20)));
            console.log(`[STREAM:${traceId}] NORMAL: Found ${priorityTracks.length} tracks from priority artist`);
            
            if (priorityTracks.length > 0) {
              // Use priority artist tracks for radio generation (this will find "sus oyentes también escuchan")
              const trackIds = priorityTracks.map(t => t.id).filter(Boolean);
              console.log(`[STREAM:${traceId}] NORMAL: Using priority artist track IDs for radio:`, trackIds.slice(0, 5));
              spotifyTracks = dedupeById(await radioFromRelatedTop(accessToken, trackIds, remaining));
            } else {
              // Fallback to LLM tracks if priority artist search fails
              console.log(`[STREAM:${traceId}] NORMAL: Priority artist search failed, using LLM tracks`);
              const resolvedLLMTracks = await resolveTracksBySearch(accessToken, llmTracks, { exclusions: intent.exclusions });
              if (resolvedLLMTracks.length > 0) {
                const trackIds = resolvedLLMTracks.map(t => t.id).filter(Boolean);
                spotifyTracks = dedupeById(await radioFromRelatedTop(accessToken, trackIds, remaining));
              }
            }
          } else {
            // No priority artist, use LLM tracks directly
            const resolvedLLMTracks = await resolveTracksBySearch(accessToken, llmTracks, { exclusions: intent.exclusions });
            console.log(`[STREAM:${traceId}] NORMAL: Resolved ${resolvedLLMTracks.length} LLM tracks to Spotify IDs`);
            
            if (resolvedLLMTracks.length > 0) {
              const trackIds = resolvedLLMTracks.map(t => t.id).filter(Boolean);
              console.log(`[STREAM:${traceId}] NORMAL: Using track IDs for radio:`, trackIds.slice(0, 5));
              spotifyTracks = dedupeById(await radioFromRelatedTop(accessToken, trackIds, remaining));
            }
          }
        } else if (llmArtists.length > 0) {
          // Fallback to LLM artists - need to search for tracks first
          console.log(`[STREAM:${traceId}] NORMAL: Using LLM artists as fallback`);
          console.log(`[STREAM:${traceId}] NORMAL: LLM artists sample:`, llmArtists.slice(0, 5));
          
          // Search for tracks by artist names
            const artistTracks = dedupeById(await searchTracksByArtists(accessToken, llmArtists.slice(0, 10), remaining));
          console.log(`[STREAM:${traceId}] NORMAL: Found ${artistTracks.length} tracks from artist search`);
          
          if (artistTracks.length > 0) {
            // Use found tracks for radio generation
            const trackIds = artistTracks.map(t => t.id).filter(Boolean);
            spotifyTracks = await radioFromRelatedTop(accessToken, trackIds, remaining);
          } else {
            console.log(`[STREAM:${traceId}] NORMAL: No tracks found from artists, trying context search`);
            // Try context-based search instead of generic
            if (intent.contexts && intent.contexts.key) {
              const contextArtists = MUSICAL_CONTEXTS[intent.contexts.key]?.artists || [];
              if (contextArtists.length > 0) {
                console.log(`[STREAM:${traceId}] NORMAL: Using context artists:`, contextArtists.slice(0, 5));
                spotifyTracks = dedupeById(await searchTracksByArtists(accessToken, contextArtists.slice(0, 10), remaining));
              } else {
                console.log(`[STREAM:${traceId}] NORMAL: No context artists available, returning empty`);
                spotifyTracks = [];
              }
            } else {
              console.log(`[STREAM:${traceId}] NORMAL: No context available, returning empty`);
              spotifyTracks = [];
            }
          }
        } else {
          console.log(`[STREAM:${traceId}] NORMAL: No LLM data available, using context artists`);
          console.log(`[STREAM:${traceId}] NORMAL: Intent contexts:`, intent.contexts);
          console.log(`[STREAM:${traceId}] NORMAL: Available contexts:`, Object.keys(MUSICAL_CONTEXTS));
          
          // Use context artists as last resort
          if (intent.contexts && MUSICAL_CONTEXTS[intent.contexts]) {
            const contextArtists = MUSICAL_CONTEXTS[intent.contexts].artists || [];
            console.log(`[STREAM:${traceId}] NORMAL: Using context artists:`, contextArtists.slice(0, 5));
            spotifyTracks = dedupeById(await radioFromRelatedTop(accessToken, contextArtists, remaining));
          } else {
            console.log(`[STREAM:${traceId}] NORMAL: No context available, skipping this attempt`);
            spotifyTracks = [];
          }
        }
        
        console.log(`[STREAM:${traceId}] NORMAL: Generated ${spotifyTracks.length}/${remaining} tracks`);
        console.log(`[STREAM:${traceId}] NORMAL tracks sample:`, spotifyTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
      } catch (err) {
        console.error(`[STREAM:${traceId}] NORMAL Error:`, err);
        spotifyTracks = [];
      }
    }
    
    // Filter and yield tracks
    console.log(`[STREAM:${traceId}] Filtering tracks: ${spotifyTracks.length} -> ${spotifyTracks.filter(track => notExcluded(track, intent.exclusions)).length}`);
    const filtered = spotifyTracks.filter(track => notExcluded(track, intent.exclusions));
    const deduped = dedupeAgainstUsed(filtered, usedTracks);
    
    console.log(`[STREAM:${traceId}] Deduplication: ${filtered.length} -> ${deduped.length} (filtered out ${filtered.length - deduped.length} already used tracks)`);
    console.log(`[STREAM:${traceId}] Current global usedTracks size: ${usedTracks.size}`);
    
    // COMPENSATION LOGIC: If tracks were filtered out, we need to compensate
    const filteredOut = spotifyTracks.length - deduped.length;
    let compensationNeeded = filteredOut;
    
    // See if we're short on tracks
    const availableSpots = Math.max(0, remaining - totalYielded);
    if (availableSpots > 0 && deduped.length < availableSpots) {
      compensationNeeded = availableSpots;
    }
    
    if (compensationNeeded > 0) {
      console.log(`[STREAM:${traceId}] COMPENSATION: Need ${compensationNeeded} more tracks (${filteredOut} filtered, ${availableSpots} needed)`);
      
      // Generate compensation tracks using broader search
      try {
        console.log(`[STREAM:${traceId}] COMPENSATION: Generating ${compensationNeeded} compensation tracks`);
        
        // Use different search strategies for compensation
        const searchStrategies = [
          { type: 'genre', terms: ['reggaeton', 'latin', 'spanish music'] },
          { type: 'artist', artists: intent.artists_llm?.slice(0, 5) || [] },
          { type: 'generic', terms: ['popular', 'hits', 'trending'] }
        ];
        
        for (const strategy of searchStrategies) {
          if (compensationNeeded <= 0) break;
          
          try {
            let compensationTracks = [];
            
            if (strategy.type === 'genre') {
              for (const term of strategy.terms) {
                if (compensationTracks.length >= compensationNeeded * 2) break;
                console.log(`[STREAM:${traceId}] COMPENSATION: Searching with genre term: "${term}"`);
                const results = await radioFromRelatedTop(accessToken, [], compensationNeeded * 2, undefined, term);
                if (results && results.length > 0) {
                  compensationTracks.push(...results);
                }
                await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
              }
            } else if (strategy.type === 'artist' && strategy.artists.length > 0) {
              console.log(`[STREAM:${traceId}] COMPENSATION: Searching with artists: ${strategy.artists.join(', ')}`);
              for (const artist of strategy.artists) {
                if (compensationTracks.length >= compensationNeeded * 2) break;
                try {
                  // Search for tracks by artist name instead of using getArtistTopRecent
                  // since we have names, not IDs
                  const results = await searchTracksByArtists(accessToken, [artist], 10);
                  if (results && results.length > 0) {
                    compensationTracks.push(...results);
                  }
                } catch (error) {
                  console.log(`[STREAM:${traceId}] COMPENSATION: Artist ${artist} failed:`, error.message);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
            
            if (compensationTracks.length > 0) {
              console.log(`[STREAM:${traceId}] COMPENSATION: Found ${compensationTracks.length} potential compensation tracks`);
              
              // Apply exclusions and deduplication
              const filteredCompensation = compensationTracks.filter(track => notExcluded(track, intent.exclusions));
              const dedupedCompensation = dedupeAgainstUsed(filteredCompensation, usedTracks);
              
              console.log(`[STREAM:${traceId}] COMPENSATION: ${compensationTracks.length} → ${filteredCompensation.length} → ${dedupedCompensation.length} after filtering/dedup`);
              
              // Add to deduped array
              const toAdd = dedupedCompensation.slice(0, compensationNeeded);
              deduped.push(...toAdd);
              compensationNeeded -= toAdd.length;
              
              console.log(`[STREAM:${traceId}] COMPENSATION: Added ${toAdd.length} tracks, need ${compensationNeeded} more`);
              
              // Update global used tracks
              toAdd.forEach(track => usedTracks.add(track.id));
            }
            
          } catch (error) {
            console.error(`[STREAM:${traceId}] COMPENSATION: Strategy ${strategy.type} failed:`, error);
          }
        }
        
      } catch (error) {
        console.error(`[STREAM:${traceId}] COMPENSATION ERROR:`, error);
      }
    }
    
    console.log(`[STREAM:${traceId}] Starting to yield ${deduped.length} deduped tracks in chunks`);
    
    // Yield in chunks
    for (let i = 0; i < deduped.length && totalYielded < remaining; i += chunkSize) {
      const chunk = deduped.slice(i, i + chunkSize);
      const toYield = chunk.slice(0, remaining - totalYielded);
      totalYielded += toYield.length;
      
      if (toYield.length > 0) {
        chunkCounter++;
        console.log(`[STREAM:${traceId}] Spotify chunk ${chunkCounter} yielded: ${toYield.length} tracks, total: ${totalYielded}/${remaining}`);
        console.log(`[STREAM:${traceId}] Chunk tracks:`, toYield.map(t => ({ name: t.name, artists: t.artistNames })));
        yield toYield;
        
        // Add delay between chunks for better UX
        if (totalYielded < remaining) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        }
      }
      
      if (totalYielded >= remaining) break;
    }
    
    // If we still need more tracks, try with broader search terms
    if (totalYielded < remaining) {
      const needMore = remaining - totalYielded;
      const compensationNeeded = filteredOut > 0 ? filteredOut : 0;
      const totalNeeded = needMore + compensationNeeded;
      
      console.log(`[STREAM:${traceId}] ===== BROADER SEARCH PROCESS =====`);
      console.log(`[STREAM:${traceId}] BROADER SEARCH: Still need ${needMore} tracks, compensation needed: ${compensationNeeded}, total: ${totalNeeded}`);
      console.log(`[STREAM:${traceId}] BROADER SEARCH REASON: Initial search didn't yield enough tracks`);
      
      try {
        // Priority: Priority artists -> LLM tracks -> LLM artists -> Context artists (NO generic terms)
        let searchArtists = [];
        
        const llmTracks = intent.tracks_llm || [];
        const llmArtists = intent.artists_llm || [];
        const priorityArtists = intent.priority_artists || [];
        
        console.log(`[STREAM:${traceId}] BROADER SEARCH ARTIST SELECTION:`, {
          priorityArtists: priorityArtists.length,
          llmTracks: llmTracks.length,
          llmArtists: llmArtists.length,
          hasContexts: intent.contexts && MUSICAL_CONTEXTS[intent.contexts]
        });
        
        // Create a diversified search strategy to avoid repetition
        const allAvailableArtists = [];
        
        if (priorityArtists.length > 0) {
          allAvailableArtists.push(...priorityArtists);
        }
        if (llmTracks.length > 0) {
          const trackArtists = llmTracks.map(t => t.artist).filter(Boolean);
          allAvailableArtists.push(...trackArtists);
        }
        if (llmArtists.length > 0) {
          allAvailableArtists.push(...llmArtists);
        }
        if (intent.contexts && MUSICAL_CONTEXTS[intent.contexts]) {
          const contextArtists = MUSICAL_CONTEXTS[intent.contexts].artists || [];
          allAvailableArtists.push(...contextArtists);
        }
        
        // Remove duplicates and shuffle for variety
        const uniqueArtists = [...new Set(allAvailableArtists)];
        const shuffledArtists = [...uniqueArtists].sort(() => Math.random() - 0.5);
        
        // Use different artists for broader search (skip first few to get variety)
        const broaderSearchArtists = shuffledArtists.slice(3, 15); // Skip first 3, take next 12
        
        if (broaderSearchArtists.length > 0) {
          searchArtists = broaderSearchArtists;
          console.log(`[STREAM:${traceId}] BROADER SEARCH: ✅ Using diversified artists (${broaderSearchArtists.length}):`, broaderSearchArtists.slice(0, 5));
          console.log(`[STREAM:${traceId}] BROADER SEARCH: Strategy = Diversified artist selection to avoid repetition`);
        } else {
          console.log(`[STREAM:${traceId}] BROADER SEARCH: ❌ No artists available, skipping broader search`);
          console.log(`[STREAM:${traceId}] BROADER SEARCH: Strategy = No fallback available`);
        }
        
        console.log(`[STREAM:${traceId}] BROADER SEARCH: Searching with ${searchArtists.length} artists for ${totalNeeded} tracks`);
        console.log(`[STREAM:${traceId}] BROADER SEARCH: Current global usedTracks size: ${usedTracks.size}`);
        
        const broaderTracks = dedupeById(await radioFromRelatedTop(accessToken, searchArtists, totalNeeded));
        const broaderFiltered = broaderTracks.filter(track => notExcluded(track, intent.exclusions));
        const broaderDeduped = dedupeAgainstUsed(broaderFiltered, usedTracks);
        
        console.log(`[STREAM:${traceId}] BROADER SEARCH: Found ${broaderTracks.length} tracks, ${broaderFiltered.length} after exclusions, ${broaderDeduped.length} after deduplication`);
        console.log(`[STREAM:${traceId}] BROADER SEARCH: Deduplication removed ${broaderFiltered.length - broaderDeduped.length} already used tracks`);
        
        if (broaderDeduped.length > 0) {
          const toYield = broaderDeduped.slice(0, remaining - totalYielded);
          totalYielded += toYield.length;
          
          if (toYield.length > 0) {
            chunkCounter++;
            console.log(`[STREAM:${traceId}] Broader search chunk ${chunkCounter} yielded: ${toYield.length} tracks, total: ${totalYielded}/${remaining}`);
            console.log(`[STREAM:${traceId}] Broader search tracks:`, toYield.map(t => ({ name: t.name, artists: t.artistNames })));
            yield toYield;
          }
        }
      } catch (error) {
        console.error(`[STREAM:${traceId}] Broader search failed:`, error);
      }
    }
    
    // LAST RESORT: Disabled generic search to avoid introducing non-artist artifacts
    if (totalYielded < remaining) {
      const finalNeeded = remaining - totalYielded;
      console.log(`[STREAM:${traceId}] LAST RESORT: Skipped generic search (need ${finalNeeded}), keeping only radios/related sources`);
    }
    
  } catch (error) {
    console.error(`[STREAM:${traceId}] Error in Spotify phase:`, error);
  }
  
  console.log(`[STREAM:${traceId}] Spotify phase completed: ${totalYielded}/${remaining} tracks`);
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

/**
 * Main SSE streaming handler - supports both GET and POST
 */
// Helper function to extract parameters from either POST body or GET query
async function extractParams(request) {
  if (request.method === 'POST') {
    const body = await request.json();
    return {
      prompt: body.prompt,
      target_tracks: body.target_tracks || 50,
      playlist_name: body.playlist_name
    };
  } else {
    const { searchParams } = new URL(request.url);
    return {
      prompt: searchParams.get('prompt'),
      target_tracks: parseInt(searchParams.get('target_tracks')) || 50,
      playlist_name: searchParams.get('playlist_name')
    };
  }
}

export async function GET(request) {
  return handleStreamingRequest(request);
}

export async function POST(request) {
  return handleStreamingRequest(request);
}

async function handleStreamingRequest(request) {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Reset global usedTracks for new session
  globalUsedTracks.clear();
  
  try {
    const { prompt, target_tracks = 50, playlist_name } = await extractParams(request);
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    
    console.log(`[STREAM:${traceId}] Starting SSE streaming for: "${prompt}"`);
    
    // Get PLEIA user and Spotify access token from hub auth
    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.email) {
      console.log(`[STREAM:${traceId}] No authenticated PLEIA user found`);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const accessToken = await getHubAccessToken();
    if (!accessToken) {
      console.log(`[STREAM:${traceId}] No valid Spotify access token available`);
      return NextResponse.json({ error: "Spotify authentication required" }, { status: 401 });
    }

    console.log(`[STREAM:${traceId}] Session found for user: ${pleiaUser.email}`);

    // Check usage limit before generating playlist (using Supabase, not KV)
    if (pleiaUser.email) {
      try {
        const { getUsageSummary, getUserPlan } = await import('../../../../lib/billing/usageV2');
        const usageSummary = await getUsageSummary({ email: pleiaUser.email, userId: pleiaUser.id });
        const planContext = await getUserPlan(pleiaUser.email);
        
        const used = usageSummary.used || 0;
        const remaining = usageSummary.remaining;
        const isUnlimited = planContext?.unlimited || usageSummary.unlimited;
        const isFounder = planContext?.isFounder || planContext?.plan === 'founder';
        
        // Check if user has reached limit (only if not unlimited)
        if (!isUnlimited && typeof remaining === 'number' && remaining <= 0) {
          console.log(`[STREAM:${traceId}] ❌ USAGE LIMIT REACHED for user ${pleiaUser.email}: ${used}/${usageSummary.limit || 5}`);
          return NextResponse.json({
            code: "LIMIT_REACHED",
            error: "Usage limit reached",
            message: "You have reached your usage limit. Please upgrade to continue generating playlists.",
            used: used,
            remaining: 0,
            limit: usageSummary.limit || 5
          }, { status: 403 });
        } else if (isUnlimited || isFounder) {
          console.log(`[STREAM:${traceId}] ✅ Founder/Unlimited user - unlimited access`);
        } else {
          console.log(`[STREAM:${traceId}] ✅ Usage check passed: ${used}/${usageSummary.limit || 5} (remaining: ${remaining})`);
        }
      } catch (usageError) {
        console.error(`[STREAM:${traceId}] ❌ Error checking usage status:`, usageError);
        // FAIL CLOSED: If we can't check usage, we should reject the request for safety
        return NextResponse.json({
          code: "USAGE_CHECK_FAILED",
          error: "Failed to verify usage limits",
          message: "Unable to verify your usage limits. Please try again later."
        }, { status: 500 });
      }
    }
    
    // Create SSE response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        let allTracks = [];
        // Use global usedTracks to prevent repetition across all contexts
        let usedTracks = globalUsedTracks;
        let heartbeatInterval;
        let usageConsumedInError = false; // Track if usage was consumed during error recovery
        
        // Set up heartbeat
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: HEARTBEAT\ndata: {"timestamp": ${Date.now()}}\n\n`));
          } catch (error) {
            clearInterval(heartbeatInterval);
          }
        }, 8000);
        
        // Set up timeout
        let isClosed = false;
        const timeout = setTimeout(() => {
          if (isClosed) return;
          isClosed = true;
          
          console.log(`[STREAM:${traceId}] Timeout reached, sending partial results`);
          clearInterval(heartbeatInterval);
          
          try {
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
          } catch (error) {
            console.log(`[STREAM:${traceId}] Controller already closed during timeout`);
          }
        }, target_tracks > 100 ? 300000 : 180000); // 5 minutes for high track counts, 3 minutes for normal
        
        // Main processing
        (async () => {
          try {
                   // Get intent from LLM
                   controller.enqueue(encoder.encode(`event: LLM_START\ndata: {"message": "Generating intent..."}\n\n`));
                   
                   console.log(`[STREAM:${traceId}] ===== STARTING PLAYLIST GENERATION =====`);
                   console.log(`[STREAM:${traceId}] Prompt: "${prompt}"`);
                   console.log(`[STREAM:${traceId}] Target tracks: ${target_tracks}`);
                   
                   const intent = await getIntentFromLLM(prompt, target_tracks);
                   if (!intent) {
                     throw new Error("Failed to generate intent");
                   }
                   
                   // Log prompt to Supabase
                   console.log(`[STREAM:${traceId}] ===== LOGGING PROMPT TO SUPABASE =====`);
                   console.log(`[STREAM:${traceId}] Email: ${pleiaUser.email}`);
                   console.log(`[STREAM:${traceId}] Prompt: "${prompt}"`);
                   try {
                     const logResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                         type: 'prompt',
                         payload: { email: pleiaUser.email, prompt, source: 'web' }
                       })
                     });
                     if (logResponse.ok) {
                       console.log(`[STREAM:${traceId}] ===== PROMPT LOGGED =====`);
                     }
                   } catch (logError) {
                     console.warn(`[STREAM:${traceId}] Failed to log prompt:`, logError);
                   }
                   
                   console.log(`[STREAM:${traceId}] ===== INTENT GENERATED =====`);
                   console.log(`[STREAM:${traceId}] Intent summary:`, {
                     mode: determineMode(intent, prompt),
                     contexts: intent.contexts?.key || 'none',
                     llmTracks: intent.tracks_llm?.length || 0,
                     artists: intent.artists_llm?.length || 0,
                     filteredArtists: intent.filtered_artists?.length || 0,
                     priorityArtists: intent.priority_artists?.length || 0,
                     exclusions: intent.exclusions ? 'yes' : 'no',
                     canonized: intent.canonized ? 'yes' : 'no'
                   });

            
                   // Process LLM tracks
                   controller.enqueue(encoder.encode(`event: LLM_START\ndata: {"message": "Processing LLM tracks...", "target": ${target_tracks}}\n\n`));
                   
                   console.log(`[STREAM:${traceId}] ===== STARTING LLM PHASE =====`);
            
            // CRITICAL: NO consumir uso durante la fase LLM - solo al final cuando haya tracks válidos
            // Esto previene consumo de uso si hay errores posteriores
            for await (const chunk of yieldLLMChunks(accessToken, intent, target_tracks, traceId, usedTracks)) {
              // Add new tracks to usedTracks set to prevent repetition
              chunk.forEach(track => {
                if (track.id) usedTracks.add(track.id);
              });
              allTracks = [...allTracks, ...chunk];
              
              // NO consumir uso aquí - se consumirá al final si hay tracks válidos
              
              try {
                controller.enqueue(encoder.encode(`event: LLM_CHUNK\ndata: ${JSON.stringify({
                  tracks: chunk,
                  totalSoFar: allTracks.length,
                  target: target_tracks,
                  progress: Math.round((allTracks.length / target_tracks) * 100),
                  message: `Añadiendo canciones: [${allTracks.length}/${target_tracks}]`
                })}\n\n`));
              } catch (error) {
                if (error.code === 'ERR_INVALID_STATE') {
                  console.log(`[STREAM:${traceId}] Controller closed, stopping LLM chunk processing`);
                  break;
                }
                throw error;
              }
              
              console.log(`[STREAM:${traceId}] LLM chunk sent: ${chunk.length} tracks, total: ${allTracks.length}/${target_tracks}`);
            }
            
            // For NORMAL mode: trim LLM tracks to 70% and prepare for Spotify
            const mode = determineMode(intent, intent.prompt || '');
            const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
            const hasContexts = intent.contexts && intent.contexts.key && intent.contexts.key !== 'normal';
            
            if (mode === 'NORMAL' && !isUndergroundStrict && !hasContexts) {
              const llmTarget = Math.max(50, Math.ceil(target_tracks * 0.70));
              if (allTracks.length > llmTarget) {
                console.log(`[STREAM:${traceId}] NORMAL mode: trimming LLM tracks from ${allTracks.length} to ${llmTarget}`);
                allTracks = allTracks.slice(0, llmTarget);
                
                // Send trim update
                controller.enqueue(encoder.encode(`event: LLM_CHUNK\ndata: ${JSON.stringify({
                  tracks: [],
                  totalSoFar: allTracks.length,
                  target: target_tracks,
                  progress: Math.round((allTracks.length / target_tracks) * 100),
                  trimmed: true,
                  message: `Trimmed to ${llmTarget} LLM tracks (70%)`
                })}\n\n`));
              }
            }
            
                   controller.enqueue(encoder.encode(`event: LLM_DONE\ndata: {"totalSoFar": ${allTracks.length}, "target": ${target_tracks}}\n\n`));
                   
                   console.log(`[STREAM:${traceId}] ===== LLM PHASE COMPLETED =====`);
                   console.log(`[STREAM:${traceId}] LLM tracks collected: ${allTracks.length}/${target_tracks}`);
            
                   // Process Spotify tracks if needed - keep trying until we reach target
                   let remaining = target_tracks - allTracks.length;
                   let spotifyAttempts = 0;
                   const maxSpotifyAttempts = 5;
                   
                   console.log(`[STREAM:${traceId}] ===== STARTING SPOTIFY PHASE =====`);
                   console.log(`[STREAM:${traceId}] Remaining tracks needed: ${remaining}`);
            
            while (remaining > 0 && spotifyAttempts < maxSpotifyAttempts) {
              spotifyAttempts++;
              console.log(`[STREAM:${traceId}] Spotify attempt ${spotifyAttempts}/${maxSpotifyAttempts}, need: ${remaining} more tracks`);
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_START\ndata: {"message": "Getting Spotify recommendations...", "remaining": ${remaining}, "attempt": ${spotifyAttempts}, "target": ${target_tracks}}\n\n`));
              
              let spotifyYielded = 0;
              for await (const chunk of yieldSpotifyChunks(accessToken, intent, remaining, traceId, usedTracks, target_tracks)) {
                // Add new tracks to usedTracks set to prevent repetition
                chunk.forEach(track => {
                  if (track.id) usedTracks.add(track.id);
                });
                allTracks = [...allTracks, ...chunk];
                spotifyYielded += chunk.length;
                
                // NO consumir uso aquí - se consumirá al final si hay tracks válidos
                
                controller.enqueue(encoder.encode(`event: SPOTIFY_CHUNK\ndata: ${JSON.stringify({
                  tracks: chunk,
                  totalSoFar: allTracks.length,
                  target: target_tracks,
                  progress: Math.round((allTracks.length / target_tracks) * 100),
                  attempt: spotifyAttempts,
                  message: `Añadiendo canciones: [${allTracks.length}/${target_tracks}]`
                })}\n\n`));
                
                console.log(`[STREAM:${traceId}] Spotify chunk sent: ${chunk.length} tracks, total: ${allTracks.length}/${target_tracks}`);
                
                // Update remaining
                remaining = target_tracks - allTracks.length;
                if (remaining <= 0) break;
              }
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_DONE\ndata: {"totalSoFar": ${allTracks.length}, "attempt": ${spotifyAttempts}, "target": ${target_tracks}}\n\n`));
              
              // If we didn't get any new tracks, try with broader search terms (solo si NO es ARTIST_STYLE)
              const currentMode = determineMode(intent, intent.prompt || '');
              const isArtistStyleMode = currentMode === 'ARTIST_STYLE';
              
              if (spotifyYielded === 0 && remaining > 0) {
                console.log(`[STREAM:${traceId}] No new tracks from Spotify, trying broader search...`);
                
                // 🚨 CRITICAL: Para ARTIST_STYLE, si no se generaron tracks nuevos, NO hacer más intentos
                // porque cada intento generará los mismos tracks que ya están en usedTracks
                if (isArtistStyleMode) {
                  console.log(`[STREAM:${traceId}] ARTIST_STYLE mode: No new tracks generated, stopping attempts (would generate duplicates)`);
                  break; // Salir del loop de intentos
                }
                
                // Add context artists to intent for next attempt (solo para modos NO-ARTIST_STYLE)
                if (!intent.artists_llm) intent.artists_llm = [];
                if (intent.contexts && MUSICAL_CONTEXTS[intent.contexts]) {
                  const contextArtists = MUSICAL_CONTEXTS[intent.contexts].artists || [];
                  console.log(`[STREAM:${traceId}] Adding context artists:`, contextArtists.slice(0, 5));
                  intent.artists_llm.push(...contextArtists.slice(0, 10));
                } else {
                  console.log(`[STREAM:${traceId}] No context found, skipping generic terms`);
                }
              }
              
              // Update remaining for next iteration
              remaining = target_tracks - allTracks.length;
              
              // 🚨 CRITICAL: Para ARTIST_STYLE, si ya generamos tracks, salir del loop (no hacer más intentos)
              if (isArtistStyleMode && allTracks.length > 0 && spotifyYielded > 0) {
                console.log(`[STREAM:${traceId}] ARTIST_STYLE mode: Generated ${spotifyYielded} tracks, stopping attempts (would generate duplicates)`);
                break; // Salir del loop de intentos
              }
            }
            
            // Final check - if we still don't have enough AND outside tolerance, try one more time
            const finalTolerance = allTracks.length >= (target_tracks - 3) && allTracks.length <= (target_tracks + 3);
            if (finalTolerance) {
              console.log(`[STREAM:${traceId}] WITHIN FINAL TOLERANCE: ${allTracks.length}/${target_tracks} - SKIPPING final attempt`);
            } else if (!finalTolerance && allTracks.length < target_tracks) {
              console.log(`[STREAM:${traceId}] Final attempt: need ${target_tracks - allTracks.length} more tracks (outside tolerance)`);
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_START\ndata: {"message": "Últimos retoques antes de lanzar tu playlist...", "remaining": ${target_tracks - allTracks.length}, "target": ${target_tracks}}\n\n`));
              
              try {
                // Skip final attempt with generic terms - they cause problems
                console.log(`[STREAM:${traceId}] Skipping final attempt with generic terms`);
                const finalTracks = [];
                const filtered = finalTracks.filter(track => notExcluded(track, intent.exclusions));
                
                if (filtered.length > 0) {
                  const toAdd = filtered.slice(0, target_tracks - allTracks.length);
                  allTracks = [...allTracks, ...toAdd];
                  
                  controller.enqueue(encoder.encode(`event: SPOTIFY_CHUNK\ndata: ${JSON.stringify({
                    tracks: toAdd,
                    totalSoFar: allTracks.length,
                    target: target_tracks,
                    progress: Math.round((allTracks.length / target_tracks) * 100),
                    final: true,
                    message: `Añadiendo canciones: [${allTracks.length}/${target_tracks}]`
                  })}\n\n`));
                  
                  console.log(`[STREAM:${traceId}] Final attempt yielded: ${toAdd.length} tracks, total: ${allTracks.length}/${target_tracks}`);
                }
              } catch (error) {
                console.error(`[STREAM:${traceId}] Final attempt failed:`, error);
              }
            }
            
            // Final deduplication to prevent any duplicates
            console.log(`[STREAM:${traceId}] Final deduplication: ${allTracks.length} tracks before dedup`);
            allTracks = dedupeById(allTracks);
            console.log(`[STREAM:${traceId}] Final deduplication: ${allTracks.length} tracks after dedup`);
            
            // 🚨 CRITICAL: NO aplicar caps al final si es ARTIST_STYLE - ya se aplicaron DURANTE la generación
            const finalMode = determineMode(intent, intent.prompt || '');
            const isArtistStyleMode = finalMode === 'ARTIST_STYLE';
            
            if (!isArtistStyleMode) {
              // 🚨 MEJORADO: Usar sistema de caps dinámicos
              const { detectSpecialCases, calculateDynamicCaps } = await import('../../../../lib/helpers.js');
              const specialCases = detectSpecialCases(intent.prompt || '', intent.priority_artists || [], intent.exclusions?.banned_artists || []);
              const dynamicCaps = calculateDynamicCaps(target_tracks, intent.priority_artists?.length || 0, specialCases, specialCases.onlyArtists.length > 0);
              
              // Usar cap dinámico calculado
              const dynamicCap = dynamicCaps.nonPriorityCap || 5;
              console.log(`[STREAM:${traceId}] Applying artist limits: ${allTracks.length} tracks before limiting (cap=${dynamicCap}, specialCases=${JSON.stringify(specialCases)})`);
              allTracks = limitTracksPerArtist(allTracks, dynamicCap, specialCases, dynamicCaps);
              console.log(`[STREAM:${traceId}] Artist limits applied: ${allTracks.length} tracks after limiting`);
            } else {
              console.log(`[STREAM:${traceId}] ARTIST_STYLE mode detected - skipping final artist limits (already applied during generation)`);
            }
            
             // If we removed too many tracks due to artist limits, compensate (solo si NO es ARTIST_STYLE)
             let missingTracks = target_tracks - allTracks.length;
             // Tolerance window: if within N±3, accept without more compensation (48-52 for target 50)
             const withinTolerance = allTracks.length >= Math.max(1, target_tracks - 3) && allTracks.length <= (target_tracks + 3);
             
             // 🚨 CRITICAL: Para ARTIST_STYLE, NO hacer compensación adicional - ya se hizo durante la generación
             if (isArtistStyleMode) {
               console.log(`[STREAM:${traceId}] ARTIST_STYLE mode detected - skipping additional compensation (already applied during generation)`);
               console.log(`[STREAM:${traceId}] ARTIST_STYLE final count: ${allTracks.length}/${target_tracks} tracks`);
             } else if (withinTolerance) {
               console.log(`[STREAM:${traceId}] COMPENSATION: Within tolerance (${allTracks.length}/${target_tracks}), no compensation needed`);
             } else if (!withinTolerance && missingTracks > 0) {
              console.log(`[STREAM:${traceId}] COMPENSATION AFTER ARTIST LIMITS: Need ${missingTracks} more tracks`);
              
              try {
                // Generate additional tracks with diversification
                const compensationTracks = [];
                const existingArtists = new Set();
                allTracks.forEach(track => {
                  let namesArr = [];
                  if (Array.isArray(track?.artistNames)) namesArr = track.artistNames;
                  else if (typeof track?.artistNames === 'string') namesArr = track.artistNames.split(',').map(s => s.trim()).filter(Boolean);
                  else if (Array.isArray(track?.artists)) namesArr = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                  namesArr.forEach(artist => existingArtists.add(artist));
                });
                
                console.log(`[STREAM:${traceId}] COMPENSATION: Existing artists (${existingArtists.size}):`, Array.from(existingArtists));
                
                // Use existing collaborators for compensation (MAINTAIN SEARCH CONTEXT)
                const bannedArtists = intent.exclusions?.banned_artists || [];
                const bannedArtistsLower = bannedArtists.map(a => a.toLowerCase());
                
                // Get existing artists that haven't reached their limit (MAINTAIN CONTEXT)
                const existingArtistsList = Array.from(existingArtists);
                const availableArtists = existingArtistsList.filter(artist => {
                  const isNotBanned = !bannedArtistsLower.some(banned => artist.toLowerCase().includes(banned));
                  if (!isNotBanned) {
                    console.log(`[STREAM:${traceId}] COMPENSATION: Skipping banned artist "${artist}"`);
                  }
                  return isNotBanned;
                });
                
                console.log(`[STREAM:${traceId}] COMPENSATION: Using ${availableArtists.length} existing collaborators for compensation`);
                
                // If no context artists available, use some existing artists that haven't reached the cap
                let compensationArtists = availableArtists;
                if (compensationArtists.length === 0) {
                  console.log(`[STREAM:${traceId}] COMPENSATION: No new artists available, using existing artists with room`);
                  const artistCounts = new Map();
                  allTracks.forEach(track => {
                    let namesArr = [];
                    if (Array.isArray(track?.artistNames)) namesArr = track.artistNames;
                    else if (typeof track?.artistNames === 'string') namesArr = track.artistNames.split(',').map(s => s.trim()).filter(Boolean);
                    else if (Array.isArray(track?.artists)) namesArr = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                    
                    namesArr.forEach(artist => {
                      artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
                    });
                  });
                  
                  compensationArtists = Array.from(artistCounts.entries())
                    .filter(([artist, count]) => count < dynamicCap && !bannedArtistsLower.some(banned => artist.toLowerCase().includes(banned)))
                    .map(([artist]) => artist);
                  
                  console.log(`[STREAM:${traceId}] COMPENSATION: Using ${compensationArtists.length} existing artists with room`);
                }
                
                // More aggressive compensation - try multiple approaches until we have enough
                let attempts = 0;
                const maxAttempts = Math.max(20, missingTracks * 2); // Increase max attempts based on need
                
                while (compensationTracks.length < missingTracks * 3 && attempts < maxAttempts && compensationArtists.length > 0) {
                  attempts++;
                  const artist = compensationArtists[attempts % compensationArtists.length];
                  
                  try {
                    console.log(`[STREAM:${traceId}] COMPENSATION ATTEMPT ${attempts}: Getting tracks for ${artist}`);
                    // Search for tracks by artist name instead of using getArtistTopRecent
                    // since we have names, not IDs
                    const artistTracks = await searchTracksByArtists(accessToken, [artist], 10); // Increase from 8 to 10
                    if (artistTracks && artistTracks.length > 0) {
                      const filteredArtistTracks = artistTracks.filter(track => notExcluded(track, intent.exclusions));
                      compensationTracks.push(...filteredArtistTracks);
                      console.log(`[STREAM:${traceId}] COMPENSATION: Got ${filteredArtistTracks.length} artist tracks for ${artist} (total: ${compensationTracks.length})`);
                    }
                  } catch (error) {
                    console.log(`[STREAM:${traceId}] COMPENSATION: Failed to get tracks for ${artist}:`, error.message);
                  }
                  
                  await new Promise(resolve => setTimeout(resolve, 200)); // Faster rate limiting
                }
                
                if (compensationTracks.length > 0) {
                  // Add compensation tracks
                  const dedupedCompensation = dedupeAgainstUsed(compensationTracks, usedTracks);
                  const toAdd = dedupedCompensation.slice(0, missingTracks);
                  allTracks.push(...toAdd);
                  
                  console.log(`[STREAM:${traceId}] COMPENSATION: Added ${toAdd.length} compensation tracks (had ${dedupedCompensation.length} available)`);
                  
                  // Re-apply artist limits to new tracks (solo si NO es ARTIST_STYLE)
                  if (!isArtistStyleMode) {
                    allTracks = limitTracksPerArtist(allTracks, dynamicCap);
                    console.log(`[STREAM:${traceId}] Final artist limits applied: ${allTracks.length} tracks`);
                  } else {
                    console.log(`[STREAM:${traceId}] ARTIST_STYLE mode - skipping artist limits re-application (already applied during generation)`);
                  }
                  
                  // Final check: if still not enough tracks, try more aggressive collaboration search
                  const finalMissing = target_tracks - allTracks.length;
                  if (finalMissing > 0) {
                    console.log(`[STREAM:${traceId}] COMPENSATION: Still need ${finalMissing} more tracks, trying expanded collaboration search`);
                    
                    try {
                      // FIRST: Try to get more tracks from artists already used (even if they exceed limits)
                      const artistCounts = new Map();
                      allTracks.forEach(track => {
                        let namesArr = [];
                        if (Array.isArray(track?.artistNames)) namesArr = track.artistNames;
                        else if (typeof track?.artistNames === 'string') namesArr = track.artistNames.split(',').map(s => s.trim()).filter(Boolean);
                        else if (Array.isArray(track?.artists)) namesArr = track.artists.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean);
                        
                        namesArr.forEach(artist => {
                          artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
                        });
                      });
                      
                      // Get all artists that already have tracks (even if at limit)
                      const allUsedArtists = Array.from(artistCounts.keys());
                      
                      if (allUsedArtists.length > 0) {
                        console.log(`[STREAM:${traceId}] COMPENSATION: Trying to get more tracks from ${allUsedArtists.length} already used artists (ignoring limits)`);
                        // Limit to first 20 artists to avoid long searches
                        const limitedArtists = allUsedArtists.slice(0, 20);
                        const overLimitTracks = dedupeById(await searchTracksByArtists(accessToken, limitedArtists, Math.min(finalMissing * 2, 10)));
                        const dedupedOverLimit = dedupeAgainstUsed(overLimitTracks, usedTracks);
                        const overLimitToAdd = dedupedOverLimit.slice(0, finalMissing);
                        allTracks.push(...overLimitToAdd);
                        
                        console.log(`[STREAM:${traceId}] COMPENSATION: Over-limit search added ${overLimitToAdd.length} tracks (total: ${allTracks.length}/${target_tracks})`);
                        
                        // Update final missing count
                        const stillMissingAfterOverLimit = target_tracks - allTracks.length;
                        if (stillMissingAfterOverLimit <= 0) {
                          console.log(`[STREAM:${traceId}] COMPENSATION: Reached target with over-limit tracks, stopping here`);
                          return; // Exit early if we reached the target
                        }
                      }
                      // Get more artists from existing tracks to expand search
                      const existingArtists = Array.from(new Set(
                        allTracks.flatMap(track => 
                          track.artists?.map(a => a.name) || track.artistNames || []
                        )
                      )).filter(name => name && name.trim());
                      
                      if (existingArtists.length > 0) {
                        console.log(`[STREAM:${traceId}] COMPENSATION: Expanding search with ${existingArtists.length} existing artists`);
                        const expandedTracks = dedupeById(await searchTracksByArtists(accessToken, existingArtists.slice(0, 30), finalMissing * 5));
                        const dedupedExpanded = dedupeAgainstUsed(expandedTracks, usedTracks);
                        const finalToAdd = dedupedExpanded.slice(0, finalMissing);
                        allTracks.push(...finalToAdd);
                        
                        console.log(`[STREAM:${traceId}] COMPENSATION: Expanded collaboration search added ${finalToAdd.length} final tracks (total: ${allTracks.length})`);
                        
                        // If still not enough, try even more aggressive search (LIMITED)
                        const stillMissing = target_tracks - allTracks.length;
                        if (stillMissing > 0 && stillMissing <= 5) { // Only if we're close (missing 5 or less)
                          console.log(`[STREAM:${traceId}] COMPENSATION: Still need ${stillMissing} more tracks, trying limited aggressive search`);
                          // Limit to 15 artists and max 3 tracks per artist
                          const limitedExistingArtists = existingArtists.slice(0, 15);
                          const superExpandedTracks = dedupeById(await searchTracksByArtists(accessToken, limitedExistingArtists, Math.min(stillMissing * 3, 10)));
                          const dedupedSuper = dedupeAgainstUsed(superExpandedTracks, usedTracks);
                          const superFinalToAdd = dedupedSuper.slice(0, stillMissing);
                          allTracks.push(...superFinalToAdd);
                          
                          console.log(`[STREAM:${traceId}] COMPENSATION: Super aggressive search added ${superFinalToAdd.length} final tracks (total: ${allTracks.length}/${target_tracks})`);
                        } else if (stillMissing > 5) {
                          console.log(`[STREAM:${traceId}] COMPENSATION: Still need ${stillMissing} tracks, but too many - stopping to avoid long search`);
                        }
                      } else {
                        console.log(`[STREAM:${traceId}] COMPENSATION: No existing artists to expand with, stopping at ${allTracks.length} tracks`);
                      }
                    } catch (error) {
                      console.log(`[STREAM:${traceId}] COMPENSATION: Generic search failed:`, error.message);
                    }
                  }
                } else {
                  console.log(`[STREAM:${traceId}] COMPENSATION: No compensation tracks found`);
                }
                
              } catch (error) {
                console.error(`[STREAM:${traceId}] COMPENSATION ERROR:`, error);
              }
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
            
            // CRITICAL: Validar tracks finales y consumir uso SOLO si hay tracks válidos
            const validTracks = allTracks.filter(t => t && t.id && t.name);
            console.log(`[STREAM:${traceId}] Final validation: ${validTracks.length}/${allTracks.length} valid tracks`);
            
            let usageEventId = null;
            let usageConsumed = false;
            
            // Solo consumir uso si hay al menos 1 track válido
            if (validTracks.length > 0 && pleiaUser?.email) {
              try {
                console.log(`[STREAM:${traceId}] ✅ Generation successful: ${validTracks.length} valid tracks - consuming usage now`);
                
                const { consumeUsage } = await import('../../../../lib/billing/usageV2');
                const usageResult = await consumeUsage(
                  { email: pleiaUser.email, userId: pleiaUser.id },
                  {
                    traceId,
                    phase: 'stream-final',
                    prompt: intent.prompt || prompt || '',
                    targetTracks: target_tracks,
                    tracksGenerated: validTracks.length,
                  }
                );
                
                if (!usageResult.ok) {
                  console.warn(`[STREAM:${traceId}] Usage consumption failed: ${usageResult.reason} - ${usageResult.remaining} remaining`);
                } else {
                  usageConsumed = true;
                  usageEventId = usageResult.usageId || null;
                  const remaining = typeof usageResult.remaining === 'number' ? usageResult.remaining : '∞';
                  const used = usageResult.used || 0;
                  const limit = usageResult.plan === 'founder' ? '∞' : (usageResult.remaining === 'unlimited' ? '∞' : (typeof remaining === 'number' ? used + remaining : '∞'));
                  console.log(`[STREAM:${traceId}] ✅ Usage consumed successfully: ${used}/${limit} (remaining: ${remaining})`);
                  
                  // Enviar actualización de uso al frontend
                  try {
                    controller.enqueue(encoder.encode(`event: USAGE_UPDATE\ndata: ${JSON.stringify({
                      used,
                      remaining,
                      limit: typeof limit === 'number' ? limit : null,
                      unlimited: usageResult.remaining === 'unlimited',
                      plan: usageResult.plan || 'free'
                    })}\n\n`));
                  } catch (updateError) {
                    console.warn(`[STREAM:${traceId}] Failed to send usage update:`, updateError);
                  }
                  
                  // Log metrics to Supabase
                  try {
                    await logMetrics(pleiaUser.email, 'generate_playlist', {
                      prompt: intent.prompt || prompt || '',
                      trackCount: validTracks.length,
                      plan: usageResult.plan || 'free',
                      remainingUses: typeof usageResult.remaining === 'number' ? usageResult.remaining : usageResult.remaining,
                      usageEventId: usageEventId
                    });
                    
                    // Log playlist creation
                    await logPlaylist(pleiaUser.email, playlist_name || `Playlist ${new Date().toISOString()}`, prompt, null, null, validTracks.length);
                  } catch (metricsError) {
                    console.warn(`[STREAM:${traceId}] Failed to log metrics/playlist:`, metricsError);
                  }
                }
              } catch (consumeError) {
                console.error(`[STREAM:${traceId}] ❌ Error consuming usage:`, consumeError);
                // NO hacer refund aquí - el error es en el consumo, no en la generación
              }
            } else {
              console.warn(`[STREAM:${traceId}] ❌ No valid tracks generated (${validTracks.length}) - usage will NOT be consumed`);
            }
            
            // Send final result (usar tracks válidos, no todos)
            clearTimeout(timeout);
            clearInterval(heartbeatInterval);
            
            console.log(`[STREAM:${traceId}] ===== SENDING FINAL RESULT =====`);
            console.log(`[STREAM:${traceId}] Final tracks count: ${validTracks.length}`);
            console.log(`[STREAM:${traceId}] Final tracks sample:`, validTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artists?.map(a => a.name) || t.artistNames || [] })));
            
            try {
              controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
                tracks: validTracks,
                totalSoFar: validTracks.length,
                partial: false,
                duration: Date.now() - startTime,
                usageConsumed: usageConsumed
              })}\n\n`));
              
              console.log(`[STREAM:${traceId}] Final result sent, closing connection`);
              controller.close();
            } catch (error) {
              if (error.code === 'ERR_INVALID_STATE') {
                console.log(`[STREAM:${traceId}] Controller already closed, skipping final result`);
              } else {
                throw error;
              }
            }
            
          } catch (error) {
            console.error(`[STREAM:${traceId}] ❌ Processing error:`, error);
            
            // CRITICAL: Si hubo error, validar tracks y hacer refund si fue necesario
            const validTracksOnError = allTracks.filter(t => t && t.id && t.name);
            
            // Si hay tracks válidos a pesar del error, consumir uso normalmente
            if (validTracksOnError.length > 0 && pleiaUser?.email && !usageConsumedInError) {
              try {
                console.log(`[STREAM:${traceId}] Error occurred but we have ${validTracksOnError.length} valid tracks - consuming usage`);
                const { consumeUsage } = await import('../../../../lib/billing/usageV2');
                const usageResult = await consumeUsage(
                  { email: pleiaUser.email, userId: pleiaUser.id },
                  {
                    traceId,
                    phase: 'stream-error-recovery',
                    prompt: intent?.prompt || prompt || '',
                    targetTracks: target_tracks,
                    tracksGenerated: validTracksOnError.length,
                  }
                );
                if (usageResult.ok) {
                  usageConsumedInError = true;
                  console.log(`[STREAM:${traceId}] ✅ Usage consumed despite error: ${usageResult.used}/${usageResult.plan}`);
                }
              } catch (consumeError) {
                console.warn(`[STREAM:${traceId}] Failed to consume usage on error recovery:`, consumeError);
              }
            }
            
            // Si no hay tracks válidos y se consumió uso, registrar para refund (aunque no podemos hacerlo sin usageEventId)
            if (usageConsumedInError && validTracksOnError.length === 0 && pleiaUser?.email) {
              try {
                console.log(`[STREAM:${traceId}] Making refund - usage was consumed but no valid tracks generated`);
                // Nota: necesitaríamos el usageEventId para hacer refund, pero como no lo tenemos aquí,
                // simplemente logueamos el problema. El consumo de uso debería estar atómicamente asociado
                // a la generación exitosa de tracks, por lo que este caso no debería ocurrir normalmente.
                console.warn(`[STREAM:${traceId}] ⚠️ Cannot refund without usageEventId - this indicates a logic error`);
              } catch (refundError) {
                console.warn(`[STREAM:${traceId}] Error attempting refund:`, refundError);
              }
            }
            
            clearTimeout(timeout);
            clearInterval(heartbeatInterval);
            
            // Validar tracks incluso en caso de error (reutilizar variable ya declarada arriba)
            // validTracksOnError ya está declarado arriba en el catch block
            
            if (validTracksOnError.length > 0) {
              controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
                tracks: validTracksOnError,
                totalSoFar: validTracksOnError.length,
                partial: true,
                reason: 'error',
                error: error.message,
                usageConsumed: usageConsumedInError
              })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`event: ERROR\ndata: ${JSON.stringify({
                error: error.message || 'Processing failed',
                totalSoFar: 0,
                usageConsumed: false
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
