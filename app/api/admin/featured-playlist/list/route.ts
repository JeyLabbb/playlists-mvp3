import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/admin/featured-playlist/list
 * Lista todas las playlists disponibles para seleccionar como destacada
 */
export async function GET(request: Request) {
  try {
    // Verificar admin
    const adminCheck = await ensureAdminAccess(request);
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Obtener todas las playlists públicas con spotify_id
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select(`
        id,
        playlist_name,
        prompt,
        spotify_id,
        spotify_url,
        user_email,
        user_id,
        track_count,
        created_at,
        is_public
      `)
      .not('spotify_id', 'is', null)
      .eq('is_public', true) // SOLO playlists públicas
      .order('created_at', { ascending: false })
      .limit(500); // Límite razonable

    if (error) {
      console.error('[FEATURED] Error fetching playlists:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener playlists' },
        { status: 500 }
      );
    }

    // Enriquecer con datos de usuario si es posible
    const enrichedPlaylists = await Promise.all(
      (playlists || []).map(async (playlist) => {
        let ownerDisplayName = playlist.user_email?.split('@')[0] || 'Usuario PLEIA';
        
        if (playlist.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('username, display_name')
            .eq('id', playlist.user_id)
            .single();
          
          if (userData) {
            ownerDisplayName = userData.display_name || userData.username || ownerDisplayName;
          }
        }

        return {
          ...playlist,
          owner_display_name: ownerDisplayName,
        };
      })
    );

    return NextResponse.json({
      success: true,
      playlists: enrichedPlaylists
    });

  } catch (error: any) {
    console.error('[FEATURED] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

