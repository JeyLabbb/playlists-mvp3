'use client';

import { useCallback, useEffect, useMemo } from 'react';
import useSWR from 'swr';

const FALLBACK_FREE_LIMIT = Number.parseInt(
  process.env.NEXT_PUBLIC_FREE_LIMIT ??
    process.env.NEXT_PUBLIC_FREE_USES ??
    process.env.NEXT_PUBLIC_FREE_USAGE_LIMIT ??
    '5',
  10,
);

const HUB_MODE_ENABLED =
  process.env.NEXT_PUBLIC_HUB_MODE === '1' || process.env.HUB_MODE === '1';

type UsageResponse = {
  needsAccount?: boolean;
  usage?: {
    current?: number;
    limit?: number | null;
    remaining?: number | 'unlimited';
    hasUnlimitedUses?: boolean;
    plan?: string;
    resetAt?: string | null;
    maxUses?: number | null;
    lastPromptAt?: string | null;
  };
  used?: number;
  remaining?: number | 'unlimited';
  unlimited?: boolean;
  plan?: string;
  limit?: number | boolean | null;
  limitPerWindow?: number | null;
  counters?: {
    usage_count?: number;
    max_uses?: number | null;
    last_prompt_at?: string | null;
    updated_at?: string | null;
  } | null;
  termsAccepted?: boolean;
  termsAcceptedAt?: string | null;
  marketingOptIn?: boolean;
  isEarlyFounderCandidate?: boolean; // 🚨 CRITICAL: Añadir flag de early founder candidate
};

type UseUsageStatusOptions = {
  disabled?: boolean;
  refreshInterval?: number;
};

const fetcher = async (url: string): Promise<UsageResponse> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load usage status (${res.status})`);
  }
  return res.json();
};

export function useUsageStatus(options: UseUsageStatusOptions = {}) {
  const { disabled = false, refreshInterval = 60000 } = options;

  const {
    data,
    error,
    mutate,
    isValidating,
  } = useSWR<UsageResponse>(disabled ? null : '/api/usage/status', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: disabled ? 0 : refreshInterval,
  });

  const refresh = useCallback(() => mutate(), [mutate]);

  useEffect(() => {
    if (disabled) return;
    const handler = () => {
      refresh();
    };
    window.addEventListener('usage-paywall-refresh', handler);
    return () => {
      window.removeEventListener('usage-paywall-refresh', handler);
    };
  }, [disabled, refresh]);

  const usageState = useMemo(() => {
    if (!data) return null;

    if (data.needsAccount) {
      return {
        needsAccount: true,
        usage: {
          current: 0,
          limit: data.usage?.limit ?? null,
          remaining: data.usage?.remaining ?? 0,
          hasUnlimitedUses: false,
          plan: data.usage?.plan || 'free',
          resetAt: null,
          maxUses: data.usage?.maxUses ?? null,
          lastPromptAt: null,
        },
        used: 0,
        remaining: data.usage?.remaining ?? 0,
        unlimited: false,
        plan: data.plan || 'free',
        limitPerWindow: data.limitPerWindow ?? data.usage?.limit ?? null,
        counters: null,
        termsAccepted: false,
        termsAcceptedAt: null,
        marketingOptIn: false,
      } as UsageResponse;
    }

    const counters = data.counters || null;
    const usage = data.usage || {};
    let planValue = usage.plan || data.plan || 'free';
    if (planValue === 'hub' && !HUB_MODE_ENABLED) {
      planValue = 'free';
    }
    const planIsUnlimited =
      planValue === 'hub'
        ? HUB_MODE_ENABLED
        : ['founder', 'premium', 'monthly'].includes(planValue);
    const current =
      typeof usage.current === 'number'
        ? usage.current
        : typeof data.used === 'number'
          ? data.used
          : counters?.usage_count ?? 0;

    let maxUses: number | null = null;
    if (typeof usage.limit === 'number') {
      maxUses = usage.limit;
    } else if (typeof data.limitPerWindow === 'number') {
      maxUses = data.limitPerWindow;
    } else if (typeof counters?.max_uses === 'number') {
      maxUses = counters.max_uses;
    }

    if ((maxUses === null || Number.isNaN(maxUses)) && !planIsUnlimited) {
      maxUses = FALLBACK_FREE_LIMIT;
    }

    let remainingRaw: UsageResponse['remaining'] =
      usage.remaining ??
      data.remaining ??
      null;

    if (
      remainingRaw === 'unlimited' &&
      !planIsUnlimited &&
      typeof maxUses === 'number'
    ) {
      remainingRaw = Math.max(0, maxUses - current);
    }

    let remaining: number | 'unlimited' =
      typeof remainingRaw === 'number'
        ? Math.max(0, remainingRaw)
        : 'unlimited';

    if (planIsUnlimited) {
      remaining = 'unlimited';
    } else if (typeof remaining !== 'number' && typeof maxUses === 'number') {
      remaining = Math.max(0, maxUses - current);
    }

    const unlimited =
      planIsUnlimited ||
      data.unlimited ||
      usage.hasUnlimitedUses ||
      remaining === 'unlimited' ||
      maxUses === null;

    return {
      usage: {
        current,
        limit: maxUses,
        remaining,
        hasUnlimitedUses: unlimited,
        plan: planValue,
        resetAt: usage.resetAt || null,
        maxUses,
        lastPromptAt: data?.usage?.resetAt ?? counters?.last_prompt_at ?? null,
      },
      used: current,
      remaining,
      unlimited,
      plan: planValue,
      limitPerWindow: maxUses,
      counters,
      termsAccepted: data.termsAccepted ?? true,
      termsAcceptedAt: data.termsAcceptedAt ?? null,
      marketingOptIn: data.marketingOptIn ?? false,
      isEarlyFounderCandidate: data.isEarlyFounderCandidate ?? false, // 🚨 CRITICAL: Exponer flag de early founder candidate
    } as UsageResponse;
  }, [data]);

  return {
    data: usageState,
    needsAccount: usageState?.needsAccount === true,
    usage: usageState?.usage,
    counters: usageState?.counters,
    remaining: usageState?.remaining,
    current: usageState?.usage?.current,
    maxUses: usageState?.usage?.limit,
    unlimited: usageState?.unlimited,
    isLoading: !data && !error,
    isError: !!error,
    error,
    isValidating,
    refresh,
    termsAccepted: usageState?.termsAccepted ?? true,
    termsAcceptedAt: usageState?.termsAcceptedAt ?? null,
    marketingOptIn: usageState?.marketingOptIn ?? false,
  };
}


