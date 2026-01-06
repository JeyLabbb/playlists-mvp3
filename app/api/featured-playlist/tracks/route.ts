import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

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

    // Obtener tracks desde Spotify API
    try {
      // Obtener info de la playlist destacada para tener el owner_email
      const supabase = getSupabaseAdmin();
      const { data: featuredData } = await supabase
        .from('featured_playlists')
        .select('owner_email, spotify_playlist_id')
        .eq('spotify_playlist_id', playlistId)
        .eq('is_active', true)
        .single();

      // Usar el endpoint existente de playlist-tracks
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
      const ownerEmailParam = featuredData?.owner_email ? `&ownerEmail=${encodeURIComponent(featuredData.owner_email)}` : '';
      const tracksResponse = await fetch(`${baseUrl}/api/spotify/playlist-tracks?id=${playlistId}${ownerEmailParam}`);
      
      if (!tracksResponse.ok) {
        throw new Error('Failed to fetch tracks from Spotify');
      }

      const tracksData = await tracksResponse.json();
      
      if (tracksData.error) {
        return NextResponse.json(
          { success: false, error: tracksData.error, tracks: [] },
          { status: 500 }
        );
      }

      // Formatear tracks para el componente
      const allTracks = tracksData.tracks || [];
      const formattedTracks = allTracks.slice(0, 15).map((track: any) => ({
        name: track.name,
        artist: track.artistNames || track.artists?.join(', ') || 'Artista desconocido',
        spotify_url: track.open_url || `https://open.spotify.com/track/${track.id}`,
        image: null, // Se puede obtener después si es necesario
      }));

      const totalTracks = tracksData.total || allTracks.length || 0;

      return NextResponse.json({
        success: true,
        tracks: formattedTracks,
        total: totalTracks,
        showing: formattedTracks.length,
      });

    } catch (spotifyError: any) {
      console.error('[FEATURED_TRACKS] Error fetching from Spotify:', spotifyError);
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

