import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/admin/featured-playlist/clear
 * Quita la playlist destacada (deja ninguna activa)
 */
export async function POST(request: Request) {
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

    // Desactivar todas las playlists destacadas
    const { data, error } = await supabase
      .from('featured_playlists')
      .update({ is_active: false })
      .eq('is_active', true);

    if (error) {
      console.error('[FEATURED] Error clearing featured playlist:', error);
      return NextResponse.json(
        { success: false, error: 'Error al quitar playlist destacada' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist destacada eliminada'
    });

  } catch (error: any) {
    console.error('[FEATURED] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

