/**
 * Backfill username → email/userId mappings into KV.
 *
 * Usage:
 *   npx tsx scripts/backfill/username-index.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';
import { normalizeUsername } from '../../lib/social/usernameCache';

type UserRecord = {
  id: string;
  email: string | null;
  username: string | null;
};

async function loadKv(): Promise<Redis | null> {
  try {
    const kvModule = await import('@vercel/kv');
    return kvModule.kv as unknown as Redis;
  } catch (error) {
    console.error('[BACKFILL] Failed to load KV client. Set KV_REST_API_URL and KV_REST_API_TOKEN.', error);
    return null;
  }
}

async function main() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_TOKEN;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.',
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const kv = await loadKv();
  if (!kv) {
    throw new Error('KV client unavailable. Aborting.');
  }

  const batchSize = parseInt(process.env.BACKFILL_BATCH_SIZE || '500', 10);
  let processed = 0;
  let page = 0;

  console.log('[BACKFILL] Starting username index backfill…');

  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username')
      .order('id', { ascending: true })
      .range(page * batchSize, page * batchSize + batchSize - 1);

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    const pipeline = kv.pipeline();
    let writes = 0;

    for (const row of data as UserRecord[]) {
      const normalized = normalizeUsername(row.username);
      const email = row.email?.toLowerCase();
      if (!normalized || !email || !row.id) continue;

      pipeline.set(`username_index:${normalized}`, email);
      pipeline.set(`username_id:${normalized}`, row.id);
      writes += 2;
    }

    if (writes > 0) {
      await pipeline.exec();
    }

    processed += data.length;
    page += 1;

    console.log(
      `[BACKFILL] Processed ${processed} users (batch ${page}, writes=${writes})`,
    );

    // Basic rate limiting to avoid overwhelming KV
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.log('[BACKFILL] Completed username index backfill.');
}

main().catch((error) => {
  console.error('[BACKFILL] Username index backfill failed:', error);
  process.exitCode = 1;
});


