import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth/mock-session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createSpotifyPlaylist(name: string, description: string, trackUris: string[], coverImage?: string) {
  const accessToken = process.env.PLEIAHUB_SPOTIFY_ACCESS_TOKEN;
  const userId = process.env.PLEIAHUB_SPOTIFY_USER_ID;

  // Crear la playlist
  const createResponse = await fetch(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    }
  );

  if (!createResponse.ok) {
    throw new Error('Error creating playlist');
  }

  const playlist = await createResponse.json();

  // Agregar tracks
  if (trackUris.length > 0) {
    const addTracksResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: trackUris,
        }),
      }
    );

    if (!addTracksResponse.ok) {
      throw new Error('Error adding tracks to playlist');
    }
  }

  // Agregar imagen de portada si se proporciona
  if (coverImage) {
    try {
      // Convertir URL a base64
      const imageResponse = await fetch(coverImage);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/images`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'image/jpeg',
          },
          body: base64Image,
        }
      );
    } catch (error) {
      console.error('Error setting playlist cover:', error);
      // No fallar si la imagen no se puede establecer
    }
  }

  return playlist;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playlist, conversationId } = await request.json();

    if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid playlist data' },
        { status: 400 }
      );
    }

    // Formatear tracks completos para guardar (antes de crear playlist en Spotify)
    const formattedTracks = playlist.tracks.map((track: any) => {
      // Extraer información completa de cada track
      const artists = Array.isArray(track.artists) 
        ? track.artists.map((a: any) => ({ name: a.name || a, id: a.id || null }))
        : track.artist 
          ? [{ name: track.artist, id: null }]
          : [{ name: 'Artista desconocido', id: null }];
      
      return {
        id: track.id,
        name: track.name || 'Sin nombre',
        artist: artists.map((a: any) => a.name).join(', '), // String para compatibilidad
        artists: artists, // Array completo
        album: {
          name: track.album?.name || track.album_name || '',
          images: track.album?.images || track.album?.image ? [track.album.image] : []
        },
        spotify_url: track.external_urls?.spotify || track.spotify_url || track.open_url || `https://open.spotify.com/track/${track.id}`,
        image: track.album?.images?.[0]?.url || track.album?.image || track.image || null
      };
    });

    // Crear la playlist en Spotify
    const trackUris = playlist.tracks.map((track: any) => `spotify:track:${track.id}`);
    const spotifyPlaylist = await createSpotifyPlaylist(
      playlist.name,
      playlist.description || 'Creada con PLEIA 2.0',
      trackUris,
      playlist.coverImage
    );

    // Actualizar conversación con el ID de la playlist creada
    if (conversationId) {
      await supabase
        .from('pleia_conversations')
        .update({
          final_playlist_id: spotifyPlaylist.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Guardar patrón exitoso
      const keywords = playlist.description
        ? playlist.description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
        : [];

      const genres = [...new Set(
        playlist.tracks.flatMap((t: any) => 
          t.artists.flatMap((a: any) => a.genres || [])
        )
      )];

      const artistIds = [...new Set(
        playlist.tracks.flatMap((t: any) => 
          t.artists.map((a: any) => a.id)
        )
      )];

      const trackIds = playlist.tracks.map((t: any) => t.id);

      try {
        await supabase.rpc('update_successful_pattern', {
          p_keywords: keywords.slice(0, 10),
          p_genres: genres.slice(0, 5),
          p_features: {},
          p_artists: artistIds.slice(0, 20),
          p_tracks: trackIds,
          p_rating: 4.0 // Rating por defecto, se puede actualizar después
        });
      } catch (error) {
        console.error('Error updating pattern:', error);
      }
    }

    return NextResponse.json({
      success: true,
      playlistId: spotifyPlaylist.id,
      playlistUrl: spotifyPlaylist.external_urls.spotify,
      tracks: formattedTracks, // NUEVO: Devolver tracks completos formateados
      trackCount: formattedTracks.length
    });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    );
  }
}

