import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import {
  FriendResolutionError,
  resolveFriendIdentity,
} from '@/lib/social/resolveFriendIdentity';
import {
  cacheUsernameMapping,
  normalizeUsername,
} from '@/lib/social/usernameCache';

function sanitizeUsername(username?: string | null) {
  if (!username) return '';
  return username.toLowerCase().replace(/[^a-z0-9._-]/g, '').substring(0, 30);
}

function hasKV() {
  const url = process.env.UPSTASH_REDIS_KV_REST_API_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!process.env.UPSTASH_REDIS_KV_REST_API_URL && process.env.KV_REST_API_URL) {
    process.env.UPSTASH_REDIS_KV_REST_API_URL = process.env.KV_REST_API_URL;
  }
  if (!process.env.UPSTASH_REDIS_KV_REST_API_TOKEN && process.env.KV_REST_API_TOKEN) {
    process.env.UPSTASH_REDIS_KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
  }

  return !!(url && token);
}

const memoryStoreKey = Symbol.for('pleia.profile.store');
const globalScope = globalThis as typeof globalThis & { [memoryStoreKey]?: Map<string, any> };
if (!globalScope[memoryStoreKey]) {
  globalScope[memoryStoreKey] = new Map();
}
const memoryStore = globalScope[memoryStoreKey]!;

async function getEmailByUsername(
  username: string,
  supabase?: Awaited<ReturnType<typeof createSupabaseRouteClient>>,
) {
  const normalized = sanitizeUsername(username);
  if (!normalized) return null;

  if (hasKV()) {
    try {
      const kv = await import('@vercel/kv');
      const emailFromKv = await kv.kv.get<string | null>(`username_index:${normalized}`);
      if (emailFromKv) return emailFromKv;
    } catch (error) {
      console.warn('[SOCIAL] KV username lookup failed:', error);
    }
  }

  for (const [email, profile] of memoryStore.entries()) {
    if (profile?.username === normalized) {
      return email;
    }
  }

  if (supabase) {
    const { data: playlistRow, error: playlistError } = await supabase
      .from('playlists')
      .select('user_email, username')
      .eq('username', normalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (playlistError) {
      console.warn('[SOCIAL] Playlist username lookup warning:', playlistError);
    }

    if (playlistRow?.user_email) {
      return playlistRow.user_email.toLowerCase();
    }
  }

  return null;
}

async function getProfileByEmail(email: string) {
  if (!email) return null;

  if (hasKV()) {
    try {
      const kv = await import('@vercel/kv');
      const profile = await kv.kv.get(`jey_user_profile:${email}`);
      if (profile) return profile;
    } catch (error) {
      console.warn('[SOCIAL] KV profile lookup failed:', error);
    }
  }

  return memoryStore.get(email) ?? null;
}

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

    const supabase = await createSupabaseRouteClient();

    let resolvedEmail: string | null = null;
    let resolvedUserId: string | null = null;
    let resolvedUsername: string | null = null;

    try {
      const resolution = await resolveFriendIdentity({ username: normalized });
      resolvedEmail = resolution.email?.toLowerCase() ?? null;
      resolvedUserId = resolution.userId ?? null;
      resolvedUsername = resolution.username ?? normalized;

      if (resolution.username && resolution.email) {
        const normalizedResolution = normalizeUsername(resolution.username);
        cacheUsernameMapping({
          username: normalizedResolution || normalized,
          email: resolution.email,
          userId: resolution.userId,
        }).catch(() => {});
      }
    } catch (error) {
      if (error instanceof FriendResolutionError) {
        console.warn('[SOCIAL] Username resolution fallback:', {
          code: error.details.code,
          username: normalized,
        });
      } else {
        console.warn('[SOCIAL] Unexpected resolution error:', error);
      }
    }

    if (!resolvedEmail) {
      resolvedEmail = await getEmailByUsername(normalized, supabase);
    }

    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const loweredEmail = resolvedEmail.toLowerCase();

    let userQuery = supabase
      .from('users')
      .select('id, plan, last_prompt_at, username');

    if (resolvedUserId) {
      userQuery = userQuery.eq('id', resolvedUserId);
    } else {
      userQuery = userQuery.eq('email', loweredEmail);
    }

    const { data: userRow, error: userError } = await userQuery.maybeSingle();

    if (userError) {
      console.warn('[SOCIAL] Supabase user lookup warning:', userError);
    }

    const profile = await getProfileByEmail(loweredEmail);
    const finalUserId = userRow?.id ?? resolvedUserId ?? null;
    const finalUsername =
      profile?.username ??
      userRow?.username ??
      resolvedUsername ??
      normalized;

    if (finalUsername && resolvedEmail) {
      cacheUsernameMapping({
        username: normalizeUsername(finalUsername) || normalized,
        email: resolvedEmail,
        userId: finalUserId,
      }).catch(() => {});
    }

    if (finalUserId && finalUsername) {
      try {
        const normalizedFinal = normalizeUsername(finalUsername) || finalUsername;
        const existingUsername = userRow?.username
          ? normalizeUsername(userRow.username)
          : null;

        if (existingUsername !== normalizeUsername(finalUsername)) {
          await supabase
            .from('users')
            .update({ username: normalizedFinal })
            .eq('id', finalUserId);
        }
      } catch (updateError) {
        console.warn('[SOCIAL] Failed to sync username to users table:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: finalUserId,
        email: resolvedEmail,
        username: finalUsername,
        displayName: profile?.displayName ?? finalUsername,
        image: profile?.image ?? null,
        bio: profile?.bio ?? null,
        plan: userRow?.plan ?? null,
        lastPromptAt: userRow?.last_prompt_at ?? null,
      },
    });
  } catch (error) {
    console.error('[SOCIAL] Profile lookup error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

