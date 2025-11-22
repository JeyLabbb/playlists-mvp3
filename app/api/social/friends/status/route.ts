import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

const schema = z.object({
  username: z.string().min(1).optional(),
  friendId: z.string().uuid().optional(),
  friendEmail: z.string().email().optional(),
});

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

async function getEmailByUsername(username: string) {
  const normalized = sanitizeUsername(username);
  if (!normalized) return null;

  if (hasKV()) {
    try {
      const kv = await import('@vercel/kv');
      const email = await kv.kv.get<string | null>(`username_index:${normalized}`);
      if (email) return email;
    } catch (error) {
      console.warn('[SOCIAL] KV username lookup failed:', error);
    }
  }

  for (const [email, profile] of memoryStore.entries()) {
    if (profile?.username === normalized) {
      return email;
    }
  }

  return null;
}

async function resolveTarget(supabase: ReturnType<typeof createSupabaseRouteClient>, { friendId, friendEmail, username }: { friendId?: string | null; friendEmail?: string | null; username?: string | null }) {
  if (friendId) return friendId;

  let email = friendEmail?.toLowerCase() ?? null;
  if (!email && username) {
    email = await getEmailByUsername(username);
  }
  if (!email) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[SOCIAL] resolve target error:', error);
    throw new Error('lookup-failed');
  }

  return data?.id ?? null;
}

export async function GET(request: Request) {
  try {
    const pleiaUser = await getPleiaServerUser();
    const userId = pleiaUser?.id;
    const userEmail = pleiaUser?.email?.toLowerCase();

    if (!userId || !userEmail) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
      username: searchParams.get('username') ?? undefined,
      friendId: searchParams.get('friendId') ?? undefined,
      friendEmail: searchParams.get('friendEmail') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid query' }, { status: 400 });
    }

    const supabase = await createSupabaseRouteClient();

    let targetId: string | null = null;
    try {
      targetId = await resolveTarget(supabase, parsed.data);
    } catch (err) {
      if ((err as Error).message === 'lookup-failed') {
        return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
      }
      throw err;
    }

    if (!targetId) {
      return NextResponse.json({ success: true, relationship: 'none', friendId: null });
    }

    if (targetId === userId) {
      return NextResponse.json({ success: true, relationship: 'self', friendId: targetId });
    }

    const [{ data: friendRow }, { data: requestRows }] = await Promise.all([
      supabase
        .from('friends')
        .select('id')
        .eq('user_id', userId)
        .eq('friend_id', targetId)
        .maybeSingle(),
      supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${userId})`),
    ]);

    if (friendRow) {
      return NextResponse.json({ success: true, relationship: 'friends', friendId: targetId });
    }

    const pending = requestRows?.find((row) => row.status === 'pending');
    if (pending) {
      if (pending.sender_id === userId) {
        return NextResponse.json({ success: true, relationship: 'requested', friendId: targetId });
      }
      return NextResponse.json({ success: true, relationship: 'incoming', requestId: pending.id, friendId: targetId });
    }

    return NextResponse.json({ success: true, relationship: 'none', friendId: targetId });
  } catch (error) {
    console.error('[SOCIAL] Status error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

