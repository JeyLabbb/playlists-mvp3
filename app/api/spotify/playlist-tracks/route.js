import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request) {
  try {
    // Get access token
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    // For public playlists, we can use a fallback token or skip auth
    if (!token?.accessToken) {
      // Try to use a public token or return limited data
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required for playlist access',
        tracks: [] 
      }, { status: 401 });
    }

    // Get playlist ID from query params
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('id');
    
    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    // Fetch playlist tracks from Spotify
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Spotify API error:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch playlist tracks' }, { status: response.status });
    }

    const data = await response.json();
    
    // Extract and format track data - preview_url comes from the track object
    const tracks = (data.items || []).map(item => {
      const track = item.track;
      if (!track) return null;
      
      return {
        id: track.id,
        name: track.name,
        artists: track.artists?.map(artist => artist.name) || [],
        artistNames: track.artists?.map(artist => artist.name).join(', ') || 'Artista desconocido',
        open_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        preview_url: track.preview_url || null,
        duration_ms: track.duration_ms,
        popularity: track.popularity
      };
    }).filter(Boolean);

    // Log preview availability
    const withPreview = tracks.filter(t => t.preview_url).length;
    console.log(`[PLAYLIST-TRACKS] Loaded ${tracks.length} tracks, ${withPreview} with preview_url`);
    if (tracks.length > 0) {
      console.log('[PLAYLIST-TRACKS] Sample track:', { 
        name: tracks[0].name, 
        preview_url: tracks[0].preview_url ? tracks[0].preview_url.substring(0, 50) + '...' : null,
        has_preview: !!tracks[0].preview_url 
      });
    }

    return NextResponse.json({
      success: true,
      tracks: tracks,
      total: tracks.length
    });

  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
