// web/app/api/playlist/stream/route.js
// SSE streaming endpoint to prevent Vercel timeouts

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth/config";
import { storeLastRun } from "../../../../lib/debug/utils";
import logger from "../../../../lib/logger";

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
import { searchTracksByArtists, searchGenericTracks } from "../../../../search_helpers";

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
  return tracks.filter(track => {
    if (!track.id || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

/**
 * Deduplicate tracks against a global set of used tracks
 */
function dedupeAgainstUsed(tracks, usedTracks) {
  return tracks.filter(track => {
    if (!track.id) return false;
    return !usedTracks.has(track.id);
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
  
  // Check for underground mode FIRST (highest priority) - only if explicitly underground
  const undergroundKeywords = ['underground', 'indie', 'alternativo', 'alternativa', 'independiente'];
  const hasUndergroundKeyword = undergroundKeywords.some(keyword => promptLower.includes(keyword));
  const hasUndergroundContext = intent.contexts && intent.contexts.key === 'underground_es';
  const hasFilteredArtists = intent.filtered_artists && intent.filtered_artists.length > 0;
  
  console.log(`[MODE-DETECTION] Underground analysis:`, {
    promptLower,
    undergroundKeywords,
    hasUndergroundKeyword,
    hasUndergroundContext,
    hasFilteredArtists,
    contextKey: intent.contexts?.key,
    filteredArtistsCount: intent.filtered_artists?.length || 0
  });
  
  // Only return UNDERGROUND if explicitly underground OR has underground context
  if ((hasUndergroundKeyword && hasUndergroundContext) || (hasUndergroundContext && hasFilteredArtists)) {
    console.log(`[MODE-DETECTION] ✅ UNDERGROUND MODE DETECTED`);
    console.log(`[MODE-DETECTION] Reason: hasUndergroundKeyword=${hasUndergroundKeyword}, hasUndergroundContext=${hasUndergroundContext}, hasFilteredArtists=${hasFilteredArtists}`);
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
  
  // Check for artist style mode (contains "como" or "like") - but not if it's just exclusion
  if ((promptLower.includes('como') || promptLower.includes('like')) && !promptLower.includes('sin')) {
    console.log(`[MODE-DETECTION] ✅ ARTIST_STYLE MODE DETECTED`);
    console.log(`[MODE-DETECTION] Reason: Contains "como" or "like" without "sin"`);
    return 'ARTIST_STYLE';
  }
  
  console.log(`[MODE-DETECTION] ✅ NORMAL MODE DETECTED (default)`);
  console.log(`[MODE-DETECTION] Reason: No specific mode conditions met`);
  return 'NORMAL';
}

/**
 * Generator for LLM tracks in chunks - MODE NORMAL: 75% LLM (get 50 by default), others: exact target
 */
async function* yieldLLMChunks(accessToken, intent, target_tracks, traceId, usedTracks = globalUsedTracks) {
  console.log(`[STREAM:${traceId}] ===== STARTING LLM PHASE =====`);
  console.log(`[STREAM:${traceId}] Target tracks: ${target_tracks}`);
  console.log(`[STREAM:${traceId}] Intent data:`, {
    mode: determineMode(intent, intent.prompt || ''),
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
  
  const llmTracks = intent.tracks_llm || [];
             const chunkSize = 20; // Increased chunk size
  let totalYielded = 0;
  let chunkCounter = 0;
  
  if (llmTracks.length === 0) {
    console.log(`[STREAM:${traceId}] No LLM tracks to process, skipping LLM phase`);
    return;
  }
  
  // Determine mode and LLM target
  const mode = determineMode(intent, intent.prompt || '');
  const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
  const hasContexts = intent.contexts && intent.contexts.key && intent.contexts.key !== 'normal';
  
  let llmTarget;
  if (mode === 'NORMAL' && !isUndergroundStrict && !hasContexts) {
    // MODE NORMAL: Get 75% LLM (but get 50 by default to be safe)
    llmTarget = Math.max(50, Math.ceil(target_tracks * 0.75));
    console.log(`[STREAM:${traceId}] NORMAL mode: LLM target = ${llmTarget} (75% of ${target_tracks})`);
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
             
             for (let i = 0; i < llmTracks.length && totalYielded < llmTarget && iteration < maxLLMIterations; i += chunkSize) {
               iteration++;
    const chunk = llmTracks.slice(i, i + chunkSize);
    chunkCounter++;
    console.log(`[STREAM:${traceId}] Processing LLM chunk ${chunkCounter}: ${chunk.length} tracks`);
    
    try {
      const resolved = await resolveTracksBySearch(accessToken, chunk);
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
                   const resolved = await resolveTracksBySearch(accessToken, chunk);
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
async function* yieldSpotifyChunks(accessToken, intent, remaining, traceId, usedTracks = globalUsedTracks) {
  console.log(`[STREAM:${traceId}] Starting Spotify phase, remaining: ${remaining}`);
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
      const allowedArtists = intent.filtered_artists && intent.filtered_artists.length > 0 
        ? intent.filtered_artists 
        : intent.contexts.compass;
      
      const prompt = (intent?.prompt || '').toString();
      const isInclusive = /\b(con|que contenga|que tenga alguna|con alguna|con canciones|con temas|con música|con tracks)\b/i.test(prompt);
      const isRestrictive = !isInclusive && /\b(solo|tan solo|solamente|nada más que|solo de|con solo|únicamente|exclusivamente)\b/i.test(prompt);
      
      const priorityArtists = isInclusive ? (intent.priority_artists || []) : [];
      const maxPerArtist = isRestrictive ? Math.ceil(remaining / allowedArtists.length) : 3;
      
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
      
      const undergroundTracks = dedupeById(await searchUndergroundTracks(accessToken, allowedArtists, remaining, maxPerArtist, rng, priorityArtists));
      
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
          console.warn(`[STREAM:${traceId}] VIRAL: No canonized data found, using fallback`);
          spotifyTracks = dedupeById(await searchGenericTracks(accessToken, remaining));
          console.log(`[STREAM:${traceId}] VIRAL fallback: ${spotifyTracks.length} tracks`);
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
          
          // Search for viral/festival playlists first
          const viralPlaylists = await searchFestivalLikePlaylists({
            accessToken,
            baseQuery: canonized.baseQuery,
            year: canonized.year
          });
          
          console.log(`[STREAM:${traceId}] VIRAL: Found ${viralPlaylists.length} playlists`);
          
            if (viralPlaylists.length > 0) {
              // Use consensus from viral playlists with randomness
              spotifyTracks = dedupeById(await collectFromPlaylistsByConsensus({
                accessToken,
                playlists: viralPlaylists,
                target: remaining,
                artistCap: 3,
                rng: rng // Pass the seeded RNG for randomness
              }));
          } else {
            console.log(`[STREAM:${traceId}] VIRAL: No playlists found, using generic search`);
            spotifyTracks = dedupeById(await searchGenericTracks(accessToken, remaining));
          }
          
          console.log(`[STREAM:${traceId}] VIRAL consensus: ${spotifyTracks.length} tracks`);
        }
        
        console.log(`[STREAM:${traceId}] VIRAL: Generated ${spotifyTracks.length}/${remaining} tracks`);
        console.log(`[STREAM:${traceId}] VIRAL tracks sample:`, spotifyTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
      } catch (err) {
        console.error(`[STREAM:${traceId}] VIRAL Error:`, err);
        spotifyTracks = [];
      }
      
    } else if (mode === 'FESTIVAL') {
      // FESTIVAL mode: Use playlist consensus
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
          const seedStr = `${canonized.baseQuery}|${canonized.year}|${Math.floor(Date.now() / 300000)}`; // 5 min window
          const rng = rngSeeded(h32(seedStr));
          console.log(`[STREAM:${traceId}] FESTIVAL: RNG seeded with "${seedStr}"`);
          
          // Search for festival playlists first
          const festivalPlaylists = await searchFestivalLikePlaylists({
            accessToken,
            baseQuery: canonized.baseQuery,
            year: canonized.year
          });
          
          console.log(`[STREAM:${traceId}] FESTIVAL: Found ${festivalPlaylists.length} playlists`);
          
          if (festivalPlaylists.length > 0) {
            // Use consensus from festival playlists with randomness
            spotifyTracks = await collectFromPlaylistsByConsensus({
              accessToken,
              playlists: festivalPlaylists,
              target: remaining,
              artistCap: 3,
              rng: rng // Pass the seeded RNG for randomness
            });
          } else {
            console.log(`[STREAM:${traceId}] FESTIVAL: No playlists found, using radio fallback`);
            spotifyTracks = dedupeById(await radioFromRelatedTop(accessToken, intent.artists_llm || [], remaining));
          }
          
          console.log(`[STREAM:${traceId}] FESTIVAL consensus: ${spotifyTracks.length} tracks`);
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
      console.log(`[STREAM:${traceId}] SINGLE_ARTIST MODE: Searching only tracks from specific artist`);
      console.log(`[STREAM:${traceId}] SINGLE_ARTIST details:`, {
        prompt: intent.prompt,
        remaining: remaining
      });
      
      try {
        const artistName = intent.prompt?.trim();
        if (!artistName) {
          console.warn(`[STREAM:${traceId}] SINGLE_ARTIST: No artist name found in prompt`);
          spotifyTracks = dedupeById(await searchGenericTracks(accessToken, remaining));
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
      // ARTIST_STYLE mode: Search playlists with "radio + artist name"
      console.log(`[STREAM:${traceId}] ARTIST_STYLE MODE: Searching playlists with radio + artist name`);
      console.log(`[STREAM:${traceId}] ARTIST_STYLE details:`, {
        priorityArtists: intent.priority_artists?.length || 0,
        remaining: remaining
      });
      
      try {
        const priorityArtists = intent.priority_artists || [];
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Priority artists:`, priorityArtists);
        
        if (priorityArtists.length > 0) {
          const artistName = priorityArtists[0]; // Use first priority artist
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Searching playlists for "${artistName}"`);
          
          // Search for playlists with "radio + artist name"
          const playlistQueries = [
            `radio ${artistName}`,
            `${artistName} radio`,
            `${artistName} mix`,
            `${artistName} playlist`,
            `${artistName} similar`,
            `${artistName} related`
          ];
          
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Playlist queries:`, playlistQueries);
          
          // Use the same logic as VIRAL/FESTIVAL modes to search playlists
          const playlists = await searchFestivalLikePlaylists(accessToken, playlistQueries);
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: Found ${playlists.length} playlists`);
          
          if (playlists.length > 0) {
            // Collect tracks from playlists by consensus (same as VIRAL/FESTIVAL)
            spotifyTracks = dedupeById(await collectFromPlaylistsByConsensus(accessToken, playlists, remaining, rng));
            console.log(`[STREAM:${traceId}] ARTIST_STYLE: Collected ${spotifyTracks.length} tracks from playlists`);
          } else {
            console.log(`[STREAM:${traceId}] ARTIST_STYLE: No playlists found, using artist search fallback`);
            // Fallback: search for tracks by the artist
            spotifyTracks = dedupeById(await searchTracksByArtists(accessToken, [artistName], remaining));
          }
        } else {
          console.log(`[STREAM:${traceId}] ARTIST_STYLE: No priority artists, using generic search`);
          spotifyTracks = dedupeById(await searchGenericTracks(accessToken, remaining));
        }
        
        console.log(`[STREAM:${traceId}] ARTIST_STYLE: Generated ${spotifyTracks.length}/${remaining} tracks`);
        console.log(`[STREAM:${traceId}] ARTIST_STYLE tracks sample:`, spotifyTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
      } catch (err) {
        console.error(`[STREAM:${traceId}] ARTIST_STYLE Error:`, err);
        spotifyTracks = [];
      }
      
    } else {
      // NORMAL mode: Use LLM tracks to create Spotify radios
      console.log(`[STREAM:${traceId}] ===== NORMAL MODE FILLING PROCESS =====`);
      console.log(`[STREAM:${traceId}] NORMAL MODE: Using LLM tracks for Spotify radios`);
      console.log(`[STREAM:${traceId}] NORMAL mode details:`, {
        llmTracks: intent.tracks_llm?.length || 0,
        artists: intent.artists_llm?.length || 0,
        remaining: remaining,
        priority_artists: intent.priority_artists?.length || 0,
        contexts: intent.contexts?.key || 'none'
      });
      
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
              const resolvedLLMTracks = await resolveTracksBySearch(accessToken, llmTracks);
              if (resolvedLLMTracks.length > 0) {
                const trackIds = resolvedLLMTracks.map(t => t.id).filter(Boolean);
                spotifyTracks = dedupeById(await radioFromRelatedTop(accessToken, trackIds, remaining));
              }
            }
          } else {
            // No priority artist, use LLM tracks directly
            const resolvedLLMTracks = await resolveTracksBySearch(accessToken, llmTracks);
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
            console.log(`[STREAM:${traceId}] NORMAL: No tracks found from artists, using generic search`);
            spotifyTracks = dedupeById(await searchGenericTracks(accessToken, remaining));
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
    if (filteredOut > 0) {
      console.log(`[STREAM:${traceId}] COMPENSATION: ${filteredOut} tracks were filtered out, need to compensate`);
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
        
        if (priorityArtists.length > 0) {
          // PRIORITY: Use priority artists first for "sus oyentes también escuchan"
          searchArtists = [...priorityArtists.slice(0, 5), ...searchArtists];
          console.log(`[STREAM:${traceId}] BROADER SEARCH: ✅ Using priority artists:`, priorityArtists.slice(0, 5));
          console.log(`[STREAM:${traceId}] BROADER SEARCH: Strategy = Priority artists for "sus oyentes también escuchan"`);
        } else if (llmTracks.length > 0) {
          // Use LLM track artists
          const trackArtists = llmTracks.map(t => t.artist).filter(Boolean);
          searchArtists = [...trackArtists.slice(0, 8), ...searchArtists];
          console.log(`[STREAM:${traceId}] BROADER SEARCH: ✅ Using LLM track artists:`, trackArtists.slice(0, 5));
          console.log(`[STREAM:${traceId}] BROADER SEARCH: Strategy = Extract artists from LLM tracks`);
        } else if (llmArtists.length > 0) {
          // Use LLM artists
          searchArtists = [...llmArtists.slice(0, 8), ...searchArtists];
          console.log(`[STREAM:${traceId}] BROADER SEARCH: ✅ Using LLM artists:`, llmArtists.slice(0, 5));
          console.log(`[STREAM:${traceId}] BROADER SEARCH: Strategy = Use LLM-generated artists`);
        } else if (intent.contexts && MUSICAL_CONTEXTS[intent.contexts]) {
          // Use context artists
          const contextArtists = MUSICAL_CONTEXTS[intent.contexts].artists || [];
          searchArtists = [...contextArtists.slice(0, 8), ...searchArtists];
          console.log(`[STREAM:${traceId}] BROADER SEARCH: ✅ Using context artists:`, contextArtists.slice(0, 5));
          console.log(`[STREAM:${traceId}] BROADER SEARCH: Strategy = Use context-specific artists`);
        } else {
          console.log(`[STREAM:${traceId}] BROADER SEARCH: ❌ No artists available, skipping broader search`);
          console.log(`[STREAM:${traceId}] BROADER SEARCH: Strategy = No fallback available`);
        }
        
        const broaderTracks = dedupeById(await radioFromRelatedTop(accessToken, searchArtists, totalNeeded));
        const broaderFiltered = broaderTracks.filter(track => notExcluded(track, intent.exclusions));
        const broaderDeduped = dedupeAgainstUsed(broaderFiltered, usedTracks);
        
        console.log(`[STREAM:${traceId}] BROADER SEARCH: Found ${broaderTracks.length} tracks, ${broaderDeduped.length} after deduplication`);
        
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
export async function GET(request) {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Reset global usedTracks for new session
  globalUsedTracks.clear();
  
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
        // Use global usedTracks to prevent repetition across all contexts
        let usedTracks = globalUsedTracks;
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
            
            for await (const chunk of yieldLLMChunks(accessToken, intent, target_tracks, traceId, usedTracks)) {
              // Add new tracks to usedTracks set to prevent repetition
              chunk.forEach(track => {
                if (track.id) usedTracks.add(track.id);
              });
              allTracks = [...allTracks, ...chunk];
              
              try {
                controller.enqueue(encoder.encode(`event: LLM_CHUNK\ndata: ${JSON.stringify({
                  tracks: chunk,
                  totalSoFar: allTracks.length,
                  target: target_tracks,
                  progress: Math.round((allTracks.length / target_tracks) * 100)
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
            
            // For NORMAL mode: trim LLM tracks to 75% and prepare for Spotify
            const mode = determineMode(intent, intent.prompt || '');
            const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
            const hasContexts = intent.contexts && intent.contexts.key && intent.contexts.key !== 'normal';
            
            if (mode === 'NORMAL' && !isUndergroundStrict && !hasContexts) {
              const llmTarget = Math.max(50, Math.ceil(target_tracks * 0.75));
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
                  message: `Trimmed to ${llmTarget} LLM tracks (75%)`
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
              for await (const chunk of yieldSpotifyChunks(accessToken, intent, remaining, traceId, usedTracks)) {
                // Add new tracks to usedTracks set to prevent repetition
                chunk.forEach(track => {
                  if (track.id) usedTracks.add(track.id);
                });
                allTracks = [...allTracks, ...chunk];
                spotifyYielded += chunk.length;
                
                controller.enqueue(encoder.encode(`event: SPOTIFY_CHUNK\ndata: ${JSON.stringify({
                  tracks: chunk,
                  totalSoFar: allTracks.length,
                  target: target_tracks,
                  progress: Math.round((allTracks.length / target_tracks) * 100),
                  attempt: spotifyAttempts
                })}\n\n`));
                
                console.log(`[STREAM:${traceId}] Spotify chunk sent: ${chunk.length} tracks, total: ${allTracks.length}/${target_tracks}`);
                
                // Update remaining
                remaining = target_tracks - allTracks.length;
                if (remaining <= 0) break;
              }
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_DONE\ndata: {"totalSoFar": ${allTracks.length}, "attempt": ${spotifyAttempts}, "target": ${target_tracks}}\n\n`));
              
              // If we didn't get any new tracks, try with broader search terms
              if (spotifyYielded === 0 && remaining > 0) {
                console.log(`[STREAM:${traceId}] No new tracks from Spotify, trying broader search...`);
                // Add context artists to intent for next attempt
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
            }
            
            // Final check - if we still don't have enough, try one more time with very broad terms
            if (allTracks.length < target_tracks) {
              console.log(`[STREAM:${traceId}] Final attempt: need ${target_tracks - allTracks.length} more tracks`);
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_START\ndata: {"message": "Final attempt with broad search...", "remaining": ${target_tracks - allTracks.length}, "target": ${target_tracks}}\n\n`));
              
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
                    final: true
                  })}\n\n`));
                  
                  console.log(`[STREAM:${traceId}] Final attempt yielded: ${toAdd.length} tracks, total: ${allTracks.length}/${target_tracks}`);
                }
              } catch (error) {
                console.error(`[STREAM:${traceId}] Final attempt failed:`, error);
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
            
                   // Send final result
                   clearTimeout(timeout);
                   clearInterval(heartbeatInterval);
                   
                   console.log(`[STREAM:${traceId}] ===== SENDING FINAL RESULT =====`);
                   console.log(`[STREAM:${traceId}] Final tracks count: ${allTracks.length}`);
                   console.log(`[STREAM:${traceId}] Final tracks sample:`, allTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
                   
                   try {
                     controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
                       tracks: allTracks,
                       totalSoFar: allTracks.length,
                       partial: false,
                       duration: Date.now() - startTime
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
  
  // Reset global usedTracks for new session
  globalUsedTracks.clear();
  
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
        // Use global usedTracks to prevent repetition across all contexts
        let usedTracks = globalUsedTracks;
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
            
            for await (const chunk of yieldLLMChunks(accessToken, intent, target_tracks, traceId, usedTracks)) {
              // Add new tracks to usedTracks set to prevent repetition
              chunk.forEach(track => {
                if (track.id) usedTracks.add(track.id);
              });
              allTracks = [...allTracks, ...chunk];
              
              try {
                controller.enqueue(encoder.encode(`event: LLM_CHUNK\ndata: ${JSON.stringify({
                  tracks: chunk,
                  totalSoFar: allTracks.length,
                  target: target_tracks,
                  progress: Math.round((allTracks.length / target_tracks) * 100)
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
            
            // For NORMAL mode: trim LLM tracks to 75% and prepare for Spotify
            const mode = determineMode(intent, intent.prompt || '');
            const isUndergroundStrict = /underground/i.test(intent.prompt || '') || (intent.filtered_artists && intent.filtered_artists.length > 0);
            const hasContexts = intent.contexts && intent.contexts.key && intent.contexts.key !== 'normal';
            
            if (mode === 'NORMAL' && !isUndergroundStrict && !hasContexts) {
              const llmTarget = Math.max(50, Math.ceil(target_tracks * 0.75));
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
                  message: `Trimmed to ${llmTarget} LLM tracks (75%)`
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
              for await (const chunk of yieldSpotifyChunks(accessToken, intent, remaining, traceId, usedTracks)) {
                // Add new tracks to usedTracks set to prevent repetition
                chunk.forEach(track => {
                  if (track.id) usedTracks.add(track.id);
                });
                allTracks = [...allTracks, ...chunk];
                spotifyYielded += chunk.length;
                
                controller.enqueue(encoder.encode(`event: SPOTIFY_CHUNK\ndata: ${JSON.stringify({
                  tracks: chunk,
                  totalSoFar: allTracks.length,
                  target: target_tracks,
                  progress: Math.round((allTracks.length / target_tracks) * 100),
                  attempt: spotifyAttempts
                })}\n\n`));
                
                console.log(`[STREAM:${traceId}] Spotify chunk sent: ${chunk.length} tracks, total: ${allTracks.length}/${target_tracks}`);
                
                // Update remaining
                remaining = target_tracks - allTracks.length;
                if (remaining <= 0) break;
              }
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_DONE\ndata: {"totalSoFar": ${allTracks.length}, "attempt": ${spotifyAttempts}, "target": ${target_tracks}}\n\n`));
              
              // If we didn't get any new tracks, try with broader search terms
              if (spotifyYielded === 0 && remaining > 0) {
                console.log(`[STREAM:${traceId}] No new tracks from Spotify, trying broader search...`);
                // Add context artists to intent for next attempt
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
            }
            
            // Final check - if we still don't have enough, try one more time with very broad terms
            if (allTracks.length < target_tracks) {
              console.log(`[STREAM:${traceId}] Final attempt: need ${target_tracks - allTracks.length} more tracks`);
              
              controller.enqueue(encoder.encode(`event: SPOTIFY_START\ndata: {"message": "Final attempt with broad search...", "remaining": ${target_tracks - allTracks.length}, "target": ${target_tracks}}\n\n`));
              
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
                    final: true
                  })}\n\n`));
                  
                  console.log(`[STREAM:${traceId}] Final attempt yielded: ${toAdd.length} tracks, total: ${allTracks.length}/${target_tracks}`);
                }
              } catch (error) {
                console.error(`[STREAM:${traceId}] Final attempt failed:`, error);
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
            
                   // Send final result
                   clearTimeout(timeout);
                   clearInterval(heartbeatInterval);
                   
                   console.log(`[STREAM:${traceId}] ===== SENDING FINAL RESULT =====`);
                   console.log(`[STREAM:${traceId}] Final tracks count: ${allTracks.length}`);
                   console.log(`[STREAM:${traceId}] Final tracks sample:`, allTracks.slice(0, 3).map(t => ({ name: t.name, artists: t.artistNames })));
                   
                   try {
                     controller.enqueue(encoder.encode(`event: DONE\ndata: ${JSON.stringify({
                       tracks: allTracks,
                       totalSoFar: allTracks.length,
                       partial: false,
                       duration: Date.now() - startTime
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
