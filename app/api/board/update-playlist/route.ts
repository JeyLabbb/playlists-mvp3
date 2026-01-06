import { NextRequest, NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.id || !pleiaUser?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { playlistId, playlist_name, spotify_playlist_url } = body;

    if (!playlistId) {
      return NextResponse.json({ error: 'playlistId requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const updates: any = {};

    if (playlist_name !== undefined) {
      updates.playlist_name = playlist_name;
    }

    if (spotify_playlist_url !== undefined) {
      updates.spotify_playlist_url = spotify_playlist_url;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    // Actualizar en Supabase
    const { error } = await supabase
      .from('playlists')
      .update(updates)
      .eq('spotify_playlist_id', playlistId)
      .or(`user_id.eq.${pleiaUser.id},user_email.ilike.${pleiaUser.email}`);

    if (error) {
      console.error('[BOARD] Error updating playlist in Supabase:', error);
      return NextResponse.json({ error: 'Error al actualizar en Supabase' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BOARD] Error in update-playlist:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

