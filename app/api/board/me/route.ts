import { NextRequest, NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const adminSupabase = getSupabaseAdmin();

// GET /api/board/me - Obtener board del usuario autenticado
export async function GET(req: NextRequest) {
  try {
    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = pleiaUser.id;

    // Obtener board del usuario
    const { data: board, error: boardError } = await adminSupabase
      .from('playlist_boards')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (boardError && boardError.code !== 'PGRST116') {
      console.error('[BOARD] Error fetching board:', boardError);
      return NextResponse.json({ error: 'Error al obtener board' }, { status: 500 });
    }

    // Si no existe, crear uno por defecto
    if (!board) {
      const username = pleiaUser.name || pleiaUser.email?.split('@')[0] || 'user';
      const slug = await generateUniqueSlug(username, userId);

      const { data: newBoard, error: createError } = await adminSupabase
        .from('playlist_boards')
        .insert({
          user_id: userId,
          slug,
          display_name: username,
          status_text: '',
          theme: 'pleia',
          font_title: 'inter',
          font_status: 'inter',
        })
        .select()
        .single();

      if (createError) {
        console.error('[BOARD] Error creating board:', createError);
        return NextResponse.json({ error: 'Error al crear board' }, { status: 500 });
      }

      return NextResponse.json({ board: newBoard, playlists: [] });
    }

    // Obtener playlists del usuario (solo las públicas para el board)
    // Incluir playlists donde is_public es true o null (default público)
    const { data: playlists, error: playlistsError } = await adminSupabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .or('is_public.eq.true,is_public.is.null')
      .order('created_at', { ascending: false });

    console.log('[BOARD] Fetched playlists:', {
      userId,
      playlistsCount: playlists?.length || 0,
      playlistsError: playlistsError?.message,
      playlists: playlists?.slice(0, 3), // Log first 3 for debugging
    });

    if (playlistsError) {
      console.error('[BOARD] Error fetching playlists:', playlistsError);
    }

    return NextResponse.json({
      board,
      playlists: playlists || [],
    });
  } catch (error) {
    console.error('[BOARD] Error in GET /api/board/me:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST /api/board/me - Actualizar board del usuario
export async function POST(req: NextRequest) {
  try {
    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = pleiaUser.id;

    const body = await req.json();
    const { display_name, status_text, theme, font_title, font_status, slug } = body;

    // Validaciones
    const validThemes = ['light', 'dark', 'pleia'];
    const validFonts = ['inter', 'space_grotesk', 'sf_pro'];

    if (display_name !== undefined && (typeof display_name !== 'string' || display_name.length > 50)) {
      return NextResponse.json({ error: 'display_name inválido (max 50 chars)' }, { status: 400 });
    }

    if (status_text !== undefined && (typeof status_text !== 'string' || status_text.length > 120)) {
      return NextResponse.json({ error: 'status_text inválido (max 120 chars)' }, { status: 400 });
    }

    if (theme !== undefined && !validThemes.includes(theme)) {
      return NextResponse.json({ error: 'theme inválido' }, { status: 400 });
    }

    if (font_title !== undefined && !validFonts.includes(font_title)) {
      return NextResponse.json({ error: 'font_title inválido' }, { status: 400 });
    }

    if (font_status !== undefined && !validFonts.includes(font_status)) {
      return NextResponse.json({ error: 'font_status inválido' }, { status: 400 });
    }

    // Preparar update
    const updates: any = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (status_text !== undefined) updates.status_text = status_text;
    if (theme !== undefined) updates.theme = theme;
    if (font_title !== undefined) updates.font_title = font_title;
    if (font_status !== undefined) updates.font_status = font_status;

    // Si se quiere cambiar slug, validar unicidad
    if (slug !== undefined && typeof slug === 'string') {
      const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (sanitizedSlug.length < 3) {
        return NextResponse.json({ error: 'slug debe tener al menos 3 caracteres' }, { status: 400 });
      }

      // Verificar que no exista (excepto el del usuario actual)
      const { data: existing } = await adminSupabase
        .from('playlist_boards')
        .select('user_id')
        .eq('slug', sanitizedSlug)
        .neq('user_id', userId)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'slug ya está en uso' }, { status: 400 });
      }

      updates.slug = sanitizedSlug;
    }

    // Actualizar
    const { data: updatedBoard, error: updateError } = await adminSupabase
      .from('playlist_boards')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[BOARD] Error updating board:', updateError);
      return NextResponse.json({ error: 'Error al actualizar board' }, { status: 500 });
    }

    return NextResponse.json({ board: updatedBoard });
  } catch (error) {
    console.error('[BOARD] Error in POST /api/board/me:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Helper para generar slug único
async function generateUniqueSlug(baseName: string, userId: string): Promise<string> {
  const sanitized = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '');
  let slug = sanitized.length >= 3 ? sanitized : `user-${userId.substring(0, 8)}`;
  let counter = 0;

  while (true) {
    const { data } = await adminSupabase
      .from('playlist_boards')
      .select('user_id')
      .eq('slug', slug)
      .neq('user_id', userId)
      .single();

    if (!data) break;

    counter++;
    slug = `${sanitized}-${counter}`;
  }

  return slug;
}

