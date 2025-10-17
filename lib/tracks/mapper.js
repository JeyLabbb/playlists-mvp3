// web/lib/tracks/mapper.js
// Clean track mappers for LLM and Spotify tracks

/**
 * Maps Spotify track object to unified format
 * @param {Object} track - Spotify track object
 * @returns {Object} Unified track format
 */
export function mapSpotifyTrack(track) {
  const base = track?.track || track || {};
  const id = base.id || null;
  const uri = base.uri || (id ? `spotify:track:${id}` : null);
  const name = String(base.name || '').trim();
  const artistNames = Array.isArray(base.artists) ? base.artists.map(a => a?.name).filter(Boolean) : [];
  const preview_url = base.preview_url || null;
  const open_url = base.external_urls?.spotify || (id ? `https://open.spotify.com/track/${id}` : null);
  return { id, uri, name, artistNames, preview_url, open_url, source: 'spotify' };
}

/**
 * Maps LLM track object to unified format
 * @param {Object} t - LLM track object
 * @returns {Object} Unified track format
 */
export function mapLLMTrack(t) {
  const name = String(t?.name || t?.title || '').trim();
  const raw = t?.artists ?? t?.artist ?? [];
  const artistNames = Array.isArray(raw) ? raw.map(a => typeof a === 'string' ? a : a?.name).filter(Boolean)
                    : (typeof raw === 'string' ? [raw] : []);
  return { name, artistNames, source: 'llm' };
}

// Legacy exports for backward compatibility
export const mapSpotifyTrackToUTrack = mapSpotifyTrack;
export const mapLLMTrackToUTrack = mapLLMTrack;

/**
 * Cleans tracks array by removing invalid entries
 * @param {Array} tracks - Array of track objects
 * @returns {Array} Cleaned tracks array
 */
export function cleanTracks(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks.filter(track => {
    if (!track) return false;
    if (track.source === 'spotify') {
      return track.id && track.uri && track.name;
    }
    if (track.source === 'llm') {
      return track.name && track.artistNames?.length > 0;
    }
    return false;
  });
}