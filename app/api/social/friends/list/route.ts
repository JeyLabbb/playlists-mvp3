import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { normalizeUsername } from '@/lib/social/usernameUtils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pleiaUser = await getPleiaServerUser();
    const userId = pleiaUser?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createSupabaseRouteClient();
    const adminSupabase = getSupabaseAdmin();

    const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
      supabase
        .from('friends')
        .select('friend_id, created_at')
        .eq('user_id', userId),
      supabase
        .from('friend_requests')
        .select('id, sender_id, created_at, status')
        .eq('receiver_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('friend_requests')
        .select('id, receiver_id, status, created_at')
        .eq('sender_id', userId),
    ]);

    if (friendsRes.error || incomingRes.error || outgoingRes.error) {
      console.error('[SOCIAL] Friends fetch error', {
        friends: friendsRes.error,
        incoming: incomingRes.error,
        outgoing: outgoingRes.error,
      });
      return NextResponse.json({ success: false, error: 'Failed to load social data' }, { status: 500 });
    }

    const friendIds = friendsRes.data?.map((row) => row.friend_id) ?? [];
    const incomingIds = incomingRes.data?.map((row) => row.sender_id) ?? [];
    const outgoingIds = outgoingRes.data?.map((row) => row.receiver_id) ?? [];
    const uniqueUserIds = Array.from(new Set([...friendIds, ...incomingIds, ...outgoingIds]));

    const userDetailsMap = new Map<
      string,
      { email: string | null; username: string | null; plan: string | null; last_prompt_at: string | null }
    >();
    if (uniqueUserIds.length > 0) {
      // 🚨 CRITICAL: Asegurarse de obtener email y username correctamente
      const { data: userRows, error: usersError } = await supabase
        .from('users')
        .select('id, email, username, plan, last_prompt_at')
        .in('id', uniqueUserIds);
      
      console.log('[SOCIAL] Users lookup:', {
        requestedIds: uniqueUserIds.length,
        foundRows: userRows?.length || 0,
        hasError: !!usersError,
        errorCode: usersError?.code,
        sampleRow: userRows?.[0] ? {
          id: userRows[0].id,
          hasEmail: !!userRows[0].email,
          email: userRows[0].email?.substring(0, 20) + '...',
          hasUsername: !!(userRows[0] as any).username,
          username: (userRows[0] as any).username
        } : null
      });

      let effectiveRows = userRows;
      let effectiveError = usersError;

      if (usersError?.code === '42703') {
        // Si la columna username no existe, intentar obtenerla de otra forma
        const fallback = await supabase
          .from('users')
          .select('id, email, plan')
          .in('id', uniqueUserIds);
        effectiveRows = (fallback.data || []).map((row: any) => ({
          ...row,
          username: null,
          last_prompt_at: null,
        }));
        effectiveError = fallback.error;
        
        // Si aún así no funciona, intentar obtener username de otra tabla o usar email como fallback
        if (effectiveRows) {
          // Intentar obtener username de la tabla profiles si existe
          for (const row of effectiveRows) {
            try {
              const { data: profileRow } = await supabase
                .from('profiles')
                .select('username')
                .eq('email', row.email)
                .maybeSingle();
              
              if (profileRow?.username) {
                (row as any).username = profileRow.username;
              }
            } catch (profileError) {
              // Ignorar errores al buscar en profiles
            }
          }
        }
      }

      if (effectiveError) {
        console.warn('[SOCIAL] Users lookup warning:', effectiveError);
      }

      effectiveRows?.forEach((row) => {
        // Asegurarse de que el email no sea null/undefined y esté normalizado
        const email = row.email ? row.email.trim().toLowerCase() : null;
        let username = (row as any).username ? (row as any).username.trim() : null;
        
        // 🚨 CRITICAL: Log para debugging
        console.log('[SOCIAL] Adding user to map:', {
          id: row.id,
          email: email?.substring(0, 20) + '...',
          username: username,
          hasEmail: !!email,
          hasUsername: !!username
        });
        
        userDetailsMap.set(row.id, {
          email: email,
          username: username,
          plan: row.plan ?? null,
          last_prompt_at: (row as any).last_prompt_at ?? null,
        });
      });
      
      // 🚨 CRITICAL: Log final del map
      console.log('[SOCIAL] Final userDetailsMap:', {
        size: userDetailsMap.size,
        keys: Array.from(userDetailsMap.keys()),
        sampleEntries: Array.from(userDetailsMap.entries()).slice(0, 3).map(([id, detail]) => ({
          id,
          email: detail.email?.substring(0, 20) + '...',
          username: detail.username
        }))
      });
      
      // 🚨 CRITICAL: Si algunos usuarios no tienen username, intentar obtenerlo de profiles
      const usersWithoutUsername = effectiveRows?.filter((row) => {
        const detail = userDetailsMap.get(row.id);
        return detail && !detail.username && detail.email;
      }) || [];
      
      if (usersWithoutUsername.length > 0) {
        console.log('[SOCIAL] Attempting to fetch usernames from profiles for', usersWithoutUsername.length, 'users');
        
        // Intentar obtener usernames de la tabla profiles
        const emailsToFetch = usersWithoutUsername.map(row => row.email).filter(Boolean) as string[];
        
        if (emailsToFetch.length > 0) {
          try {
            const { data: profileRows } = await supabase
              .from('profiles')
              .select('email, username')
              .in('email', emailsToFetch);
            
            if (profileRows) {
              const emailToUsernameMap = new Map<string, string>();
              profileRows.forEach((profile) => {
                if (profile.email && profile.username) {
                  emailToUsernameMap.set(profile.email.toLowerCase(), profile.username);
                }
              });
              
              // Actualizar userDetailsMap con los usernames encontrados
              usersWithoutUsername.forEach((row) => {
                if (row.email) {
                  const profileUsername = emailToUsernameMap.get(row.email.toLowerCase());
                  if (profileUsername) {
                    const detail = userDetailsMap.get(row.id);
                    if (detail) {
                      userDetailsMap.set(row.id, {
                        ...detail,
                        username: profileUsername.trim()
                      });
                      console.log('[SOCIAL] Found username in profiles for', row.email, ':', profileUsername);
                    }
                  }
                }
              });
            }
          } catch (profileError) {
            console.warn('[SOCIAL] Error fetching usernames from profiles:', profileError);
          }
        }
      }
      
      // 🚨 CRITICAL: Log para debugging si no encontramos usuarios
      if (uniqueUserIds.length > 0 && userDetailsMap.size < uniqueUserIds.length) {
        const missingIds = uniqueUserIds.filter(id => !userDetailsMap.has(id));
        console.warn('[SOCIAL] Some users not found in users table:', {
          totalRequested: uniqueUserIds.length,
          found: userDetailsMap.size,
          missing: missingIds.length,
          missingIds: missingIds.slice(0, 5) // Log solo los primeros 5
        });
        
        // 🚨 CRITICAL: Intentar obtener email de auth.users para usuarios faltantes
        if (missingIds.length > 0 && adminSupabase) {
          try {
            const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
            if (!authError && authUsers?.users) {
              missingIds.forEach((missingId) => {
                const authUser = (authUsers.users as any[]).find((u: any) => u.id === missingId);
                if (authUser?.email) {
                  // Crear entrada mínima en userDetailsMap con solo el email
                  userDetailsMap.set(missingId, {
                    email: authUser.email.toLowerCase(),
                    username: null,
                    plan: null,
                    last_prompt_at: null
                  });
                  console.log('[SOCIAL] Found email from auth.users for missing user:', {
                    id: missingId,
                    email: authUser.email
                  });
                }
              });
            }
          } catch (authLookupError) {
            console.warn('[SOCIAL] Error looking up users in auth.users:', authLookupError);
          }
        }
      }
    }

    const friends = (friendsRes.data ?? []).map((row) => {
      const detail = userDetailsMap.get(row.friend_id) ?? { email: null, username: null, plan: null, last_prompt_at: null };
      return {
        friendId: row.friend_id,
        createdAt: row.created_at,
        email: detail.email,
        username: normalizeUsername(detail.username) || detail.username, // Normalizar username
        plan: detail.plan,
        lastActivity: detail.last_prompt_at,
      };
    });

    const incoming = (incomingRes.data ?? []).map((row) => {
      const detail = userDetailsMap.get(row.sender_id) ?? { email: null, username: null };
      
      // 🚨 CRITICAL: Si no encontramos el usuario, log para debugging
      if (!detail.email && !detail.username) {
        console.warn('[SOCIAL] User not found in users table for sender_id:', {
          senderId: row.sender_id,
          requestId: row.id,
          totalUsersInMap: userDetailsMap.size,
          requestedUserIds: uniqueUserIds.length
        });
      }
      
      return {
        requestId: row.id,
        senderId: row.sender_id,
        email: detail.email,
        username: normalizeUsername(detail.username) || detail.username, // Normalizar username
        createdAt: row.created_at,
      };
    });

    // 🚨 CRITICAL: Procesar solicitudes salientes con búsquedas directas si es necesario
    const outgoingPromises = (outgoingRes.data ?? []).map(async (row) => {
      const detail = userDetailsMap.get(row.receiver_id) ?? { email: null, username: null };
      
      // 🚨 CRITICAL: Log detallado para debugging
      console.log('[SOCIAL] Processing outgoing request:', {
        requestId: row.id,
        receiverId: row.receiver_id,
        hasDetailInMap: userDetailsMap.has(row.receiver_id),
        detail: detail ? {
          hasEmail: !!detail.email,
          email: detail.email?.substring(0, 20) + '...',
          hasUsername: !!detail.username,
          username: detail.username
        } : null,
        mapSize: userDetailsMap.size,
        allMapKeys: Array.from(userDetailsMap.keys()).slice(0, 5)
      });
      
      // 🚨 CRITICAL: Si no encontramos el usuario, intentar buscarlo directamente
      if (!detail.email && !detail.username) {
        console.warn('[SOCIAL] User not found in users table for receiver_id, attempting direct lookup:', {
          receiverId: row.receiver_id,
          requestId: row.id
        });
        
        // Intentar buscar directamente en users
        try {
          const { data: directUser, error: directError } = await supabase
            .from('users')
            .select('id, email, username')
            .eq('id', row.receiver_id)
            .maybeSingle();
          
          if (directUser && !directError) {
            console.log('[SOCIAL] Found user via direct lookup:', {
              id: directUser.id,
              email: directUser.email?.substring(0, 20) + '...',
              username: directUser.username
            });
            
            // Actualizar el map y usar estos datos
            const email = directUser.email ? directUser.email.trim().toLowerCase() : null;
            const username = (directUser as any).username ? (directUser as any).username.trim() : null;
            
            userDetailsMap.set(row.receiver_id, {
              email: email,
              username: username,
              plan: null,
              last_prompt_at: null
            });
            
            return {
              requestId: row.id,
              receiverId: row.receiver_id,
              status: row.status,
              email: email,
              username: normalizeUsername(username) || username,
              createdAt: row.created_at,
            };
          } else {
            console.error('[SOCIAL] Direct lookup also failed:', {
              receiverId: row.receiver_id,
              error: directError?.message
            });
          }
        } catch (directLookupError) {
          console.error('[SOCIAL] Error in direct lookup:', directLookupError);
        }
      }
      
      return {
        requestId: row.id,
        receiverId: row.receiver_id,
        status: row.status,
        email: detail.email,
        username: normalizeUsername(detail.username) || detail.username, // Normalizar username
        createdAt: row.created_at,
      };
    });
    
    const outgoing = await Promise.all(outgoingPromises);

    return NextResponse.json({
      success: true,
      friends,
      requests: {
        incoming,
        outgoing,
      },
    });
  } catch (error) {
    console.error('[SOCIAL] Friends list error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

