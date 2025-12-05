import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { normalizeUsername } from '../../lib/social/usernameCache';

type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
};

type PlaylistRow = Record<string, any>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CANDIDATE_FIELDS = [
  'username',
  'creator_username',
  'author_username',
  'owner_username',
  'creator',
  'owner',
];

function buildFallbackUsername(email: string | null | undefined) {
  if (!email) return null;
  const local = email.split('@')[0] ?? '';
  return normalizeUsername(local);
}

function pickUsernameFromPlaylist(row: PlaylistRow) {
  for (const field of CANDIDATE_FIELDS) {
    if (field in row && row[field]) {
      const normalized = normalizeUsername(row[field]);
      if (normalized) return normalized;
    }
  }
  if (row.playlist_name) {
    const normalized = normalizeUsername(row.playlist_name);
    if (normalized) return normalized;
  }
  if (row.prompt) {
    const normalized = normalizeUsername(row.prompt);
    if (normalized) return normalized;
  }
  return null;
}

async function fetchPlaylistsByUser(userId: string | null, email: string | null) {
  if (userId) {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .limit(20);
    if (!error && data && data.length) {
      return data;
    }
  }

  if (email) {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .ilike('user_email', email.toLowerCase());
    if (!error && data && data.length) {
      return data;
    }
  }

  return [];
}

async function updateUserUsername(userId: string, username: string) {
  const { error } = await supabase
    .from('users')
    .update({ username })
    .eq('id', userId);
  if (error) {
    throw new Error(`Failed to update username for ${userId}: ${error.message}`);
  }
}

async function main() {
  console.log('[BACKFILL] Loading users…');
  const batchSize = 500;
  let from = 0;
  const desiredUsernames = new Map<string, string>(); // userId -> username
  const used = new Set<string>(); // lower-case username

  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('id,email,username')
      .order('id')
      .range(from, from + batchSize - 1);

    if (error) {
      throw new Error(`Failed to load users: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    console.log(`[BACKFILL] Processing users ${from} – ${from + data.length - 1}`);

    for (const user of data as UserRow[]) {
      const current = normalizeUsername(user.username);
      if (current) {
        const lower = current.toLowerCase();
        if (used.has(lower)) continue;
        desiredUsernames.set(user.id, current);
        used.add(lower);
        continue;
      }

      const playlists = await fetchPlaylistsByUser(user.id, user.email);
      let candidate = null as string | null;
      for (const playlist of playlists) {
        candidate = pickUsernameFromPlaylist(playlist);
        if (candidate) break;
      }

      if (!candidate) {
        candidate = buildFallbackUsername(user.email);
      }

      if (!candidate) {
        console.warn(`[BACKFILL] Could not derive username for user ${user.id} (${user.email})`);
        continue;
      }

      let final = candidate;
      let lower = final.toLowerCase();
      const suffix = user.id.split('-')[0]?.slice(0, 6) ?? '';
      let attempts = 0;
      while (used.has(lower)) {
        attempts += 1;
        final = `${candidate}-${suffix}${attempts > 1 ? attempts : ''}`.slice(0, 30);
        lower = final.toLowerCase();
        if (attempts > 5) {
          final = `${candidate}-${Date.now()}`.slice(0, 30);
          lower = final.toLowerCase();
          break;
        }
      }

      desiredUsernames.set(user.id, final);
      used.add(lower);
    }

    from += data.length;
  }

  console.log(`[BACKFILL] Updating ${desiredUsernames.size} users…`);
  let updated = 0;
  for (const [userId, username] of desiredUsernames.entries()) {
    await updateUserUsername(userId, username);
    updated += 1;
    if (updated % 50 === 0) {
      console.log(`[BACKFILL] Updated ${updated}`);
    }
  }

  console.log(`[BACKFILL] Completed. Total updated: ${updated}`);
}

main().catch((error) => {
  console.error('[BACKFILL] Failed:', error);
  process.exitCode = 1;
});


