/**
 * Search for tracks by artist names
 */
async function searchTracksByArtists(accessToken, artistNames, limit = 50) {
  const tracks = [];
  const headers = { Authorization: `Bearer ${accessToken}` };
  
  try {
    for (const artist of artistNames.slice(0, 10)) {
      if (tracks.length >= limit) break;
      
      const searchUrl = `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(artist)}&type=track&limit=10&market=ES`;
      const response = await fetch(searchUrl, { headers });
      
      if (response.ok) {
        const data = await response.json();
        const artistTracks = data.tracks?.items || [];
        
        for (const track of artistTracks) {
          if (tracks.length >= limit) break;
          if (track.id && track.name && track.artists) {
            tracks.push({
              id: track.id,
              name: track.name,
              artistNames: track.artists.map(a => a.name),
              artist: track.artists[0]?.name || '',
              duration_ms: track.duration_ms,
              preview_url: track.preview_url,
              external_urls: track.external_urls
            });
          }
        }
      }
    }
    
    console.log(`[SEARCH] Found ${tracks.length} tracks from ${artistNames.length} artists`);
    return tracks;
  } catch (error) {
    console.error(`[SEARCH] Error searching tracks by artists:`, error);
    return [];
  }
}

/**
 * Search for generic tracks when no specific data is available
 */
async function searchGenericTracks(accessToken, limit = 50) {
  const tracks = [];
  const headers = { Authorization: `Bearer ${accessToken}` };
  
  try {
    // Search for popular tracks
    const searchTerms = ['top hits', 'popular music', 'chart hits', 'trending'];
    
    for (const term of searchTerms) {
      if (tracks.length >= limit) break;
      
      const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(term)}&type=track&limit=20&market=ES`;
      const response = await fetch(searchUrl, { headers });
      
      if (response.ok) {
        const data = await response.json();
        const foundTracks = data.tracks?.items || [];
        
        for (const track of foundTracks) {
          if (tracks.length >= limit) break;
          if (track.id && track.name && track.artists) {
            tracks.push({
              id: track.id,
              name: track.name,
              artistNames: track.artists.map(a => a.name),
              artist: track.artists[0]?.name || '',
              duration_ms: track.duration_ms,
              preview_url: track.preview_url,
              external_urls: track.external_urls
            });
          }
        }
      }
    }
    
    console.log(`[SEARCH] Found ${tracks.length} generic tracks`);
    return tracks;
  } catch (error) {
    console.error(`[SEARCH] Error searching generic tracks:`, error);
    return [];
  }
}

export { searchTracksByArtists, searchGenericTracks };
