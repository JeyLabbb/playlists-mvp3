import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/board/public/[slug] - Obtener board público por slug
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const { slug } = params;

    if (!slug) {
      return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
    }

    // Obtener board por slug
    const { data: board, error: boardError } = await adminSupabase
      .from('playlist_boards')
      .select('user_id, slug, display_name, status_text, theme, font_title, font_status')
      .eq('slug', slug)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: 'Board no encontrado' }, { status: 404 });
    }

    // Obtener playlists públicas del usuario
    const { data: playlists, error: playlistsError } = await adminSupabase
      .from('playlists')
      .select('playlist_id, playlist_name, spotify_playlist_id, spotify_playlist_url, mood, preview_tracks, created_at')
      .eq('user_id', board.user_id)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (playlistsError) {
      console.error('[BOARD_PUBLIC] Error fetching playlists:', playlistsError);
    }

    // Enriquecer playlists con cover image (primer track o fallback)
    const enrichedPlaylists = (playlists || []).map((pl: any) => {
      let coverImage = '/pleia-logo.png'; // fallback
      
      if (pl.preview_tracks && Array.isArray(pl.preview_tracks) && pl.preview_tracks.length > 0) {
        const firstTrack = pl.preview_tracks[0];
        if (firstTrack.album?.images?.[0]?.url) {
          coverImage = firstTrack.album.images[0].url;
        }
      }

      return {
        id: pl.playlist_id,
        name: pl.playlist_name,
        spotifyId: pl.spotify_playlist_id,
        spotifyUrl: pl.spotify_playlist_url,
        mood: pl.mood || null,
        coverImage,
        previewTracks: (pl.preview_tracks || []).slice(0, 5).map((t: any) => ({
          name: t.name,
          artist: t.artists?.[0]?.name || 'Unknown',
        })),
      };
    });

    return NextResponse.json({
      board: {
        slug: board.slug,
        displayName: board.display_name,
        statusText: board.status_text,
        theme: board.theme,
        fontTitle: board.font_title,
        fontStatus: board.font_status,
      },
      playlists: enrichedPlaylists,
    });
  } catch (error) {
    console.error('[BOARD_PUBLIC] Error in GET:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

