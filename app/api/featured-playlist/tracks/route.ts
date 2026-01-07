import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';

/**
 * GET /api/featured-playlist/tracks?playlist_id=xxx
 * Obtiene las tracks de una playlist destacada desde Spotify
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlist_id');

    if (!playlistId) {
      return NextResponse.json(
        { success: false, error: 'playlist_id es requerido' },
        { status: 400 }
      );
    }

    // PRIORIDAD 1: Intentar obtener tracks desde Supabase (tracks_data)
    try {
      const supabase = getSupabaseAdmin();
      const { data: playlistData, error: dbError } = await supabase
        .from('playlists')
        .select('tracks_data, track_count')
        .eq('spotify_id', playlistId)
        .maybeSingle();

      if (!dbError && playlistData && playlistData.tracks_data && Array.isArray(playlistData.tracks_data) && playlistData.tracks_data.length > 0) {
        console.log(`[FEATURED_TRACKS] Using tracks_data from DB: ${playlistData.tracks_data.length} tracks`);
        
        // Formatear tracks desde DB para el componente
        const formattedTracks = playlistData.tracks_data.slice(0, 15).map((track: any) => ({
          name: track.name || 'Sin nombre',
          artist: track.artist || (Array.isArray(track.artists) ? track.artists.map((a: any) => a.name || a).join(', ') : 'Artista desconocido'),
          artists: Array.isArray(track.artists) 
            ? track.artists.map((a: any) => ({ name: typeof a === 'string' ? a : (a.name || 'Artista desconocido') }))
            : track.artist 
              ? [{ name: track.artist }]
              : [{ name: 'Artista desconocido' }],
          spotify_url: track.spotify_url || track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
          image: track.image || track.album?.images?.[0]?.url || null,
        }));

        const totalTracks = playlistData.track_count || playlistData.tracks_data.length;

        return NextResponse.json({
          success: true,
          tracks: formattedTracks,
          total: totalTracks,
          showing: formattedTracks.length,
          source: 'database'
        });
      } else {
        console.log('[FEATURED_TRACKS] No tracks_data in DB, falling back to Spotify API');
      }
    } catch (dbError) {
      console.warn('[FEATURED_TRACKS] Error checking DB for tracks_data:', dbError);
      // Continuar con fallback a Spotify API
    }

    // PRIORIDAD 2: Obtener tracks directamente desde Spotify API (fallback)
    try {
      // Intentar usar token del usuario primero, luego hub token como fallback
      let accessToken: string | null = null;
      
      // Prioridad 1: Token del usuario logueado (si está disponible)
      try {
        const { getPleiaServerUser } = await import('@/lib/auth/serverUser');
        const currentUser = await getPleiaServerUser();
        
        if (currentUser?.email) {
          const { getServerSession } = await import('next-auth');
          const { authOptions } = await import('@/lib/auth/config');
          const session = await getServerSession(authOptions);
          
          if (session?.accessToken) {
            accessToken = session.accessToken;
            console.log('[FEATURED_TRACKS] Using user access token');
          }
        }
      } catch (sessionError) {
        console.warn('[FEATURED_TRACKS] Could not get user session:', sessionError);
      }
      
      // Prioridad 2: Hub token (solo si no hay token de usuario)
      if (!accessToken) {
        try {
          accessToken = await getHubAccessToken();
          console.log('[FEATURED_TRACKS] Using hub access token');
        } catch (tokenError: any) {
          console.error('[FEATURED_TRACKS] Failed to get hub access token:', tokenError);
          // Si falla el hub token, devolver error claro pero no 500
          return NextResponse.json(
            { 
              success: false, 
              error: 'No se pudo obtener token de Spotify. Por favor, inicia sesión con Spotify para ver las canciones.',
              tracks: [],
              total: 0
            },
            { status: 401 }
          );
        }
      }
      
      if (!accessToken) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'No se pudo obtener token de Spotify',
            tracks: [],
            total: 0
          },
          { status: 401 }
        );
      }
      
      // Llamar directamente a la API de Spotify
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`[FEATURED_TRACKS] Spotify API error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch tracks from Spotify: ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || [];
      const totalTracksFromAPI = data.total || items.length; // Total real de canciones en la playlist
      
      // Formatear tracks para el componente
      const allTracks = items.map((item: any) => {
        const track = item.track;
        if (!track) return null;
        
        return {
          name: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', ') || 'Artista desconocido',
          artists: track.artists?.map((a: any) => ({ name: a.name })) || [],
          spotify_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
          image: track.album?.images?.[0]?.url || null,
        };
      }).filter((t: any) => t !== null);

      // Limitar a 15 tracks para el preview
      const formattedTracks = allTracks.slice(0, 15);
      const totalTracks = totalTracksFromAPI; // Usar el total real de la API, no solo los que cargamos

      return NextResponse.json({
        success: true,
        tracks: formattedTracks,
        total: totalTracks,
        showing: formattedTracks.length,
      });

    } catch (spotifyError: any) {
      console.error('[FEATURED_TRACKS] Error fetching from Spotify:', spotifyError?.message || spotifyError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al obtener tracks de Spotify',
          tracks: [],
          total: 0
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[FEATURED_TRACKS] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', tracks: [], total: 0 },
      { status: 500 }
    );
  }
}

