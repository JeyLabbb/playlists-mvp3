import { NextResponse } from 'next/server';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';

/**
 * POST /api/tracks/images
 * Obtiene las imágenes de álbum para una lista de track IDs desde Spotify
 * Body: { trackIds: string[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trackIds } = body;

    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'trackIds debe ser un array no vacío' },
        { status: 400 }
      );
    }

    // Limitar a 50 tracks por request (límite de Spotify API)
    const idsToFetch = trackIds.slice(0, 50);
    const idsString = idsToFetch.join(',');

    // Obtener token de acceso
    let accessToken: string | null = null;

    try {
      // Intentar usar token del usuario primero
      const { getPleiaServerUser } = await import('@/lib/auth/serverUser');
      const currentUser = await getPleiaServerUser();

      if (currentUser?.email) {
        const { getServerSession } = await import('next-auth');
        const { authOptions } = await import('@/lib/auth/config');
        const session = await getServerSession(authOptions);

        if (session?.accessToken) {
          accessToken = session.accessToken;
          console.log('[TRACKS_IMAGES] Using user access token');
        }
      }
    } catch (sessionError) {
      console.warn('[TRACKS_IMAGES] Could not get user session:', sessionError);
    }

    // Fallback a hub token
    if (!accessToken) {
      try {
        accessToken = await getHubAccessToken();
        console.log('[TRACKS_IMAGES] Using hub access token');
      } catch (tokenError: any) {
        console.error('[TRACKS_IMAGES] Failed to get hub access token:', tokenError);
        return NextResponse.json(
          {
            success: false,
            error: 'No se pudo obtener token de Spotify',
            tracks: []
          },
          { status: 401 }
        );
      }
    }

    // Llamar a la API de Spotify para obtener información completa de los tracks
    const response = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${idsString}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`[TRACKS_IMAGES] Spotify API error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch tracks from Spotify: ${response.status}`);
    }

    const data = await response.json();
    const tracks = data.tracks || [];

    // Formatear tracks con imágenes
    const tracksWithImages = tracks.map((track: any) => {
      if (!track) return null;

      return {
        id: track.id,
        name: track.name,
        artist: track.artists?.map((a: any) => a.name).join(', ') || 'Artista desconocido',
        artists: track.artists?.map((a: any) => ({ name: a.name })) || [],
        spotify_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        image: track.album?.images?.[0]?.url || null,
        album: track.album ? {
          name: track.album.name,
          id: track.album.id,
          images: track.album.images || []
        } : undefined
      };
    }).filter((t: any) => t !== null);

    return NextResponse.json({
      success: true,
      tracks: tracksWithImages,
      total: tracksWithImages.length
    });

  } catch (error: any) {
    console.error('[TRACKS_IMAGES] Error fetching track images:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener imágenes de tracks',
        tracks: []
      },
      { status: 500 }
    );
  }
}

