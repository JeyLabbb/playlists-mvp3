import { getSupabaseAdmin } from '../supabase/server';

const DEFAULT_FREE_LIMIT = parseInt(
  process.env.FREE_USES || process.env.FREE_USAGE_LIMIT || '5',
  10,
);

const UNLIMITED_PLANS = new Set(['founder', 'premium', 'monthly', 'hub']);

const PLAN_DEFAULT_LIMITS: Record<string, number> = {
  free: DEFAULT_FREE_LIMIT,
};

export type UsageIdentity = {
  userId?: string | null;
  email?: string | null;
};

export type UsageSummary = {
  used: number;
  remaining: number | 'unlimited';
  limit: number | null;
  allowed: boolean;
  unlimited: boolean;
  plan: string;
  source: 'users';
  lastPromptAt: string | null;
};

export type ConsumeResult =
  | {
      ok: true;
      usageId: string | null;
      unlimited: true;
      remaining: 'unlimited';
      used: number;
      plan: string;
      lastPromptAt: string | null;
    }
  | {
      ok: true;
      usageId: string | null;
      unlimited: false;
      remaining: number;
      used: number;
      plan: string;
      lastPromptAt: string | null;
    }
  | {
      ok: false;
      reason: 'identity_missing' | 'supabase_not_configured' | 'limit_exhausted';
      remaining: number;
      used: number;
      unlimited: boolean;
      plan: string;
    };

type NullableBoolean = boolean | null | undefined;

export type UserRow = {
  id: string;
  email: string;
  plan: string;
  usage_count: number;
  max_uses: number | null;
  is_founder?: NullableBoolean;
  is_early_founder_candidate?: NullableBoolean;
  newsletter_opt_in?: boolean | null;
  marketing_opt_in?: boolean | null;
  terms_accepted_at?: string | null;
  last_prompt_at?: string | null;
  username?: string | null;
};

type ColumnFlags = {
  is_founder: boolean;
  is_early_founder_candidate: boolean;
  newsletter_opt_in: boolean;
  marketing_opt_in: boolean;
  terms_accepted_at: boolean;
  last_prompt_at: boolean;
  username: boolean;
  created_at: boolean;
  updated_at: boolean;
};

let columnChecks: ColumnFlags | null = null;

async function detectColumns(supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (columnChecks) return columnChecks;

  columnChecks = {
    is_founder: false,
    is_early_founder_candidate: false,
    newsletter_opt_in: false,
    marketing_opt_in: false,
    terms_accepted_at: false,
    last_prompt_at: false,
    username: false,
    created_at: false,
    updated_at: false,
  };
  if (!supabase) return columnChecks;

  const check = async (column: keyof ColumnFlags) => {
    const { error } = await supabase.from('users').select(column).limit(1);
    if (!error) {
      columnChecks![column] = true;
      return;
    }
    if (error.code === '42703') {
      columnChecks![column] = false;
      return;
    }
    columnChecks![column] = false;
  };

  await Promise.all([
    check('is_founder'),
    check('is_early_founder_candidate'),
    check('newsletter_opt_in'),
    check('marketing_opt_in'),
    check('terms_accepted_at'),
    check('last_prompt_at'),
    check('username'),
    check('created_at'),
    check('updated_at'),
  ]);
  return columnChecks;
}

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase();
}

function generateUsername(email: string, userId?: string | null) {
  const local = (email.split('@')[0] || 'pleia')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .substring(0, 20) || 'pleia';

  const suffix = userId
    ? userId.replace(/[^a-z0-9]/gi, '').slice(0, 6)
    : Math.random().toString(36).slice(2, 6);

  return `${local}-${suffix}`.substring(0, 30);
}

export function resolveDefaultMaxUses(
  plan: string,
  explicitMaxUses: number | null | undefined,
) {
  if (explicitMaxUses !== null && explicitMaxUses !== undefined) {
    return explicitMaxUses > 0
      ? explicitMaxUses
      : PLAN_DEFAULT_LIMITS[plan] ?? PLAN_DEFAULT_LIMITS.free;
  }

  if (UNLIMITED_PLANS.has(plan)) {
    return null;
  }

  return PLAN_DEFAULT_LIMITS[plan] ?? PLAN_DEFAULT_LIMITS.free;
}

function isUnlimitedPlan(plan: string, maxUses: number | null) {
  return maxUses === null && UNLIMITED_PLANS.has(plan);
}

type EnsureOptions = {
  createIfMissing?: boolean;
};

async function ensureUser(
  identity: UsageIdentity,
  options: EnsureOptions = {},
): Promise<UserRow | null> {
  const { createIfMissing = true } = options;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[USAGE] Supabase admin client not configured');
    return null;
  }

  const email = normalizeEmail(identity.email);
  const userId = identity.userId || null;

  if (!userId && !email) {
    console.warn('[USAGE] Missing user identity (id/email)');
    return null;
  }

  try {
    const columns = await detectColumns(supabase);
    const selectFields = [
      'id',
      'email',
      'plan',
      'usage_count',
      'max_uses',
      columns?.is_founder ? 'is_founder' : undefined,
      columns?.is_early_founder_candidate ? 'is_early_founder_candidate' : undefined,
      columns?.newsletter_opt_in ? 'newsletter_opt_in' : undefined,
      columns?.marketing_opt_in ? 'marketing_opt_in' : undefined,
      columns?.terms_accepted_at ? 'terms_accepted_at' : undefined,
      columns?.last_prompt_at ? 'last_prompt_at' : undefined,
      columns?.username ? 'username' : undefined,
    ]
      .filter(Boolean)
      .join(', ');

    let query = supabase
      .from('users')
      .select(selectFields);

    if (userId) {
      query = query.eq('id', userId);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data } = await query.maybeSingle();
    let existingUser = (data ?? null) as UserRow | null;
    if (existingUser) {
      if ((!existingUser.username || existingUser.username.length === 0) && columns?.username && email) {
        const generated = generateUsername(email, userId || existingUser.id);
        await supabase.from('users').update({ username: generated }).eq('id', existingUser.id);
        existingUser = { ...existingUser, username: generated };
      }
      return existingUser;
    }

    if (!createIfMissing) {
      return null;
    }

    const now = new Date().toISOString();
    const insertPayload: Record<string, any> & { email: string } = {
      email: email,
      plan: 'free',
      usage_count: 0,
      max_uses: DEFAULT_FREE_LIMIT,
    };

    if (columns?.is_founder) {
      insertPayload.is_founder = false;
    }
    if (columns?.newsletter_opt_in) {
      insertPayload.newsletter_opt_in = false;
    }
    if (columns?.marketing_opt_in) {
      insertPayload.marketing_opt_in = false;
    }
    if (columns?.terms_accepted_at) {
      insertPayload.terms_accepted_at = null;
    }
    if (columns?.last_prompt_at) {
      insertPayload.last_prompt_at = null;
    }
    if (columns?.username && email) {
      insertPayload.username = generateUsername(email, userId);
    }
    if (columns?.created_at) {
      insertPayload.created_at = now;
    }
    if (columns?.updated_at) {
      insertPayload.updated_at = now;
    }
    
    // 🚨 CRITICAL: Asignar is_early_founder_candidate solo a los primeros 1000 usuarios
    if (columns?.is_early_founder_candidate) {
      try {
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_early_founder_candidate', true);
        
        const currentCount = count || 0;
        
        if (countError) {
          console.warn('[USAGE] Error counting early founder candidates:', countError);
          insertPayload.is_early_founder_candidate = false;
        } else if (currentCount < 1000) {
          insertPayload.is_early_founder_candidate = true;
          console.log('[USAGE] ✅ Assigning is_early_founder_candidate = true (count: ' + currentCount + '/1000)');
        } else {
          insertPayload.is_early_founder_candidate = false;
          console.log('[USAGE] ⚠️ Not assigning is_early_founder_candidate (limit reached: ' + currentCount + '/1000)');
        }
      } catch (countErr) {
        console.error('[USAGE] Error checking early founder candidate count:', countErr);
        insertPayload.is_early_founder_candidate = false;
      }
    }

    if (userId) {
      insertPayload.id = userId;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert(insertPayload as any)
      .select(selectFields)
      .maybeSingle();

    if (insertError) {
      if (insertError.code === '23505' && email) {
        console.warn('[USAGE] Duplicate user insert detected, attempting recovery via email lookup');
        const { data: duplicate } = await supabase
          .from('users')
          .select(selectFields)
          .eq('email', email)
          .maybeSingle();
        if (duplicate) {
          return duplicate as UserRow;
        }
      }
      console.warn('[USAGE] Failed to insert user row:', insertError);
      return null;
    }

    return (inserted ?? null) as UserRow | null;
  } catch (error) {
    console.error('[USAGE] ensureUser error:', error);
    return null;
  }
}

function buildSummary(row: UserRow): UsageSummary {
  const plan = row.plan || 'free';
  const maxUses = resolveDefaultMaxUses(plan, row.max_uses);
  const unlimited = isUnlimitedPlan(plan, maxUses);

  const limit = unlimited ? null : maxUses ?? DEFAULT_FREE_LIMIT;
  const used = row.usage_count ?? 0;
  const remaining = unlimited ? 'unlimited' : Math.max(0, (limit ?? DEFAULT_FREE_LIMIT) - used);

  return {
    used,
    remaining,
    limit,
    allowed: unlimited || (typeof remaining === 'number' && remaining > 0),
    unlimited,
    plan,
    source: 'users',
    lastPromptAt: row.last_prompt_at,
  };
}

export function getUsageLimit() {
  return DEFAULT_FREE_LIMIT;
}

export function getUsageWindowDays() {
  // The new model works with static quotas instead of rolling windows.
  return null;
}

export async function getUsageSummary(identityOrEmail: UsageIdentity | string) {
  const identity: UsageIdentity =
    typeof identityOrEmail === 'string'
      ? { email: identityOrEmail }
      : identityOrEmail;

  const row = await ensureUser(identity);
  if (!row) {
    return {
      used: 0,
      remaining: DEFAULT_FREE_LIMIT,
      limit: DEFAULT_FREE_LIMIT,
      allowed: true,
      unlimited: false,
      plan: 'free',
      source: 'users',
      lastPromptAt: null,
    } as UsageSummary;
  }

  return buildSummary(row);
}

export async function getOrCreateUsageUser(identityOrEmail: UsageIdentity | string) {
  const identity: UsageIdentity =
    typeof identityOrEmail === 'string' ? { email: identityOrEmail } : identityOrEmail;
  return ensureUser(identity);
}

export async function findUsageUser(identityOrEmail: UsageIdentity | string) {
  const identity: UsageIdentity =
    typeof identityOrEmail === 'string' ? { email: identityOrEmail } : identityOrEmail;
  return ensureUser(identity, { createIfMissing: false });
}

export async function getUserPlan(identityOrEmail: UsageIdentity | string) {
  const identity: UsageIdentity =
    typeof identityOrEmail === 'string'
      ? { email: identityOrEmail }
      : identityOrEmail;
  const row = await ensureUser(identity);

  if (!row) {
    return {
      plan: 'free',
      isFounder: false,
      isMonthly: false,
      unlimited: false,
      since: null,
      source: 'users',
    };
  }

  const plan = row.plan || 'free';
  return {
    plan,
    isFounder: plan === 'founder' || row.is_founder === true,
    isMonthly: plan === 'monthly',
    unlimited: isUnlimitedPlan(plan, resolveDefaultMaxUses(plan, row.max_uses)),
    since: row.last_prompt_at,
    source: 'users',
    // Exponemos el flag para early-founder (primeros 1000)
    isEarlyFounderCandidate: (row as any).is_early_founder_candidate === true,
  };
}

export async function consumeUsage(
  identityOrEmail: UsageIdentity | string,
  meta: Record<string, any> = {},
): Promise<ConsumeResult> {
  const identity: UsageIdentity =
    typeof identityOrEmail === 'string'
      ? { email: identityOrEmail }
      : identityOrEmail;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false,
      reason: 'supabase_not_configured',
      remaining: DEFAULT_FREE_LIMIT,
      used: 0,
      unlimited: false,
      plan: 'free',
    };
  }

  const row = await ensureUser(identity);
  if (!row) {
    return {
      ok: false,
      reason: 'identity_missing',
      remaining: DEFAULT_FREE_LIMIT,
      used: 0,
      unlimited: false,
      plan: 'free',
    };
  }

  const plan = row.plan || 'free';
  const maxUses = resolveDefaultMaxUses(plan, row.max_uses);
  const unlimited = isUnlimitedPlan(plan, maxUses);
  const now = new Date().toISOString();

  if (unlimited) {
    const usageEventId = await insertUsageEvent(supabase, row, meta, now);
    return {
      ok: true,
      usageId: usageEventId,
      unlimited: true,
      remaining: 'unlimited',
      used: row.usage_count ?? 0,
      plan,
      lastPromptAt: row.last_prompt_at,
    };
  }

  const limit = maxUses ?? DEFAULT_FREE_LIMIT;
  const used = row.usage_count ?? 0;
  const remainingBefore = Math.max(0, limit - used);

  if (remainingBefore <= 0) {
    return {
      ok: false,
      reason: 'limit_exhausted',
      remaining: 0,
      used,
      unlimited: false,
      plan,
    };
  }

  const newUsed = used + 1;
  const newLastPromptAt = now;

  const columns = await detectColumns(supabase);
  const updatePayload: Partial<UserRow> & { updated_at?: string; last_prompt_at?: string | null } = {
    usage_count: newUsed,
  };
  if (columns?.last_prompt_at) {
    updatePayload.last_prompt_at = newLastPromptAt;
  }
  if (columns?.updated_at) {
    updatePayload.updated_at = now;
  }

  const { data: updatedRow, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', row.id)
    .eq('usage_count', used)
    .select('usage_count')
    .maybeSingle();

  if (error) {
    console.warn('[USAGE] Failed to update usage counter:', error);
  }

  if (!updatedRow) {
    console.warn('[USAGE] Usage update skipped due to concurrent update or exhausted limit');
    return {
      ok: false,
      reason: 'limit_exhausted',
      remaining: Math.max(0, limit - used),
      used,
      unlimited: false,
      plan,
    };
  }

  const usageEventId = await insertUsageEvent(supabase, row, meta, now);
  const remaining = Math.max(0, limit - newUsed);

  return {
    ok: true,
    usageId: usageEventId,
    unlimited: false,
    remaining,
    used: newUsed,
    plan,
    lastPromptAt: newLastPromptAt,
  };
}

export async function refundUsage(
  identityOrEmail: UsageIdentity | string,
  usageId?: string | null,
) {
  const identity: UsageIdentity =
    typeof identityOrEmail === 'string'
      ? { email: identityOrEmail }
      : identityOrEmail;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, reason: 'supabase_not_configured' as const };
  }

  const row = await ensureUser(identity);
  if (!row) {
    return { ok: false, reason: 'identity_missing' as const };
  }

  if (usageId) {
    await supabase.from('usage_events').delete().eq('id', usageId);
  }

  const plan = row.plan || 'free';
  const maxUses = resolveDefaultMaxUses(plan, row.max_uses);
  const unlimited = isUnlimitedPlan(plan, maxUses);

  if (unlimited) {
    return {
      ok: true,
      unlimited: true,
      remaining: 'unlimited' as const,
      used: row.usage_count ?? 0,
      plan,
    };
  }

  const limit = maxUses ?? DEFAULT_FREE_LIMIT;
  const used = Math.max(0, (row.usage_count ?? 0) - 1);
  const remaining = Math.max(0, limit - used);
  const now = new Date().toISOString();

  await supabase
    .from('users')
    .update(
      {
        usage_count: used,
        updated_at: now,
      } as Partial<UserRow> & { updated_at: string },
    )
    .eq('id', row.id);

  return {
    ok: true,
    unlimited: false,
    remaining,
    used,
    plan,
  };
}

export async function setUserPlan(
  identityOrEmail: UsageIdentity | string,
  plan: string,
  options: {
    maxUses?: number | null;
    isFounder?: boolean;
    newsletterOptIn?: boolean;
    since?: string | Date | null;
  } = {},
) {
  const identity: UsageIdentity =
    typeof identityOrEmail === 'string'
      ? { email: identityOrEmail }
      : identityOrEmail;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, reason: 'supabase_not_configured' as const };
  }

  const row = await ensureUser(identity);
  if (!row) {
    return { ok: false, reason: 'identity_missing' as const };
  }

  const targetMaxUses = resolveDefaultMaxUses(plan, options.maxUses);
  const unlimited = isUnlimitedPlan(plan, targetMaxUses);

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('users')
    .update(
      {
        plan,
        max_uses: targetMaxUses,
        is_founder: options.isFounder ?? (plan === 'founder'),
        newsletter_opt_in:
          typeof options.newsletterOptIn === 'boolean'
            ? options.newsletterOptIn
            : row.newsletter_opt_in,
        updated_at: now,
        last_prompt_at: options.since ? new Date(options.since).toISOString() : row.last_prompt_at,
      } as Partial<UserRow> & {
        updated_at: string;
        last_prompt_at: string | null;
        plan: string;
        max_uses: number | null;
        is_founder: boolean;
        newsletter_opt_in: boolean;
      },
    )
    .eq('id', row.id);

  if (error) {
    console.warn('[USAGE] Failed to set user plan:', error);
    return { ok: false, reason: 'update_failed' as const };
  }

  return {
    ok: true,
    plan,
    unlimited,
    maxUses: targetMaxUses,
    updatedAt: now,
  };
}

export const __test = {
  PLAN_DEFAULT_LIMITS,
  buildSummary,
  isUnlimitedPlan,
};

async function insertUsageEvent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: UserRow,
  meta: Record<string, any>,
  createdAtIso: string,
) {
  try {
    const { data, error } = await supabase
      .from('usage_events')
      .insert({
        user_id: row.id,
        user_email: row.email,
        action: 'generate_playlist',
        meta,
        created_at: createdAtIso,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.warn('[USAGE] Failed to insert usage event:', error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.warn('[USAGE] Error inserting usage event:', error);
    return null;
  }
}


