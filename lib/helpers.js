/**
 * Helper functions for playlist generation
 */

/**
 * Remove duplicate tracks by track ID
 */
export function dedupeByTrackId(tracks) {
  const seen = new Set();
  return tracks.filter(track => {
    if (!track?.id || seen.has(track.id)) {
      return false;
    }
    seen.add(track.id);
    return true;
  });
}

/**
 * Normalize titles (remove common suffixes like remaster/live/edit) and accents
 */
export function normalizeTitle(title) {
  const t = String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  // remove common suffixes
  return t
    .replace(/\s*\(.*?remaster.*?\)/g, "")
    .replace(/\s*\(.*?live.*?\)/g, "")
    .replace(/\s*\(.*?edit.*?\)/g, "")
    .replace(/\s*-\s*(remaster(ed)?|live|radio\s*edit|edit|version)\b.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize artist for comparison (primary artist only)
 */
export function normalizeArtist(artist) {
  return String(artist || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Dedupe by normalized title + primary artist
 */
export function dedupeByTitleArtist(tracks) {
  const seen = new Set();
  const out = [];
  for (const tr of tracks) {
    const key = `${normalizeTitle(tr.name)}::${normalizeArtist(tr.artists?.[0])}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tr);
  }
  return out;
}

/**
 * Apply artist caps (hard and soft limits) - Dynamic based on target size
 * ✅ FIX: en lugar de mirar el conteo final y tirar TODO lo que excede,
 * tomamos pistas en orden y vamos contabilizando por artista para no vaciar listas.
 */
export function applyArtistCaps(tracks, targetSize, options = {}) {
  if (!Array.isArray(tracks) || !tracks.length) return tracks;

  const { 
    hardCap = null, 
    softPct = 12,
    minArtists = 5 
  } = options;

  const out = [];
  const perArtist = new Map();

  // Dynamic hard cap based on target size
  const dynamicHardCap = hardCap || Math.max(2, Math.ceil(targetSize / 15));
  
  // Soft cap = max(hard, ceil(target * 0.12))
  const computedSoft = Math.max(dynamicHardCap, Math.ceil((targetSize * softPct) / 100));

  // Límite efectivo por artista = cumplir ambos (no pasamos el hard)
  const maxPerArtist = Math.max(1, Math.min(dynamicHardCap, computedSoft));

  console.log(`[ARTIST_CAPS] Target: ${targetSize}, Hard: ${dynamicHardCap}, Soft: ${computedSoft}, Max per artist: ${maxPerArtist}`);

  for (const tr of tracks) {
    const a = (tr?.artists?.[0] || "Unknown").toLowerCase();
    const used = perArtist.get(a) || 0;
    if (used < maxPerArtist) {
      out.push(tr);
      perArtist.set(a, used + 1);
    }
  }
  
  console.log(`[ARTIST_CAPS] Applied caps: ${out.length} tracks from ${tracks.length}, ${perArtist.size} unique artists`);
  return out;
}

/**
 * Round-robin distribution by artist to avoid clustering
 */
export function roundRobinByArtist(tracks) {
  if (!tracks.length) return tracks;
  
  // Group tracks by main artist
  const artistGroups = new Map();
  for (const track of tracks) {
    const mainArtist = track.artists?.[0] || "Unknown";
    if (!artistGroups.has(mainArtist)) {
      artistGroups.set(mainArtist, []);
    }
    artistGroups.get(mainArtist).push(track);
  }
  
  // Round-robin distribution
  const result = [];
  const artists = Array.from(artistGroups.keys());
  const maxTracks = Math.max(...Array.from(artistGroups.values()).map(group => group.length));
  
  for (let i = 0; i < maxTracks; i++) {
    for (const artist of artists) {
      const artistTracks = artistGroups.get(artist);
      if (i < artistTracks.length) {
        result.push(artistTracks[i]);
      }
    }
  }
  
  return result;
}

/**
 * Apply negative constraints (exclude artists, only female groups, etc.)
 */
export function applyNegatives(tracks, options = {}) {
  const {
    exclude_artists = [],
    only_female_groups = false,
    allow_live_remix = true,
    language = null
  } = options;
  
  if (!tracks.length) return tracks;
  
  // Normalize exclude artists for case-insensitive matching
  const excludeNormalized = exclude_artists.map(artist => 
    String(artist).toLowerCase().trim()
  );
  
  return tracks.filter(track => {
    // Check excluded artists
    if (excludeNormalized.length > 0) {
      const trackArtists = (track.artists || []).map(artist => 
        String(artist).toLowerCase().trim()
      );
      const hasExcludedArtist = trackArtists.some(artist => 
        excludeNormalized.includes(artist)
      );
      if (hasExcludedArtist) return false;
    }
    
    // Check live/remix filter
    if (!allow_live_remix) {
      const trackName = (track.name || "").toLowerCase();
      if (trackName.includes("live") || 
          trackName.includes("remix") || 
          trackName.includes("edit") ||
          trackName.includes("version")) {
        return false;
      }
    }
    
    // (placeholders) only_female_groups / language requerirían más metadatos
    return true;
  });
}

/**
 * Retry function with exponential backoff for Spotify API calls
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    retries = 3,
    baseMs = 1000,
    maxMs = 10000
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      
      // Check for rate limit (429) in response
      if (result?.status === 429) {
        const retryAfter =
          (result.headers && result.headers.get && result.headers.get('Retry-After')) ||
          undefined;
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(baseMs * Math.pow(2, attempt), maxMs);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Batch operations for Spotify API (add tracks in chunks)
 */
export async function batchSpotifyOperation(operation, items, batchSize = 100) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      const result = await operation(batch);
      results.push(result);
    } catch (error) {
      console.error(`Batch operation failed for items ${i}-${i + batch.length}:`, error);
      // Continue with next batch even if one fails
      results.push({ error: error.message, batch: batch.length });
    }
  }
  
  return results;
}

/**
 * Normalize text for comparison (remove accents, lowercase)
 */
export function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Extract year from text
 */
export function extractYear(text) {
  const match = String(text).match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Check if text contains any of the given tokens
 */
export function containsTokens(text, tokens) {
  const normalizedText = normalizeText(text);
  const normalizedTokens = (tokens || []).map(normalizeText);
  return normalizedTokens.some(token => normalizedText.includes(token));
}

/**
 * Compute artist frequency in playlists
 */
export function computeArtistFrequency(tracks) {
  const frequency = new Map();
  
  for (const track of tracks) {
    const mainArtist = track.artists?.[0];
    if (mainArtist) {
      frequency.set(mainArtist, (frequency.get(mainArtist) || 0) + 1);
    }
  }
  
  return frequency;
}

/**
 * Sort tracks by artist frequency (most frequent first)
 */
export function sortByArtistFrequency(tracks) {
  const frequency = computeArtistFrequency(tracks);
  return tracks.sort((a, b) => {
    const freqA = frequency.get(a.artists?.[0]) || 0;
    const freqB = frequency.get(b.artists?.[0]) || 0;
    return freqB - freqA;
  });
}
