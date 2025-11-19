#!/usr/bin/env tsx
/**
 * Diagnostic script to inspect usage limits and social data consistency.
 *
 * Usage:
 *   npx tsx scripts/diagnostics/triage_social_usage.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config();
import { getSupabaseAdmin } from '../../lib/supabase/server';
import { getUsageSummary } from '../../lib/billing/usageV2';
import { normalizeUsername } from '../../lib/social/usernameCache';

async function loadKv() {
  try {
    const kvModule = await import('@vercel/kv');
    return kvModule.kv;
  } catch (error) {
    console.warn('[TRIAGE] KV client unavailable:', error?.message ?? error);
    return null;
  }
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function printUsageDiagnostics() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[TRIAGE] Supabase admin client is not configured.');
    return;
  }

  printSection('USAGE · Usuarios free con max_uses NULL/<=0');
  const { data: freeUsers } = await supabase
    .from('users')
    .select('id, email, plan, usage_count, max_uses')
    .eq('plan', 'free')
    .or('max_uses.is.null,max_uses.lte.0')
    .limit(20);

  (freeUsers || []).forEach((row, index) => {
    const email = row.email?.replace(/(.{3}).*@/, '$1***@');
    console.log(
      `${index + 1}. id=${row.id?.slice(0, 8)}… plan=${row.plan} usage=${row.usage_count} max_uses=${row.max_uses}`,
      email ? `email=${email}` : '',
    );
  });

  printSection('USAGE · Conteo por plan con max_uses NULL');
  const { data: planRows } = await supabase
    .from('users')
    .select('plan')
    .is('max_uses', null);

  const planCounts = new Map<string, number>();
  (planRows || []).forEach((row) => {
    if (!row?.plan) return;
    planCounts.set(row.plan, (planCounts.get(row.plan) ?? 0) + 1);
  });

  if (planCounts.size === 0) {
    console.log('No plans with max_uses = NULL');
  } else {
    for (const [plan, count] of planCounts) {
      console.log(`plan=${plan} count=${count}`);
    }
  }

  printSection('USAGE · getUsageSummary samples');
  const samples = {
    freeNull: await supabase
      .from('users')
      .select('id, email')
      .eq('plan', 'free')
      .is('max_uses', null)
      .maybeSingle(),
    freeFinite: await supabase
      .from('users')
      .select('id, email')
      .eq('plan', 'free')
      .gt('max_uses', 0)
      .maybeSingle(),
    founder: await supabase
      .from('users')
      .select('id, email')
      .eq('plan', 'founder')
      .maybeSingle(),
  };

  for (const [label, result] of Object.entries(samples)) {
    const record = result?.data;
    if (!record?.id) {
      console.log(`${label}: no sample found`);
      continue;
    }

    const summary = await getUsageSummary({
      userId: record.id,
      email: record.email,
    });

    console.log(
      `${label}: limit=${summary.limit} remaining=${summary.remaining} unlimited=${summary.unlimited} plan=${summary.plan}`,
    );
  }
}

async function printSocialDiagnostics() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  printSection('SOCIAL · Playlists sin user_id/user_email');
  const { data: orphanPlaylists } = await supabase
    .from('playlists')
    .select('id, playlist_name, user_id, user_email, prompt')
    .is('user_id', null)
    .limit(20);

  (orphanPlaylists || []).forEach((row, index) => {
    const username = normalizeUsername(row.playlist_name || row.prompt || undefined);
    console.log(
      `${index + 1}. playlist=${row.id?.slice(0, 8)}… username=${username || 'unknown'} email=${row.user_email ?? 'null'}`,
    );
  });

  const usernames = (orphanPlaylists || [])
    .map((row) => normalizeUsername(row.playlist_name || row.prompt || undefined))
    .filter(Boolean) as string[];

  if (usernames.length) {
    printSection('SOCIAL · Resolución en users.username');
    const { data: usersByUsername } = await supabase
      .from('users')
      .select('id, email, username')
      .in('username', usernames);

    const map = new Map(
      (usersByUsername || []).map((row) => [normalizeUsername(row.username) || '', row]),
    );

    usernames.forEach((username) => {
      const row = map.get(username);
      if (row) {
        console.log(
          `${username}: userId=${row.id?.slice(0, 8)}… email=${row.email?.replace(/(.{3}).*@/, '$1***@')}`,
        );
      } else {
        console.log(`${username}: no match in users.username`);
      }
    });
  }

  const kv = await loadKv();
  if (kv && usernames.length) {
    printSection('SOCIAL · KV username_index / username_id');
    for (const username of usernames) {
      const [email, userId] = await Promise.all([
        kv.get<string | null>(`username_index:${username}`),
        kv.get<string | null>(`username_id:${username}`),
      ]);
      console.log(
        `${username}: kvEmail=${email ? email.replace(/(.{3}).*@/, '$1***@') : 'null'} kvUser=${userId ? `${userId.slice(0, 8)}…` : 'null'}`,
      );
    }
  }
}

async function printTrendingPayload() {
  printSection('TRENDING · Payload (10 items)');

  const url =
    process.env.TRENDING_ENDPOINT ||
    'http://localhost:3000/api/trending?limit=10&enrich=1';

  try {
    const response = await fetch(url);
    const json = await response.json();
    const playlists = Array.isArray(json.playlists) ? json.playlists : [];

    playlists.slice(0, 10).forEach((playlist: any, index: number) => {
      const author = playlist.author || {};
      const username = author.username || 'unknown';
      const email = author.email
        ? author.email.replace(/(.{3}).*@/, '$1***@')
        : 'null';
      const userId = author.userId ? `${author.userId.slice(0, 8)}…` : 'null';
      const placeholder =
        !author.email || /@example\.com$/i.test(author.email) ? 'placeholder' : 'real';

      console.log(
        `${index + 1}. playlist=${playlist.playlistId || playlist.id} author.username=${username} author.email=${email} author.userId=${userId} (${placeholder})`,
      );
    });
  } catch (error) {
    console.error('[TRIAGE] Failed to fetch trending payload:', error);
  }
}

async function main() {
  await printUsageDiagnostics();
  await printSocialDiagnostics();
  await printTrendingPayload();
}

main().catch((error) => {
  console.error('[TRIAGE] Unhandled error:', error);
  process.exitCode = 1;
});


