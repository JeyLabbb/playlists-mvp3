'use client';

import { useEffect, useMemo } from 'react';
import PaywallModal from './PaywallModal';
import { useUsageStatus } from '../../lib/hooks/useUsageStatus';
import { usePleiaSession } from '../../lib/auth/usePleiaSession';
import { useProfile } from '../../lib/useProfile';
import { REFERRALS_ENABLED, canInvite } from '../../lib/referrals';

const DEFAULT_USAGE_STATE = {
  usage: {
    current: 0,
    limit: 5,
    remaining: 5,
    hasUnlimitedUses: false,
    plan: 'free',
  },
  used: 0,
  remaining: 5,
  unlimited: false,
  plan: 'free',
};

export default function UsagePaywall({
  open,
  onClose,
  usage,
  onBuyFounder,
  autoRefresh,
}) {
  const { data: session } = usePleiaSession();
  const { isEarlyFounderCandidate } = useProfile();
  const { data: usageState, refresh } = useUsageStatus({
    disabled: !open && !autoRefresh,
    refreshInterval: 15000,
  });

  useEffect(() => {
    if (!autoRefresh || !open) return;

    const intervalId = setInterval(() => {
      window.dispatchEvent(new CustomEvent('usage-paywall-refresh'));
    }, 10000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, open]);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  const resolvedUsage = useMemo(() => {
    const base = usage || usageState || DEFAULT_USAGE_STATE;

    let canAccessAdvantage = false;
    const email = session?.user?.email;
    if (REFERRALS_ENABLED && email) {
      try {
        canAccessAdvantage = canInvite(email, { isEarlyCandidate: isEarlyFounderCandidate });
      } catch (error) {
        console.warn('[USAGE-PAYWALL] Failed to evaluate advantage:', error);
      }
    }

    return {
      ...base,
      canAccessAdvantage,
      advantage: canAccessAdvantage,
    };
  }, [usage, usageState, session?.user?.email, isEarlyFounderCandidate]);

  return (
    <PaywallModal
      isOpen={open}
      onClose={onClose}
      usage={resolvedUsage}
      onBuyFounder={onBuyFounder}
    />
  );
}

