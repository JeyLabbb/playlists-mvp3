import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { getSupabaseAdmin } from '@/lib/supabase/server';

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
      { email: string | null; username: string | null; plan: string | null }
    >();
    if (uniqueUserIds.length > 0) {
      // 🚨 CRITICAL: Asegurarse de obtener email y username correctamente
      const userClient = adminSupabase || supabase;
      const { data: userRows, error: usersError } = await userClient
        .from('users')
        .select('id, email, username, plan')
        .in('id', uniqueUserIds);
      
      if (usersError) {
        console.error('[SOCIAL] Users lookup error:', usersError.code, usersError.message);
      }

      let effectiveRows = userRows;
      let effectiveError = usersError;

      if (usersError?.code === '42703') {
        // Si la columna username no existe, intentar obtenerla de otra forma
        const fallback = await userClient
          .from('users')
          .select('id, email, plan')
          .in('id', uniqueUserIds);
        effectiveRows = (fallback.data || []).map((row: any) => ({
          ...row,
          username: null,
        }));
        effectiveError = fallback.error;
        
        // Si aún así no funciona, intentar obtener username de otra tabla o usar email como fallback
        if (effectiveRows) {
          // Intentar obtener username de la tabla profiles si existe
          for (const row of effectiveRows) {
            try {
              const { data: profileRow } = await userClient
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
        
        userDetailsMap.set(row.id, {
          email: email,
          username: username,
          plan: row.plan ?? null,
        });
      });
      
      // 🚨 CRITICAL: Si algunos usuarios no tienen username, intentar obtenerlo de profiles
      const usersWithoutUsername = effectiveRows?.filter((row) => {
        const detail = userDetailsMap.get(row.id);
        return detail && !detail.username && detail.email;
      }) || [];
      
      if (usersWithoutUsername.length > 0) {
        
        // Intentar obtener usernames de la tabla profiles
        const emailsToFetch = usersWithoutUsername.map(row => row.email).filter(Boolean) as string[];
        
        if (emailsToFetch.length > 0) {
          try {
            const { data: profileRows } = await userClient
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
        // Log reducido - solo en caso de error crítico
        if (missingIds.length === uniqueUserIds.length) {
          console.warn('[SOCIAL] All users missing from users table');
        }
        
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
      const detail = userDetailsMap.get(row.friend_id) ?? { email: null, username: null, plan: null };
      // Usar username TAL CUAL de Supabase - SIN NORMALIZAR
      const username = detail.username || detail.email?.split('@')[0] || 'unknown';
      return {
        friendId: row.friend_id,
        createdAt: row.created_at,
        email: detail.email,
        username: username, // Usar username tal cual
        plan: detail.plan,
        lastActivity: null, // Usar prompts.created_at en el futuro si es necesario
      };
    });

    const incoming = (incomingRes.data ?? []).map((row) => {
      const detail = userDetailsMap.get(row.sender_id) ?? { email: null, username: null };
      
      // Usar username TAL CUAL de Supabase - SIN NORMALIZAR
      const username = detail.username || detail.email?.split('@')[0] || 'unknown';
      
      return {
        requestId: row.id,
        senderId: row.sender_id,
        email: detail.email,
        username: username, // Usar username tal cual
        createdAt: row.created_at,
      };
    });

    // 🚨 CRITICAL: Procesar solicitudes salientes con búsquedas directas si es necesario
    const outgoingPromises = (outgoingRes.data ?? []).map(async (row) => {
      let detail = userDetailsMap.get(row.receiver_id) ?? { email: null, username: null };
      
      // 🚨 CRITICAL: Si no encontramos el usuario, intentar buscarlo directamente
      if (!detail.email && !detail.username) {
        // Log reducido - solo errores críticos
        
        // Intentar buscar directamente en users
        try {
          const userClient = adminSupabase || supabase;
          const { data: directUser, error: directError } = await userClient
            .from('users')
            .select('id, email, username')
            .eq('id', row.receiver_id)
            .maybeSingle();
          
          if (directUser && !directError) {
            // Actualizar el map y usar estos datos
            const email = directUser.email ? directUser.email.trim().toLowerCase() : null;
            const username = (directUser as any).username ? (directUser as any).username.trim() : null;
            
            detail = {
              email: email,
              username: username,
              plan: null,
            };
            
            userDetailsMap.set(row.receiver_id, detail);
          } else {
            // Si no está en users, intentar obtener email de auth.users
            if (adminSupabase) {
              try {
                const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
                if (!authError && authUsers?.users) {
                  const authUser = (authUsers.users as any[]).find((u: any) => u.id === row.receiver_id);
                  if (authUser?.email) {
                    
                    detail = {
                      email: authUser.email.toLowerCase(),
                      username: null,
                      plan: null,
                    };
                    
                    userDetailsMap.set(row.receiver_id, detail);
                  }
                }
              } catch (authLookupError) {
                console.warn('[SOCIAL] Error looking up receiver in auth.users:', authLookupError);
              }
            }
          }
        } catch (directLookupError) {
          console.error('[SOCIAL] Error in direct lookup:', directLookupError);
          
          // Último intento: buscar en auth.users
          if (adminSupabase) {
            try {
              const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
              if (!authError && authUsers?.users) {
                const authUser = (authUsers.users as any[]).find((u: any) => u.id === row.receiver_id);
                if (authUser?.email) {
                  detail = {
                    email: authUser.email.toLowerCase(),
                    username: null,
                    plan: null,
                  };
                  
                  userDetailsMap.set(row.receiver_id, detail);
                }
              }
            } catch (authLookupError) {
              console.warn('[SOCIAL] Error in final auth.users lookup:', authLookupError);
            }
          }
        }
      }
      
      // Usar username TAL CUAL de Supabase - SIN NORMALIZAR
      const username = detail.username || detail.email?.split('@')[0] || 'unknown';
      
      return {
        requestId: row.id,
        receiverId: row.receiver_id,
        status: row.status,
        email: detail.email,
        username: username, // Usar username tal cual
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

