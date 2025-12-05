import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UsageRun } from '../../lib/billing/usageRun';

const identity = { userId: 'user-1', email: 'user@example.com' };
const planContext = { plan: 'free', unlimited: false };
const usageSummary = {
  plan: 'free',
  source: 'users',
  used: 0,
  remaining: 5,
  limit: 5,
  unlimited: false,
  lastPromptAt: null,
};

describe('UsageRun', () => {
  it('consumes only after first chunk with tracks', async () => {
    let consumeCalls = 0;
    const run = new UsageRun({
      identity,
      planContext: { ...planContext },
      usageSummary,
      consume: async () => {
        consumeCalls += 1;
        return {
          ok: true as const,
          usageId: 'evt-1',
          unlimited: false,
          remaining: 4,
          used: 1,
          plan: 'free',
          lastPromptAt: null,
        };
      },
    });

    await run.consumeOnFirstTrack(0, { phase: 'test', plan: 'free' });
    assert.equal(consumeCalls, 0, 'should not consume when chunk has zero tracks');

    await run.consumeOnFirstTrack(3, { phase: 'test', plan: 'free' });
    assert.equal(consumeCalls, 1, 'should consume on first valid chunk');
    assert.equal(run.hasConsumed(), true);

    await run.consumeOnFirstTrack(2, { phase: 'test', plan: 'free' });
    assert.equal(consumeCalls, 1, 'should not consume more than once');
  });

  it('does not consume when there are no tracks', async () => {
    const run = new UsageRun({
      identity,
      planContext: { ...planContext },
      usageSummary,
      consume: async () => {
        throw new Error('consumeUsage should not be called');
      },
    });

    await run.consumeOnFirstTrack(0, { phase: 'test', plan: 'free' });
    assert.equal(run.hasConsumed(), false);
  });

  it('blocks when remaining usage is zero for free plan', () => {
    const run = new UsageRun({
      identity,
      planContext: { ...planContext },
      usageSummary: {
        ...usageSummary,
        used: 5,
        remaining: 0,
      },
    });

    assert.equal(run.hasAllowance(), false, 'should not allow when remaining is zero');
  });
});


