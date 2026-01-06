import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import {
  cacheUsernameMapping,
  getCachedUsernameMapping,
  normalizeUsername,
} from './usernameCache';

type SupabaseClientLike = SupabaseClient<any, any, any>;

const PLACEHOLDER_EMAIL_REGEX = /@example\.com$/i;

export type ResolveInput = {
  friendId?: string;
  friendEmail?: string;
  username?: string;
};

export type ResolveOutput = {
  userId: string;
  email: string;
  username?: string | null;
  source: 'id' | 'email' | 'username-db' | 'username-kv';
};

export class FriendResolutionError extends Error {
  public details: { tried: string[]; input: ResolveInput; code: 'USER_RESOLUTION_FAILED' };

  constructor(
    public detail: { tried: string[]; input: ResolveInput; code: 'USER_RESOLUTION_FAILED' },
  ) {
    super('USER_RESOLUTION_FAILED');
    this.name = 'FriendResolutionError';
    this.details = detail;
  }
}

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase();
}

function isUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isPlaceholderEmail(email?: string | null) {
  return !email || PLACEHOLDER_EMAIL_REGEX.test(email);
}

async function fetchSingle<Row>(
  query: any,
): Promise<Row | null> {
  try {
    const { data, error } = await query.maybeSingle();
    if (error) return null;
    return (data ?? null) as Row | null;
  } catch {
    return null;
  }
}

async function resolveById(
  supabase: SupabaseClientLike,
  friendId?: string,
): Promise<ResolveOutput | null> {
  if (!isUuid(friendId)) return null;

  const user = await fetchSingle<{ id: string; email: string | null; username: string | null }>(
    supabase.from('users').select('id, email, username').eq('id', friendId!),
  );

  if (!user?.id || isPlaceholderEmail(user.email)) {
    return null;
  }

  if (user.username) {
    await cacheUsernameMapping({
      username: user.username,
      email: user.email!,
      userId: user.id,
    }).catch(() => {});
  }

  return {
    userId: user.id,
    email: normalizeEmail(user.email),
    username: user.username,
    source: 'id',
  };
}

async function resolveByEmail(
  supabase: SupabaseClientLike,
  email?: string,
): Promise<ResolveOutput | null> {
  const normalized = normalizeEmail(email);
  if (!normalized || isPlaceholderEmail(normalized)) return null;

  const user = await fetchSingle<{ id: string; email: string | null; username: string | null }>(
    supabase.from('users').select('id, email, username').eq('email', normalized),
  );

  if (!user?.id || isPlaceholderEmail(user.email)) {
    return null;
  }

  if (user.username) {
    await cacheUsernameMapping({
      username: user.username,
      email: normalized,
      userId: user.id,
    }).catch(() => {});
  }

  return {
    userId: user.id,
    email: normalized,
    username: user.username,
    source: 'email',
  };
}

async function resolveByUsernameDb(
  supabase: SupabaseClientLike,
  username?: string,
): Promise<ResolveOutput | null> {
  // Usar username tal cual (solo sanitizar para búsqueda, no normalizar que quite sufijos)
  const sanitized = (username || '').toLowerCase().trim().replace(/[^a-z0-9._-]/g, '').substring(0, 30);
  if (!sanitized) return null;

  // Buscar por username exacto (case-insensitive) - NO normalizar
  const user = await fetchSingle<{ id: string; email: string | null; username: string | null }>(
    supabase
      .from('users')
      .select('id, email, username')
      .ilike('username', sanitized), // Case-insensitive search
  );

  if (user?.id && !isPlaceholderEmail(user.email)) {
    const email = normalizeEmail(user.email);
    // Usar el username tal cual está en Supabase (sin normalizar)
    const actualUsername = user.username || sanitized;
    await cacheUsernameMapping({
      username: actualUsername,
      email,
      userId: user.id,
    }).catch(() => {});

    return {
      userId: user.id,
      email,
      username: actualUsername, // Username tal cual en Supabase
      source: 'username-db',
    };
  }

  const playlistOwner = await fetchSingle<{
    user_id: string | null;
    user_email: string | null;
  }>(
    supabase
      .from('playlists')
      .select('user_id, user_email')
      .eq('user_email', `${sanitized}@example.com`),
  );

  if (playlistOwner?.user_id && !isPlaceholderEmail(playlistOwner.user_email)) {
    const byId = await resolveById(supabase, playlistOwner.user_id);
    if (byId) {
      return { ...byId, source: 'username-db' };
    }
  }

  return null;
}

async function resolveByUsernameKv(
  supabase: SupabaseClientLike,
  username?: string,
): Promise<ResolveOutput | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return null;

  const cached = await getCachedUsernameMapping(normalizedUsername);
  if (!cached.userId && !cached.email) return null;

  if (cached.userId) {
    const byId = await resolveById(supabase, cached.userId);
    if (byId) {
      return { ...byId, source: 'username-kv' };
    }
  }

  if (cached.email) {
    const byEmail = await resolveByEmail(supabase, cached.email);
    if (byEmail) {
      return { ...byEmail, source: 'username-kv' };
    }
  }

  return null;
}

async function ensureSupabaseClient(provided?: SupabaseClientLike | null) {
  if (provided) return provided;

  const admin = getSupabaseAdmin();
  if (admin) return admin;

  try {
    return await createSupabaseRouteClient();
  } catch (error) {
    console.warn('[SOCIAL] Failed to create Supabase route client for resolution:', error);
    return null;
  }
}

export async function resolveFriendId(
  input: ResolveInput,
  options: { supabase?: SupabaseClient | null } = {},
): Promise<ResolveOutput> {
  const tried: string[] = [];
  const supabase = await ensureSupabaseClient(options.supabase);

  if (!supabase) {
    throw new FriendResolutionError({ tried, input, code: 'USER_RESOLUTION_FAILED' });
  }

  const resultFromId = await resolveById(supabase, input.friendId);
  if (resultFromId) return resultFromId;
  tried.push('id');

  const resultFromEmail = await resolveByEmail(supabase, input.friendEmail);
  if (resultFromEmail) return resultFromEmail;
  tried.push('email');

  const resultFromDbUsername = await resolveByUsernameDb(supabase, input.username);
  if (resultFromDbUsername) return resultFromDbUsername;
  tried.push('username-db');

  const resultFromKv = await resolveByUsernameKv(supabase, input.username);
  if (resultFromKv) return resultFromKv;
  tried.push('username-kv');

  throw new FriendResolutionError({ tried, input, code: 'USER_RESOLUTION_FAILED' });
}

export const __test = {
  normalizeEmail,
  isUuid,
  resolveByUsernameDb,
};


