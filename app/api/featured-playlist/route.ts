import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/featured-playlist
 * Endpoint público para obtener la playlist destacada activa
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('featured_playlists')
      .select('*')
      .eq('is_active', true)
      .single();

    // SIEMPRE obtener username y profile_url directamente de Supabase si tenemos user_id
    // Igual que trending: buscar por user_id primero, luego por email si no hay user_id
    if (data) {
      try {
        let userData = null;
        let userError = null;
        
        // Prioridad 1: buscar por user_id
        if (data.owner_user_id) {
          const result = await supabase
            .from('users')
            .select('username, profile_url, email')
            .eq('id', data.owner_user_id)
            .maybeSingle();
          userData = result.data;
          userError = result.error;
        }
        
        // Prioridad 2: si no hay user_id o no se encontró, buscar por email
        if (!userData && data.owner_email) {
          const result = await supabase
            .from('users')
            .select('username, profile_url, email, id')
            .ilike('email', data.owner_email)
            .maybeSingle();
          userData = result.data;
          userError = result.error;
          
          // Si encontramos por email, actualizar owner_user_id
          if (userData && userData.id && !data.owner_user_id) {
            await supabase
              .from('featured_playlists')
              .update({ owner_user_id: userData.id })
              .eq('id', data.id);
            data.owner_user_id = userData.id;
          }
        }
        
        if (!userError && userData) {
          let needsUpdate = false;
          const updates: any = {};
          
          // Actualizar username si es diferente o no existe (igual que trending)
          if (userData.username && data.owner_username !== userData.username) {
            data.owner_username = userData.username;
            updates.owner_username = userData.username;
            needsUpdate = true;
          }
          
          // Obtener o construir profile_url
          let profileUrl = userData.profile_url;
          if (!profileUrl && userData.username) {
            profileUrl = `/u/${encodeURIComponent(userData.username)}`;
            // Actualizar en users también
            await supabase
              .from('users')
              .update({ profile_url: profileUrl })
              .eq('id', userData.id || data.owner_user_id);
          }
          
          // Actualizar profile_url en featured_playlists si es diferente
          if (profileUrl && data.owner_profile_url !== profileUrl) {
            data.owner_profile_url = profileUrl;
            updates.owner_profile_url = profileUrl;
            needsUpdate = true;
          }
          
          // Si hay cambios, actualizar en la DB
          if (needsUpdate) {
            await supabase
              .from('featured_playlists')
              .update(updates)
              .eq('id', data.id);
          }
        }
      } catch (err) {
        console.warn('[FEATURED] Error fetching username/profile_url from Supabase:', err);
        // No fallar si no podemos obtener el username
      }
    }

    if (error) {
      // Si no hay playlist destacada, devolver null (no es un error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          success: true, 
          featured: null 
        });
      }
      
      console.error('[FEATURED] Error fetching featured playlist:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener playlist destacada' },
        { status: 500 }
      );
    }

    // Usar display_name si existe, sino usar playlist_name
    const featuredData = {
      ...data,
      display_name: data.display_name || data.playlist_name,
      // Mantener playlist_name original para referencia
    };

    return NextResponse.json({
      success: true,
      featured: featuredData
    });

  } catch (error: any) {
    console.error('[FEATURED] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

