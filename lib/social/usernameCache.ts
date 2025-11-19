import type { Redis } from '@upstash/redis';

const USERNAME_INDEX_PREFIX = 'username_index:';
const USERNAME_ID_PREFIX = 'username_id:';

export type UsernameCachePayload = {
  username: string;
  email?: string | null;
  userId?: string | null;
};

export function normalizeUsername(username?: string | null) {
  if (!username) return '';
  return username.toLowerCase().replace(/[^a-z0-9._-]/g, '').substring(0, 30);
}

function hasKvSupport() {
  return (
    !!process.env.UPSTASH_REDIS_KV_REST_API_URL ||
    !!process.env.KV_REST_API_URL
  );
}

async function loadKv() {
  if (!hasKvSupport()) return null;

  try {
    const kvModule = await import('@vercel/kv');
    return kvModule.kv;
  } catch (error) {
    console.warn('[SOCIAL] Unable to load KV client:', error);
    return null;
  }
}

export async function cacheUsernameMapping(payload: UsernameCachePayload) {
  const normalized = normalizeUsername(payload.username);
  if (!normalized) return false;

  const kv = await loadKv();
  if (!kv) return false;

  const pipeline = (kv as Redis).pipeline();

  if (payload.email) {
    pipeline.set(`${USERNAME_INDEX_PREFIX}${normalized}`, payload.email);
  }
  if (payload.userId) {
    pipeline.set(`${USERNAME_ID_PREFIX}${normalized}`, payload.userId);
  }

  try {
    await pipeline.exec();
    return true;
  } catch (error) {
    console.warn('[SOCIAL] Failed to cache username mapping:', error);
    return false;
  }
}

export async function getCachedUsernameMapping(username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return { email: null as string | null, userId: null as string | null };
  }

  const kv = await loadKv();
  if (!kv) {
    return { email: null as string | null, userId: null as string | null };
  }

  try {
    const [email, userId] = await Promise.all([
      kv.get<string | null>(`${USERNAME_INDEX_PREFIX}${normalized}`),
      kv.get<string | null>(`${USERNAME_ID_PREFIX}${normalized}`),
    ]);

    return {
      email: email ?? null,
      userId: userId ?? null,
    };
  } catch (error) {
    console.warn('[SOCIAL] Failed to read username mapping from KV:', error);
    return { email: null as string | null, userId: null as string | null };
  }
}


