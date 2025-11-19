import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveFriendIdentity,
  FriendResolutionError,
} from '../../lib/social/resolveFriendIdentity';

type Filter = {
  op: 'eq' | 'ilike' | 'in';
  column: string;
  value: string | string[];
};

function serializeQuery(table: string, filters: Filter[]) {
  return JSON.stringify({ table, filters });
}

function createSupabaseStub(responses: Record<string, { data: any; error: any }>) {
  return {
    from(table: string) {
      const filters: Filter[] = [];

      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: string) {
          filters.push({ op: 'eq', column, value });
          return builder;
        },
        ilike(column: string, value: string) {
          filters.push({ op: 'ilike', column, value });
          return builder;
        },
        in(column: string, value: string[]) {
          filters.push({ op: 'in', column, value });
          return builder;
        },
        maybeSingle: async () => {
          const key = serializeQuery(table, filters);
          return responses[key] ?? { data: null, error: null };
        },
      };

      return builder;
    },
  };
}

describe('resolveFriendIdentity', () => {
  it('resolves by friendId when present', async () => {
    const friendId = '11111111-1111-4111-8111-111111111111';
    const stub = createSupabaseStub({
      [serializeQuery('users', [{ op: 'eq', column: 'id', value: friendId }])]: {
        data: { id: friendId, email: 'friend@example.com', username: 'friend-user' },
        error: null,
      },
    });

    const result = await resolveFriendIdentity(
      { friendId },
      { supabase: stub as any },
    );

    assert.equal(result.userId, friendId);
    assert.equal(result.email, 'friend@example.com');
    assert.equal(result.username, 'friend-user');
    assert.equal(result.source, 'id');
  });

  it('resolves by username falling back to users table', async () => {
    const stub = createSupabaseStub({
      [serializeQuery('users', [{ op: 'eq', column: 'username', value: 'friend' }])]: {
        data: { id: 'uuid-2', email: 'user2@example.com', username: 'Friend' },
        error: null,
      },
    });

    const result = await resolveFriendIdentity(
      { username: 'friend' },
      { supabase: stub as any },
    );

    assert.equal(result.userId, 'uuid-2');
    assert.equal(result.email, 'user2@example.com');
    assert.equal(result.username, 'friend');
    assert.equal(result.source, 'username-db');
  });

  it('throws FriendResolutionError when user cannot be resolved', async () => {
    const stub = createSupabaseStub({});

    await assert.rejects(
      resolveFriendIdentity({ username: 'missing' }, { supabase: stub as any }),
      (error: unknown) => {
        assert.ok(error instanceof FriendResolutionError);
        assert.equal(error.details.code, 'USER_RESOLUTION_FAILED');
        return true;
      },
    );
  });
});


