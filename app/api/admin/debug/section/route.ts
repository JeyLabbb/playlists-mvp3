import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SectionKey = 'prompts' | 'usage' | 'playlists' | 'payments';

const SECTION_CONFIG: Record<
  SectionKey,
  { table: string; dateColumn: string }
> = {
  prompts: {
    table: 'prompts',
    dateColumn: 'created_at',
  },
  usage: {
    table: 'usage_events',
    dateColumn: 'occurred_at',
  },
  playlists: {
    table: 'playlists',
    dateColumn: 'created_at',
  },
  payments: {
    table: 'payments',
    dateColumn: 'created_at',
  },
};

const clampLimit = (value: number) => Math.min(Math.max(value, 1), 200);
const PLAN_KEYS = ['plan', 'plan_id', 'planId', 'id', 'tier', 'name', 'code', 'label', 'type'];
const PLAN_FALLBACK = 'free';

const toISODate = (value: string | null, boundary: 'start' | 'end'): string | null => {
  if (!value) return null;
  const date = new Date(`${value}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

function tryDecodeJSON(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeStringPlan(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.includes('founder')) return 'founder';
  if (lower.includes('premium')) return 'premium';
  if (lower.includes('hub')) return 'hub';
  if (lower.includes('free')) return 'free';
  if (lower.includes('trial')) return 'trial';
  return lower;
}

function normalizePlanInput(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const normalized = normalizeStringPlan(value);
    if (normalized) return normalized;
    const decoded = tryDecodeJSON(value);
    if (decoded) {
      return normalizePlanInput(decoded);
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of PLAN_KEYS) {
      if (value[key]) {
        const normalized = normalizePlanInput(value[key]);
        if (normalized) return normalized;
      }
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        const normalized = normalizePlanInput(entry);
        if (normalized) return normalized;
      }
    }
  }
  return null;
}

function resolvePlanFromInputs(
  ...inputs: Array<any>
): string {
  for (const input of inputs) {
    const normalized = normalizePlanInput(input);
    if (normalized) return normalized;
  }
  return PLAN_FALLBACK;
}

export async function GET(request: NextRequest) {
  const adminAccess = await ensureAdminAccess(request);
  if (!adminAccess.ok) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const typeParam =
    (url.searchParams.get('type') || url.searchParams.get('section') || '').toLowerCase();

  if (!['prompts', 'usage', 'playlists', 'payments'].includes(typeParam)) {
    return NextResponse.json(
      { ok: false, error: 'Parámetro "type" inválido (prompts, usage, playlists, payments)' },
      { status: 400 },
    );
  }

  const section = typeParam as SectionKey;
  const config = SECTION_CONFIG[section];
  const limit = clampLimit(parseInt(url.searchParams.get('limit') || '30', 10));
  const cursor = url.searchParams.get('cursor');
  const startDateParam = url.searchParams.get('startDate');
  const endDateParam = url.searchParams.get('endDate');

  let query = supabase
    .from(config.table)
    .select('*')
    .order(config.dateColumn, { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt(config.dateColumn, cursor);
  }

  const startISO = toISODate(startDateParam, 'start');
  if (startISO) {
    query = query.gte(config.dateColumn, startISO);
  }
  const endISO = toISODate(endDateParam || startDateParam, 'end');
  if (endISO) {
    query = query.lte(config.dateColumn, endISO);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[ADMIN][SECTION]', section, error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let items = data || [];

  if (section === 'prompts' || section === 'usage') {
    const userIds = Array.from(
      new Set(items.map((item) => item.user_id).filter((id): id is string => Boolean(id))),
    );

    let userMap = new Map<
      string,
      { email?: string; plan?: string; is_founder?: boolean }
    >();
    if (userIds.length > 0) {
      const { data: userRows } = await supabase
        .from('users')
        .select('id, email, plan, plan_context, is_founder')
        .in('id', userIds);
      userMap = new Map(
        (userRows || []).map((row) => [
          row.id,
          {
            email: row.email ?? undefined,
            plan: resolvePlanFromInputs(
              row?.plan,
              row?.plan_context,
              row?.is_founder ? 'founder' : null,
            ),
            is_founder: Boolean(row.is_founder),
          },
        ]),
      );
    }

    if (section === 'prompts') {
      items = items.map((prompt) => {
        const linked = prompt.user_id ? userMap.get(prompt.user_id) : undefined;
        const promptText =
          prompt.prompt_text ??
          prompt.text ??
          prompt.prompt ??
          prompt.description ??
          '';
        const promptPlan = resolvePlanFromInputs(
          prompt.user_plan,
          prompt.plan,
          prompt.plan_context,
          prompt.is_founder ? 'founder' : null,
          linked?.plan,
        );
        return {
          ...prompt,
          prompt_text: promptText,
          user_plan: promptPlan,
          user_email: prompt.user_email ?? linked?.email ?? null,
          user: linked
            ? {
                id: prompt.user_id,
                email: linked.email,
                plan: promptPlan,
              }
            : null,
        };
      });
    } else {
      items = items.map((event) => {
        const linked = event.user_id ? userMap.get(event.user_id) : undefined;
        const usageBefore =
          event.usage_before ??
          event.before ??
          event.previous_usage ??
          event.previous ??
          null;
        const usageAfter =
          event.usage_after ??
          event.after ??
          event.current_usage ??
          event.current ??
          null;
        const usagePlan = resolvePlanFromInputs(
          event.user_plan,
          linked?.plan,
        );
        return {
          ...event,
          user_email: event.user_email ?? linked?.email ?? null,
          user_plan: usagePlan,
          usage_before: usageBefore,
          usage_after: usageAfter,
        };
      });
    }
  }

  const lastRow = items.length > 0 ? (items[items.length - 1] as Record<string, any>) : null;
  const nextCursor = lastRow?.[config.dateColumn] ?? null;

  return NextResponse.json({
    ok: true,
    section,
    items,
    nextCursor: typeof nextCursor === 'string' ? nextCursor : null,
    hasMore: items.length === limit,
  });
}

