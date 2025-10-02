/**
 * Search for tracks by artist names - gets ALL tracks, not just first 10
 */
async function searchTracksByArtists(accessToken, artistNames, limit = 50) {
  const tracks = [];
  const headers = { Authorization: `Bearer ${accessToken}` };
  
  try {
    for (const artist of artistNames.slice(0, 10)) {
      if (tracks.length >= limit) break;
      
      console.log(`[SEARCH] Searching ALL tracks for artist: "${artist}"`);
      
      let offset = 0;
      const pageSize = 50; // Maximum allowed by Spotify API
      let hasMore = true;
      
      while (hasMore && tracks.length < limit) {
        const searchUrl = `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(artist)}&type=track&limit=${pageSize}&offset=${offset}&market=ES`;
        const response = await fetch(searchUrl, { headers });
        
        if (response.ok) {
          const data = await response.json();
          const artistTracks = data.tracks?.items || [];
          
          console.log(`[SEARCH] Found ${artistTracks.length} tracks for "${artist}" (offset: ${offset})`);
          
          for (const track of artistTracks) {
            if (tracks.length >= limit) break;
            
            // Check if track already exists (avoid duplicates)
            const isDuplicate = tracks.some(existingTrack => 
              existingTrack.id === track.id || 
              (existingTrack.name === track.name && existingTrack.artist === track.artists[0]?.name)
            );
            
            if (!isDuplicate && track.id && track.name && track.artists) {
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
          
          // Check if there are more pages
          hasMore = artistTracks.length === pageSize && tracks.length < limit;
          offset += pageSize;
          
          // Add small delay to avoid rate limiting
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          console.warn(`[SEARCH] Failed to fetch tracks for "${artist}" at offset ${offset}`);
          hasMore = false;
        }
      }
      
      console.log(`[SEARCH] Total tracks found for "${artist}": ${tracks.length}`);
    }
    
    console.log(`[SEARCH] Found ${tracks.length} total tracks from ${artistNames.length} artists`);
    return tracks.slice(0, limit); // Ensure we don't exceed the limit
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
