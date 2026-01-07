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

    // Obtener tracks directamente desde Spotify API (sin fetch HTTP interno)
    try {
      // Obtener token de Spotify directamente (más confiable que fetch HTTP interno)
      const accessToken = await getHubAccessToken();
      
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

