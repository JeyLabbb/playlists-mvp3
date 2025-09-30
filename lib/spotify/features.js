// web/lib/spotify/features.js
// Audio features from Spotify

/**
 * Validates if an ID is a valid Spotify track ID (22 chars base62)
 * @param {string} id - ID to validate
 * @returns {boolean} - true if valid
 */
function isValidTrackId(id) {
  return typeof id === 'string' && /^[0-9A-Za-z]{22}$/.test(id);
}

/**
 * Gets audio features for tracks from Spotify
 * @param {string} accessToken - Spotify access token
 * @param {Array} trackIds - Array of track IDs
 * @returns {Promise<Object>} - Map of track ID to audio features
 */
export async function getAudioFeatures(accessToken, trackIds) {
  if (!Array.isArray(trackIds) || trackIds.length === 0) {
    return {};
  }
  
  // Filter valid track IDs
  const validIds = trackIds.filter(isValidTrackId);
  if (validIds.length === 0) {
    console.warn(`[AUDIO] No valid track IDs provided`);
    return {};
  }
  
  const featuresMap = {};
  const batchSize = 100;
  
  // Process in batches of 100
  for (let i = 0; i < validIds.length; i += batchSize) {
    const batch = validIds.slice(i, i + batchSize);
    
    try {
      const url = `https://api.spotify.com/v1/audio-features?ids=${batch.join(',')}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const features = data.audio_features || [];
        
        // Map features to track IDs
        for (let j = 0; j < batch.length; j++) {
          const trackId = batch[j];
          const feature = features[j];
          if (feature && feature.id === trackId) {
            featuresMap[trackId] = feature;
          }
        }
        
        console.log(`[AUDIO] Got features for ${features.filter(Boolean).length}/${batch.length} tracks in batch ${Math.floor(i/batchSize) + 1}`);
      } else {
        console.warn(`[AUDIO] features fetch failed { status: ${response.status} }`);
        // Don't throw, just log and continue
      }
    } catch (error) {
      console.warn(`[AUDIO] features fetch failed { error: "${error.message}" }`);
      // Don't throw, just log and continue
    }
  }
  
  console.log(`[AUDIO] features applied: ${Object.keys(featuresMap).length}`);
  return featuresMap;
}

// Legacy export for backward compatibility
export const addAudioFeatures = async (accessToken, tracks) => {
  const trackIds = tracks.map(t => t.id).filter(Boolean);
  const featuresMap = await getAudioFeatures(accessToken, trackIds);
  
  return tracks.map(track => ({
    ...track,
    audio_features: featuresMap[track.id] || null
  }));
};
