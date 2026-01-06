import { NextResponse } from 'next/server';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export async function GET(request) {
  try {
    // Get playlist ID and owner email from query params
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('id');
    const ownerEmail = searchParams.get('ownerEmail'); // Email del dueño de la playlist
    
    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    // Get current user (if authenticated)
    const currentUser = await getPleiaServerUser();
    const currentUserId = currentUser?.id;
    const currentUserEmail = currentUser?.email?.toLowerCase();

    // Check if user can see full playlist (owner or friend)
    let canSeeFullPlaylist = false;
    let ownerUserId = null;

    if (currentUserId) {
      if (ownerEmail) {
        // Check if current user is the owner
        if (currentUserEmail === ownerEmail.toLowerCase()) {
          canSeeFullPlaylist = true;
          console.log('[PLAYLIST-TRACKS] User is the owner, showing full playlist');
        } else {
          // Check if current user is friends with the owner
          try {
            const supabase = await createSupabaseRouteClient();
            
            // Get owner's user ID
            const { data: ownerUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', ownerEmail.toLowerCase())
              .maybeSingle();
            
            if (ownerUser?.id) {
              ownerUserId = ownerUser.id;
              
              // Check if they are friends (bidirectional check)
              const { data: friendRow } = await supabase
                .from('friends')
                .select('id')
                .or(`and(user_id.eq.${currentUserId},friend_id.eq.${ownerUserId}),and(user_id.eq.${ownerUserId},friend_id.eq.${currentUserId})`)
                .maybeSingle();
              
              if (friendRow) {
                canSeeFullPlaylist = true;
                console.log('[PLAYLIST-TRACKS] User is friend with owner, showing full playlist');
              }
            }
          } catch (friendCheckError) {
            console.warn('[PLAYLIST-TRACKS] Error checking friendship:', friendCheckError);
          }
        }
      } else {
        // If no ownerEmail provided but user is authenticated, 
        // assume they can see it (might be their own playlist or public)
        // We'll show full playlist but this is a fallback
        console.log('[PLAYLIST-TRACKS] No ownerEmail provided, showing full playlist for authenticated user');
        canSeeFullPlaylist = true;
      }
    }

    // Use hub access token (works for public playlists)
    let accessToken;
    try {
      accessToken = await getHubAccessToken();
    } catch (tokenError) {
      console.error('[PLAYLIST-TRACKS] Failed to get hub access token:', tokenError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to authenticate with Spotify',
        tracks: [] 
      }, { status: 500 });
    }

    // Fetch playlist tracks from Spotify
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Spotify API error:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch playlist tracks' }, { status: response.status });
    }

    const data = await response.json();
    
    // Extract and format track data
    const allTracks = (data.items || []).map(item => {
      const track = item.track;
      if (!track) return null;
      
      return {
        id: track.id,
        name: track.name,
        artists: track.artists?.map(artist => ({ name: artist.name })) || [],
        artistNames: track.artists?.map(artist => artist.name).join(', ') || 'Artista desconocido',
        open_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        spotify_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        external_urls: track.external_urls,
        album: track.album || {},
        image: track.album?.images?.[0]?.url || null,
        preview_url: track.preview_url || null,
        duration_ms: track.duration_ms,
        popularity: track.popularity
      };
    }).filter(Boolean);

    const totalTracks = allTracks.length;

    // If user can't see full playlist, return only preview (5 tracks)
    if (!canSeeFullPlaylist && totalTracks > 5) {
      // Shuffle and return only 5 tracks
      const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
      const previewTracks = shuffled.slice(0, 5);
      
      console.log(`[PLAYLIST-TRACKS] User is not owner/friend, showing preview only: 5 of ${totalTracks} tracks`);
      
      return NextResponse.json({
        success: true,
        tracks: previewTracks,
        total: totalTracks,
        preview: true,
        remainingCount: totalTracks - 5
      });
    }

    // User can see full playlist (owner or friend)
    console.log(`[PLAYLIST-TRACKS] Showing full playlist: ${totalTracks} tracks`);
    
    return NextResponse.json({
      success: true,
      tracks: allTracks,
      total: totalTracks,
      preview: false
    });

  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
