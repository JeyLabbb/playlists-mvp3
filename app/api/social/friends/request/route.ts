import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import {
  FriendResolutionError,
  resolveFriendIdentity,
} from '@/lib/social/resolveFriendIdentity';
import { cacheUsernameMapping, normalizeUsername } from '@/lib/social/usernameCache';

const requestSchema = z
  .object({
    friendId: z.string().uuid().optional(),
    friendEmail: z.string().email().optional(),
    username: z.string().min(1).optional(),
  })
  .refine(
    (payload) => payload.friendId || payload.friendEmail || payload.username,
    'Provide at least one identifier (friendId, friendEmail or username)',
  );

export async function POST(request: Request) {
  try {
    const pleiaUser = await getPleiaServerUser();
    const userId = pleiaUser?.id;
    const userEmail = pleiaUser?.email?.toLowerCase();

    if (!userId || !userEmail) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const adminSupabase = getSupabaseAdmin();
    const supabase = adminSupabase ?? (await createSupabaseRouteClient());

    let resolution;

    try {
      resolution = await resolveFriendIdentity(
        {
          friendId: parsed.data.friendId,
          friendEmail: parsed.data.friendEmail,
          username: parsed.data.username,
        },
        { supabase },
      );
    } catch (error) {
      if (error instanceof FriendResolutionError) {
        console.warn('[SOCIAL] Friend resolution failed:', {
          code: error.details.code,
          tried: error.details.tried,
          input: {
            friendId: parsed.data.friendId ?? null,
            hasEmail: !!parsed.data.friendEmail,
            hasUsername: !!parsed.data.username,
          },
        });

        console.log('[METRIC] friend_resolution_failure', {
          tried: error.details.tried,
          input: {
            friendId: parsed.data.friendId ? 'uuid' : null,
            hasEmail: !!parsed.data.friendEmail,
            hasUsername: !!parsed.data.username,
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
            code: 'USER_RESOLUTION_FAILED',
            tried: error.details.tried,
          },
          { status: 404 },
        );
      }

      throw error;
    }

    const targetId = resolution.userId;

    if (!targetId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          code: 'USER_RESOLUTION_FAILED',
        },
        { status: 404 },
      );
    }

    if (targetId === userId) {
      return NextResponse.json({ success: false, error: 'Invalid friend target' }, { status: 400 });
    }

    const basePayload = {
      sender_id: userId,
      receiver_id: targetId,
      status: 'pending' as const,
      responded_at: null as string | null,
    };

    const writer = adminSupabase ?? supabase;

    const { error: insertError } = await writer
      .from('friend_requests')
      .insert(basePayload);

    if (insertError) {
      // If the request already exists we try to reset it to pending
      if (insertError.code === '23505') {
        const { error: updateError } = await writer
          .from('friend_requests')
          .update({ status: 'pending', responded_at: null })
          .eq('sender_id', userId)
          .eq('receiver_id', targetId);

        if (updateError) {
          console.error('[SOCIAL] Error reactivating friend request:', updateError);
          return NextResponse.json(
            { success: false, error: 'Failed to create request', code: updateError.code || null },
            { status: 500 },
          );
        }
      } else {
        console.error('[SOCIAL] Error inserting friend request:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to create request', code: insertError.code || null },
          { status: 500 },
        );
      }
    }

    console.log('[METRIC] friend_resolution_success', {
      source: resolution.source ?? 'username-db',
    });

    if (resolution.username && resolution.email) {
      const normalizedUsername = normalizeUsername(resolution.username);
      if (normalizedUsername) {
        cacheUsernameMapping({
          username: normalizedUsername,
          email: resolution.email,
          userId: targetId,
        }).catch((cacheError) => {
          console.warn('[SOCIAL] Failed to refresh username cache after friend request:', cacheError);
        });
      }
    }

    return NextResponse.json({ success: true, target: resolution });
  } catch (error) {
    console.error('[SOCIAL] Friend request error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

