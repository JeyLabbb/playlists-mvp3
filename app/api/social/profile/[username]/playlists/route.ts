import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { resolveFriendIdentity } from '@/lib/social/resolveFriendIdentity';

function sanitizeUsername(username?: string | null) {
  if (!username) return '';
  return username.toLowerCase().replace(/[^a-z0-9._-]/g, '').substring(0, 30);
}

/**
 * GET /api/social/profile/[username]/playlists
 * Endpoint optimizado para obtener playlists de un usuario por username
 * Consulta directamente desde Supabase sin cargar todas las playlists
 */
export async function GET(
  _: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    const { username: paramUsername } = await context.params;
    const rawUsername = paramUsername ? decodeURIComponent(paramUsername) : '';
    const normalized = sanitizeUsername(rawUsername);

    if (!normalized) {
      return NextResponse.json({ success: false, error: 'Invalid username' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 500 });
    }

    // 1. Resolver username a user_id o email - BUSCAR DIRECTAMENTE EN SUPABASE (más rápido)
    let userId: string | null = null;
    let userEmail: string | null = null;

    // Buscar directamente en Supabase por username (case-insensitive)
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, username')
      .ilike('username', normalized)
      .maybeSingle();
    
    if (userData) {
      userId = userData.id;
      userEmail = userData.email;
    } else {
      // Fallback: intentar con resolveFriendIdentity
      try {
        const resolution = await resolveFriendIdentity({ username: normalized });
        userId = resolution.userId ?? null;
        userEmail = resolution.email?.toLowerCase() ?? null;
      } catch (error) {
        // Si falla, no hay usuario
      }
    }

    if (!userId && !userEmail) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // 2. Consultar playlists directamente desde Supabase (optimizado)
    // SOLO playlists públicas (is_public = true)
    // Buscar por user_id Y user_email (igual que trending)
    let playlistsQuery = supabase
      .from('playlists')
      .select('id, playlist_name, prompt, spotify_url, spotify_id, track_count, created_at, user_email, user_id, is_public')
      .eq('is_public', true) // SOLO playlists públicas
      .order('created_at', { ascending: false })
      .limit(100); // Limitar a 100 playlists

    // Buscar por user_id Y user_email (más robusto, igual que trending)
    if (userId && userEmail) {
      playlistsQuery = playlistsQuery.or(`user_id.eq.${userId},user_email.ilike.${userEmail}`);
    } else if (userId) {
      playlistsQuery = playlistsQuery.eq('user_id', userId);
    } else if (userEmail) {
      playlistsQuery = playlistsQuery.ilike('user_email', userEmail);
    }

    const { data: playlists, error: playlistsError } = await playlistsQuery;

    if (playlistsError) {
      console.error('[PROFILE-PLAYLISTS] Error fetching playlists:', playlistsError);
      return NextResponse.json(
        { success: false, error: 'Error fetching playlists' },
        { status: 500 }
      );
    }

    // 3. Formatear playlists para el frontend
    const formattedPlaylists = (playlists || []).map((playlist) => ({
      id: playlist.id,
      playlistId: playlist.spotify_id || playlist.id,
      playlistName: playlist.playlist_name,
      prompt: playlist.prompt,
      spotifyUrl: playlist.spotify_url,
      trackCount: playlist.track_count || 0,
      createdAt: playlist.created_at,
      ownerEmail: playlist.user_email,
    }));

    return NextResponse.json({
      success: true,
      playlists: formattedPlaylists,
      count: formattedPlaylists.length,
    });

  } catch (error: any) {
    console.error('[PROFILE-PLAYLISTS] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Unexpected error' },
      { status: 500 }
    );
  }
}

