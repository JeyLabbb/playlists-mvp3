// web/lib/spotify/resolve.js
// Resolves LLM tracks to Spotify IDs using search

import { mapSpotifyTrack } from '../tracks/mapper.js';

// Cache for resolved tracks to avoid duplicate searches
const resolveCache = new Map();

/**
 * Validates if a URI is a valid Spotify track URI
 * @param {string} u - URI to validate
 * @returns {boolean} - true if valid
 */
export function isValidUri(u) {
  if (!u || typeof u !== 'string') return false;
  return /^spotify:track:[0-9A-Za-z]{22}$/.test(u);
}

/**
 * Validates if an ID is a valid Spotify track ID (22 chars base62)
 * @param {string} id - ID to validate
 * @returns {boolean} - true if valid
 */
function isValidTrackId(id) {
  return typeof id === 'string' && /^[0-9A-Za-z]{22}$/.test(id);
}

/**
 * Normalizes a string for fuzzy matching
 * @param {string} str - String to normalize
 * @returns {string} - Normalized string
 */
function normalizeString(str) {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Calculates fuzzy match score between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Match score (0-1)
 */
function fuzzyMatch(a, b) {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.8;
  
  // Simple Levenshtein distance approximation
  const longer = normA.length > normB.length ? normA : normB;
  const shorter = normA.length > normB.length ? normB : normA;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Simple Levenshtein distance calculation
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Distance
 */
function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Checks if a track is excluded based on banned artists
 * @param {Object} track - Track object
 * @param {Object} exclusions - Exclusion rules
 * @returns {boolean} - true if track is excluded
 */
function isTrackExcluded(track, exclusions) {
  if (!exclusions || !exclusions.banned_artists || exclusions.banned_artists.length === 0) {
    return false;
  }
  
  const bannedArtists = exclusions.banned_artists.map(a => (a || '').toLowerCase());
  const artistNames = track.artistNames || [];
  
  return artistNames.some(artistName => {
    const artistLower = (artistName || '').toLowerCase();
    return bannedArtists.some(banned => artistLower.includes(banned));
  });
}

/**
 * Searches Spotify for a track with retry logic
 * @param {string} accessToken - Spotify access token
 * @param {string} query - Search query
 * @param {string} market - Market code
 * @returns {Promise<Object|null>} - Track object or null
 */
async function searchTrackWithRetry(accessToken, query, market = 'from_token') {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20&market=${market}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.tracks?.items || [];
      }
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
        const delay = retryAfter * 1000 * Math.pow(2, attempt);
        console.warn(`[LLM-RESOLVE] Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (response.status >= 500) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`[LLM-RESOLVE] Server error ${response.status}, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Client error, don't retry
      lastError = new Error(`Search failed: ${response.status}`);
      break;
      
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`[LLM-RESOLVE] Search error, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.warn(`[LLM-RESOLVE] Search failed after ${maxRetries} attempts:`, lastError?.message);
  return null;
}

/**
 * Resolves LLM tracks to Spotify tracks using search
 * @param {string} accessToken - Spotify access token
 * @param {Array} llmTracks - Array of LLM track objects
 * @param {Object} options - Options
 * @param {string} options.market - Market code
 * @param {number} options.concurrency - Max concurrent searches
 * @returns {Promise<Array>} - Array of resolved tracks
 */
export async function resolveTracksBySearch(accessToken, llmTracks, options = {}) {
  const { market = 'from_token', concurrency = 3, exclusions = null } = options;
  
  console.log(`[LLM-RESOLVE] Starting resolution for ${llmTracks?.length || 0} LLM tracks`);
  
  if (!Array.isArray(llmTracks) || llmTracks.length === 0) {
    console.log(`[LLM-RESOLVE] No LLM tracks to resolve`);
    return [];
  }
  
  const resolvedTracks = [];
  const semaphore = new Array(concurrency).fill(null);
  let index = 0;
  
  // Process tracks with concurrency limit
  const processTrack = async (track) => {
    if (!track) return null;
    
    const name = String(track.name || track.title || '').trim();
    const artistNames = Array.isArray(track.artistNames) ? track.artistNames : [];
    const firstArtist = artistNames[0];
    
    if (!name) {
      console.warn(`[LLM-RESOLVE] Skipping track without name`);
      return null;
    }
    
    // Check cache (only if not excluded)
    const cacheKey = `${name}|${firstArtist || ''}`;
    if (resolveCache.has(cacheKey)) {
      const cached = resolveCache.get(cacheKey);
      
      // Verify cached track is not excluded
      if (!isTrackExcluded(cached, exclusions)) {
        console.log(`[LLM-RESOLVE] Cache hit: "${name}" → "${cached.name}" by ${cached.artistNames.join(', ')}`);
        return cached;
      } else {
        console.log(`[LLM-RESOLVE] 🚨 Cache hit EXCLUDED: "${name}" → "${cached.name}" by ${cached.artistNames.join(', ')}`);
      }
    }
    
    // Build search queries
    const queries = [];
    if (firstArtist) {
      queries.push(`track:"${name}" artist:"${firstArtist}"`);
      queries.push(`${name} ${firstArtist}`);
    }
    queries.push(name);
    
    // Try each query until we find a match
    for (const query of queries) {
      const tracks = await searchTrackWithRetry(accessToken, query, market);
      if (!tracks || tracks.length === 0) continue;
      
      // Find best match using fuzzy matching
      let bestMatch = null;
      let bestScore = 0;
      
      for (const spotifyTrack of tracks) {
        if (!isValidTrackId(spotifyTrack.id)) continue;
        
        const trackName = String(spotifyTrack.name || '').trim();
        const trackArtists = spotifyTrack.artists?.map(a => a?.name).filter(Boolean) || [];
        
        if (!trackName || trackArtists.length === 0) continue;
        
        // Calculate match scores
        const nameScore = fuzzyMatch(name, trackName);
        const artistScore = firstArtist ? fuzzyMatch(firstArtist, trackArtists[0]) : 0.5;
        const totalScore = (nameScore * 0.7) + (artistScore * 0.3);
        
        if (totalScore > bestScore && totalScore > 0.7) {
          bestMatch = spotifyTrack;
          bestScore = totalScore;
        }
      }
      
      if (bestMatch) {
        const resolved = mapSpotifyTrack(bestMatch);
        
        // Only cache if not excluded
        if (!isTrackExcluded(resolved, exclusions)) {
          resolveCache.set(cacheKey, resolved);
        } else {
          console.log(`[LLM-RESOLVE] 🚨 EXCLUDED from cache: "${resolved.name}" by ${resolved.artistNames.join(', ')}`);
        }
        
        console.log(`[LLM-RESOLVE] Resolved: "${name}" → "${resolved.name}" by ${resolved.artistNames.join(', ')}`);
        return resolved;
      }
    }
    
    console.warn(`[LLM-RESOLVE] Could not resolve: "${name}"${firstArtist ? ` by ${firstArtist}` : ''}`);
    return null;
  };
  
  // Process all tracks with concurrency control
  const processNext = async () => {
    if (index >= llmTracks.length) return null;
    
    const track = llmTracks[index++];
    const result = await processTrack(track);
    
    if (result) {
      resolvedTracks.push(result);
    }
    
    return processNext();
  };
  
  // Start concurrent processing
  await Promise.all(semaphore.map(() => processNext()));
  
  console.log(`[LLM-RESOLVE] requested=${llmTracks.length} resolved=${resolvedTracks.length}`);
  return resolvedTracks;
}

// Legacy export for backward compatibility
export const resolveIdsForLLMTracks = resolveTracksBySearch;