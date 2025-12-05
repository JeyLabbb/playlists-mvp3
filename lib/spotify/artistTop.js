// web/lib/spotify/artistTop.js
// Artist top tracks from Spotify

import { mapSpotifyTrack } from '../tracks/mapper.js';

/**
 * Validates if an ID is a valid Spotify track ID (22 chars base62)
 * @param {string} id - ID to validate
 * @returns {boolean} - true if valid
 */
function isValidTrackId(id) {
  return typeof id === 'string' && /^[0-9A-Za-z]{22}$/.test(id);
}

/**
 * Gets recent top tracks for artists from Spotify
 * @param {string} accessToken - Spotify access token
 * @param {Array} artistIds - Array of artist IDs
 * @param {Object} options - Options
 * @param {number} options.perArtist - Number of tracks per artist
 * @param {string} options.market - Market code
 * @returns {Promise<Array>} - Array of top tracks
 */
export async function getArtistTopRecent(accessToken, artistIds, options = {}) {
  const { perArtist = 3, market = 'from_token' } = options;
  
  console.log(`[ARTIST-TOP] Starting artist top collection for ${artistIds?.length || 0} artists`);
  
  if (!Array.isArray(artistIds) || artistIds.length === 0) {
    console.log(`[ARTIST-TOP] No artist IDs provided`);
    return [];
  }
  
  // Filter valid artist IDs
  const validArtists = artistIds.filter(isValidTrackId);
  console.log(`[ARTIST-TOP] Valid artists: ${validArtists.length}/${artistIds.length}`);
  
  if (validArtists.length === 0) {
    console.log(`[ARTIST-TOP] No valid artist IDs found`);
    return [];
  }
  
  const allTracks = [];
  const seenIds = new Set();
  let recentCount = 0;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Process each artist
  for (const artistId of validArtists.slice(0, 8)) { // Limit to 8 artists max
    try {
      const url = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const tracks = data.tracks || [];
        
        if (tracks.length === 0) {
          console.warn(`[ARTIST-TOP] No tracks found for artist ${artistId}`);
          continue;
        }
        
        // Sort by release date (most recent first) if available
        const sortedTracks = tracks.sort((a, b) => {
          const dateA = new Date(a.album?.release_date || '1900-01-01');
          const dateB = new Date(b.album?.release_date || '1900-01-01');
          return dateB - dateA;
        });
        
        // Take up to perArtist tracks, avoiding duplicates
        const artistTracks = [];
        for (const track of sortedTracks) {
          if (!isValidTrackId(track.id) || seenIds.has(track.id)) continue;
          if (artistTracks.length >= perArtist) break;
          
          seenIds.add(track.id);
          const mappedTrack = mapSpotifyTrack(track);
          artistTracks.push(mappedTrack);
          
          // Count recent tracks (within 6 months)
          const releaseDate = new Date(track.album?.release_date || '1900-01-01');
          if (releaseDate >= sixMonthsAgo) {
            recentCount++;
          }
        }
        
        allTracks.push(...artistTracks);
        console.log(`[ARTIST-TOP] Got ${artistTracks.length} tracks for artist ${artistId} (${artistTracks.filter(t => {
          const releaseDate = new Date(t.album?.release_date || '1900-01-01');
          return releaseDate >= sixMonthsAgo;
        }).length} recent)`);
        
      } else {
        console.warn(`[ARTIST-TOP] Failed to get tracks for artist ${artistId}: ${response.status}`);
      }
    } catch (error) {
      console.warn(`[ARTIST-TOP] Error getting tracks for artist ${artistId}:`, error.message);
    }
  }
  
  console.log(`[ARTIST-TOP] artists_in=${validArtists.length} tracks_out=${allTracks.length} recent>=6 months=${recentCount}`);
  return allTracks;
}
