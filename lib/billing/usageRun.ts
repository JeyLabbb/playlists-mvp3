import type { UsageIdentity } from './usageV2';
import type { ConsumeResult } from './usageV2';
import { consumeUsage } from './usage';

type UsageSummaryLike = {
  remaining: number | 'unlimited';
  limit: number | null;
  unlimited: boolean;
};

type PlanContextLike = {
  plan: string;
  unlimited: boolean;
};

type ConsumeMeta = {
  traceId?: string;
  phase?: string;
  prompt?: string;
  targetTracks?: number;
  plan?: string;
};

type UsageRunOptions = {
  identity: UsageIdentity;
  planContext: PlanContextLike;
  usageSummary?: UsageSummaryLike | null;
  hubMode?: boolean;
  consume?: typeof consumeUsage;
};

export class UsageRun {
  private readonly identity: UsageIdentity;
  private readonly planContext: PlanContextLike;
  private readonly initialSummary: UsageSummaryLike | null;
  private readonly consumeFn: typeof consumeUsage;
  private readonly hubMode: boolean;

  private consumed = false;
  private limitReached = false;
  private usageEventId: string | null = null;

  constructor(options: UsageRunOptions) {
    this.identity = options.identity;
    this.planContext = options.planContext;
    this.initialSummary = options.usageSummary ?? null;
    this.consumeFn = options.consume ?? consumeUsage;
    this.hubMode = !!options.hubMode;
  }

  hasAllowance(): boolean {
    if (this.planContext.unlimited) {
      return true;
    }
    const remaining = this.initialSummary?.remaining;
    if (typeof remaining === 'number') {
      return remaining > 0;
    }
    return true;
  }

  hasConsumed(): boolean {
    return this.consumed;
  }

  wasLimitReached(): boolean {
    return this.limitReached;
  }

  getUsageEventId(): string | null {
    return this.usageEventId;
  }

  isUnlimited(): boolean {
    return this.planContext.unlimited;
  }

  async consumeOnFirstTrack(
    chunkLength: number,
    meta: ConsumeMeta,
  ): Promise<ConsumeResult | null> {
    if (chunkLength <= 0) {
      return null;
    }
    if (this.consumed || this.limitReached) {
      return null;
    }

    try {
      const result = await this.consumeFn(this.identity, meta);
      if (!result.ok) {
        this.limitReached = true;
        return result;
      }

      this.consumed = true;
      this.usageEventId = this.usageEventId || result.usageId || null;
      if (result.unlimited) {
        this.planContext.unlimited = true;
      }

      return result;
    } catch (error) {
      this.consumed = false;
      throw error;
    }
  }
}


