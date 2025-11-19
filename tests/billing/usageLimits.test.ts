import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveDefaultMaxUses,
  __test,
  type UserRow,
} from '../../lib/billing/usageV2';

describe('usage limits', () => {
  it('defaults free users with null max_uses to plan limit', () => {
    assert.equal(resolveDefaultMaxUses('free', null), 5);
    assert.equal(resolveDefaultMaxUses('free', undefined), 5);
    assert.equal(resolveDefaultMaxUses('free', 0), 5);
    assert.equal(resolveDefaultMaxUses('basic', undefined), 5);
  });

  it('keeps unlimited plans with null max_uses', () => {
    assert.equal(resolveDefaultMaxUses('founder', null), null);
    assert.equal(resolveDefaultMaxUses('premium', null), null);
  });

  it('respects explicit positive max_uses values', () => {
    assert.equal(resolveDefaultMaxUses('free', 10), 10);
    assert.equal(resolveDefaultMaxUses('founder', 20), 20);
  });

  it('buildSummary respects default limit for free plan', () => {
    const row: UserRow = {
      id: 'test-user',
      email: 'test@example.com',
      plan: 'free',
      usage_count: 2,
      max_uses: null,
      is_founder: false,
      newsletter_opt_in: false,
      last_prompt_at: null,
    };

    const summary = __test.buildSummary(row);
    assert.equal(summary.unlimited, false);
    assert.equal(summary.limit, 5);
    assert.equal(summary.remaining, 3);
  });

  it('buildSummary marks unlimited only for unlimited plans', () => {
    const row: UserRow = {
      id: 'test-founder',
      email: 'founder@example.com',
      plan: 'founder',
      usage_count: 10,
      max_uses: null,
      is_founder: true,
      newsletter_opt_in: false,
      last_prompt_at: null,
    };

    const summary = __test.buildSummary(row);
    assert.equal(summary.unlimited, true);
    assert.equal(summary.limit, null);
    assert.equal(summary.remaining, 'unlimited');
  });

  it('remaining is never negative', () => {
    const row: UserRow = {
      id: 'test-overuse',
      email: 'overuse@example.com',
      plan: 'free',
      usage_count: 10,
      max_uses: 5,
      is_founder: false,
      newsletter_opt_in: false,
      last_prompt_at: null,
    };

    const summary = __test.buildSummary(row);
    assert.equal(summary.remaining, 0);
  });
});


