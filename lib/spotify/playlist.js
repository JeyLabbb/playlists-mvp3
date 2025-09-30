// web/lib/spotify/playlist.js
// Playlist creation and management

/**
 * Validates if an ID is a valid Spotify track ID (22 chars base62)
 * @param {string} id - ID to validate
 * @returns {boolean} - true if valid
 */
function isValidTrackId(id) {
  return typeof id === 'string' && /^[0-9A-Za-z]{22}$/.test(id);
}

/**
 * Normalizes various URI formats to valid Spotify track URI
 * @param {string} u - URI, URL, or ID
 * @returns {string|null} - Normalized URI or null
 */
export function toTrackUri(u) {
  if (!u || typeof u !== 'string') return null;
  
  // Already a valid URI
  if (u.startsWith('spotify:track:')) {
    const id = u.split(':')[2];
    return isValidTrackId(id) ? u : null;
  }
  
  // URL format
  const urlMatch = u.match(/open\.spotify\.com\/track\/([0-9A-Za-z]{22})/);
  if (urlMatch) {
    return `spotify:track:${urlMatch[1]}`;
  }
  
  // Direct ID
  if (isValidTrackId(u)) {
    return `spotify:track:${u}`;
  }
  
  return null;
}

/**
 * Creates a playlist on Spotify
 * @param {string} accessToken - Spotify access token
 * @param {Object} playlistData - Playlist data
 * @param {string} playlistData.name - Playlist name
 * @param {string} playlistData.description - Playlist description
 * @param {boolean} playlistData.public - Whether playlist is public
 * @returns {Promise<Object>} - Created playlist data
 */
export async function createPlaylist(accessToken, playlistData) {
  const { name, description, public: isPublic = true } = playlistData;
  
  console.log(`[CREATE] Creating playlist: "${name}"`);
  
  const response = await fetch('https://api.spotify.com/v1/me/playlists', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      description,
      public: isPublic
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to create playlist: ${response.status} ${errorData.error?.message || response.statusText}`);
  }
  
  const playlist = await response.json();
  console.log(`[CREATE] Playlist created: ${playlist.id}`);
  
  return playlist;
}

/**
 * Adds tracks to a playlist in chunks
 * @param {string} accessToken - Spotify access token
 * @param {string} playlistId - Playlist ID
 * @param {Array} trackUris - Array of track URIs
 * @returns {Promise<Object>} - Result data
 */
export async function addTracksToPlaylist(accessToken, playlistId, trackUris) {
  if (!Array.isArray(trackUris) || trackUris.length === 0) {
    console.log(`[CREATE] No tracks to add`);
    return { added: 0, total: 0 };
  }
  
  // Normalize and validate URIs
  const validUris = trackUris
    .map(toTrackUri)
    .filter(Boolean);
  
  console.log(`[CREATE] uris_in=${trackUris.length} uris_valid=${validUris.length}`);
  
  if (validUris.length === 0) {
    console.log(`[CREATE] No valid URIs to add`);
    return { added: 0, total: 0 };
  }
  
  // Process in chunks of 100
  const chunkSize = 100;
  let totalAdded = 0;
  const errors = [];
  
  for (let i = 0; i < validUris.length; i += chunkSize) {
    const chunk = validUris.slice(i, i + chunkSize);
    const chunkNumber = Math.floor(i / chunkSize) + 1;
    
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: chunk })
      });
      
      if (response.ok) {
        const data = await response.json();
        totalAdded += chunk.length;
        console.log(`[CREATE] add-tracks ok { added: ${chunk.length}, total: ${totalAdded} }`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const error = {
          chunk: chunkNumber,
          status: response.status,
          message: errorData.error?.message || response.statusText,
          chunkSize: chunk.length
        };
        errors.push(error);
        console.error(`[CREATE] add-tracks failed { error: "${error.message}", batch: ${chunkNumber}, chunkSize: ${chunk.length} }`);
      }
    } catch (error) {
      const errorData = {
        chunk: chunkNumber,
        error: error.message,
        chunkSize: chunk.length
      };
      errors.push(errorData);
      console.error(`[CREATE] add-tracks failed { error: "${error.message}", batch: ${chunkNumber}, chunkSize: ${chunk.length} }`);
    }
  }
  
  return {
    added: totalAdded,
    total: validUris.length,
    errors: errors.length > 0 ? errors : undefined
  };
}
