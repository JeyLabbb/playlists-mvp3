import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/admin/featured-playlist/update-name
 * Actualiza el nombre personalizado (display_name) de la playlist destacada activa
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar acceso admin
    const adminCheck = await ensureAdminAccess(request);
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { display_name } = body;

    if (typeof display_name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'display_name debe ser un string' },
        { status: 400 }
      );
    }

    // Si display_name está vacío o solo espacios, establecerlo a NULL (usará playlist_name)
    const finalDisplayName = display_name.trim() || null;

    const supabase = getSupabaseAdmin();

    // Actualizar la playlist destacada activa
    const { data, error } = await supabase
      .from('featured_playlists')
      .update({ display_name: finalDisplayName })
      .eq('is_active', true)
      .select()
      .single();

    if (error) {
      console.error('[FEATURED_ADMIN] Error updating display_name:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar el nombre' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'No hay playlist destacada activa' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      featured: data
    });

  } catch (error: any) {
    console.error('[FEATURED_ADMIN] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

