import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';

/**
 * POST /api/admin/featured-playlist/select
 * Selecciona una playlist como destacada
 * Body: { spotify_playlist_id: string }
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

    const body = await request.json();
    const { spotify_playlist_id } = body;

    if (!spotify_playlist_id) {
      return NextResponse.json(
        { success: false, error: 'spotify_playlist_id es requerido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const adminUser = await getPleiaServerUser();

    // 1. Buscar la playlist en la tabla playlists
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('spotify_id', spotify_playlist_id)
      .single();

    if (playlistError || !playlist) {
      console.error('[FEATURED] Playlist not found:', playlistError);
      return NextResponse.json(
        { success: false, error: 'Playlist no encontrada en la base de datos' },
        { status: 404 }
      );
    }

    // 2. Obtener datos del usuario creador
    let ownerDisplayName = playlist.user_email?.split('@')[0] || 'Usuario PLEIA';
    let ownerEmail = playlist.user_email;
    let ownerUserId = playlist.user_id;
    let ownerUsername: string | null = null;

    // OBTENER username y profile_url DIRECTAMENTE de Supabase (fuente de verdad)
    let ownerProfileUrl: string | null = null;
    
    if (playlist.user_id) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, email, profile_url')
        .eq('id', playlist.user_id)
        .single();
      
      if (!userError && userData) {
        ownerEmail = userData.email || ownerEmail;
        // Username desde Supabase es la prioridad #1
        ownerUsername = userData.username || null;
        // Profile URL desde Supabase (si existe)
        ownerProfileUrl = userData.profile_url || null;
        
        // Si no hay profile_url pero hay username, construirla
        if (!ownerProfileUrl && ownerUsername) {
          ownerProfileUrl = `https://playlists.jeylabbb.com/u/${encodeURIComponent(ownerUsername)}`;
          // Actualizar en users para futuras consultas
          await supabase
            .from('users')
            .update({ profile_url: ownerProfileUrl })
            .eq('id', playlist.user_id);
        }
        
        // Si no hay username en users, intentar desde KV como fallback
        if (!ownerUsername && ownerEmail) {
          try {
            // Intentar obtener desde KV si está disponible
            const kvModule = await import('@vercel/kv');
            const kv = kvModule.kv;
            const profileKey = `jey_user_profile:${ownerEmail}`;
            const profile = await kv.get(profileKey) as { username?: string } | null;
            
            if (profile?.username) {
              ownerUsername = profile.username;
              ownerProfileUrl = `/u/${encodeURIComponent(ownerUsername)}`;
              // Actualizar en users
              await supabase
                .from('users')
                .update({ 
                  username: ownerUsername,
                  profile_url: ownerProfileUrl 
                })
                .eq('id', playlist.user_id);
              console.log('[FEATURED] Username y profile_url obtenidos desde KV, actualizando en users...');
            }
          } catch (e) {
            console.warn('[FEATURED] Could not get username from KV:', e);
            // Continuar sin username, no es crítico
          }
        }
      } else {
        console.warn('[FEATURED] Error fetching user from Supabase:', userError);
      }
    } else if (ownerEmail) {
      // Si no hay user_id pero hay user_email, intentar buscar por email
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, username, email, profile_url')
        .ilike('email', ownerEmail)
        .maybeSingle();
      
      if (userByEmail) {
        ownerUserId = userByEmail.id;
        ownerEmail = userByEmail.email || ownerEmail;
        ownerUsername = userByEmail.username || null;
        ownerProfileUrl = userByEmail.profile_url || null;
        
        if (!ownerProfileUrl && ownerUsername) {
          ownerProfileUrl = `/u/${encodeURIComponent(ownerUsername)}`;
        }
        
        console.log('[FEATURED] Usuario encontrado por email:', ownerEmail, 'userId:', ownerUserId);
      }
    }

    // 3. Obtener preview de tracks desde Spotify (opcional, puede fallar)
    let previewTracks: any[] = [];
    try {
      // Obtener token de Spotify directamente (más confiable que fetch HTTP interno)
      const accessToken = await getHubAccessToken();
      
      // Llamar directamente a la API de Spotify
      const response = await fetch(`https://api.spotify.com/v1/playlists/${spotify_playlist_id}/tracks?limit=100`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        
        // Formatear tracks con toda la info necesaria
        previewTracks = items.slice(0, 15).map((item: any) => {
          const track = item.track;
          if (!track) return null;
          
          return {
            name: track.name,
            artist: track.artists?.map((a: any) => a.name).join(', ') || 'Artista desconocido',
            artists: track.artists?.map((a: any) => ({ name: a.name })) || [{ name: 'Artista desconocido' }],
            album: track.album || {},
            external_urls: {
              spotify: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`
            },
            spotify_url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
            image: track.album?.images?.[0]?.url || null,
          };
        }).filter((t: any) => t !== null);
        
        console.log(`[FEATURED] Preview tracks obtenidos: ${previewTracks.length} tracks`);
      } else {
        console.warn(`[FEATURED] Error fetching Spotify tracks: ${response.status} ${response.statusText}`);
      }
    } catch (spotifyError: any) {
      console.warn('[FEATURED] Error fetching Spotify tracks:', spotifyError?.message || spotifyError);
      // Continuar sin preview tracks
    }

    // 4. Desactivar la playlist destacada anterior
    await supabase
      .from('featured_playlists')
      .update({ is_active: false })
      .eq('is_active', true);

    // 5. Crear/actualizar la nueva playlist destacada
    const { data: existing } = await supabase
      .from('featured_playlists')
      .select('id')
      .eq('spotify_playlist_id', spotify_playlist_id)
      .single();

    const featuredData = {
      is_active: true,
      spotify_playlist_id: playlist.spotify_id,
      spotify_playlist_url: playlist.spotify_url || `https://open.spotify.com/playlist/${spotify_playlist_id}`,
      playlist_name: playlist.playlist_name,
      owner_user_id: ownerUserId,
      owner_display_name: ownerDisplayName,
      owner_username: ownerUsername,
      owner_email: ownerEmail,
      owner_profile_url: ownerProfileUrl, // URL completa del perfil
      preview_tracks: previewTracks,
      featured_at: new Date().toISOString(),
      featured_by_admin: adminUser?.id || null,
    };

    let result;
    if (existing) {
      // Actualizar existente
      const { data, error } = await supabase
        .from('featured_playlists')
        .update(featuredData)
        .eq('id', existing.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Crear nuevo
      const { data, error } = await supabase
        .from('featured_playlists')
        .insert([featuredData])
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('[FEATURED] Error saving featured playlist:', result.error);
      return NextResponse.json(
        { success: false, error: 'Error al guardar playlist destacada' },
        { status: 500 }
      );
    }

    // 6. Enviar email al creador (si tiene email)
    // IMPORTANTE: Enviar email incluso si no hay ownerUserId, solo con email es suficiente
    if (ownerEmail) {
      try {
        // Importar dinámicamente para evitar errores de circular dependency
        const { sendFeaturedPlaylistEmail } = await import('@/lib/email/featuredPlaylistNotification');
        
        // Si no hay ownerUserId, usar un placeholder o el email como ID
        const userIdForEmail = ownerUserId || ownerEmail;
        
        await sendFeaturedPlaylistEmail(userIdForEmail, ownerEmail, {
          playlistName: playlist.playlist_name,
          playlistUrl: featuredData.spotify_playlist_url,
        });
        console.log('[FEATURED] ✅ Email enviado al creador:', ownerEmail, 'userId:', userIdForEmail);
      } catch (emailError) {
        console.error('[FEATURED] ❌ Error enviando email al creador:', emailError);
        // No fallar si el email falla, pero loguear el error completo
        console.error('[FEATURED] Email error details:', {
          ownerEmail,
          ownerUserId,
          error: emailError instanceof Error ? emailError.message : String(emailError),
          stack: emailError instanceof Error ? emailError.stack : undefined
        });
      }
    } else {
      console.warn('[FEATURED] ⚠️ No se puede enviar email: ownerEmail no está definido', {
        ownerEmail,
        ownerUserId,
        playlistUserEmail: playlist.user_email,
        playlistUserId: playlist.user_id
      });
    }

    return NextResponse.json({
      success: true,
      featured: result.data
    });

  } catch (error: any) {
    console.error('[FEATURED] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

