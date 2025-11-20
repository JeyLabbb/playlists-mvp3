import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pleiaUser = await getPleiaServerUser();
    const userId = pleiaUser?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createSupabaseRouteClient();

    const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
      supabase
        .from('friends')
        .select('friend_id, created_at')
        .eq('user_id', userId),
      supabase
        .from('friend_requests')
        .select('id, sender_id, created_at, status')
        .eq('receiver_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('friend_requests')
        .select('id, receiver_id, status, created_at')
        .eq('sender_id', userId),
    ]);

    if (friendsRes.error || incomingRes.error || outgoingRes.error) {
      console.error('[SOCIAL] Friends fetch error', {
        friends: friendsRes.error,
        incoming: incomingRes.error,
        outgoing: outgoingRes.error,
      });
      return NextResponse.json({ success: false, error: 'Failed to load social data' }, { status: 500 });
    }

    const friendIds = friendsRes.data?.map((row) => row.friend_id) ?? [];
    const incomingIds = incomingRes.data?.map((row) => row.sender_id) ?? [];
    const outgoingIds = outgoingRes.data?.map((row) => row.receiver_id) ?? [];
    const uniqueUserIds = Array.from(new Set([...friendIds, ...incomingIds, ...outgoingIds]));

    const userDetailsMap = new Map<
      string,
      { email: string | null; username?: string | null; plan: string | null; last_prompt_at?: string | null }
    >();
    if (uniqueUserIds.length > 0) {
      const { data: userRows, error: usersError } = await supabase
        .from('users')
        .select('id, email, username, plan, last_prompt_at')
        .in('id', uniqueUserIds);

      let effectiveRows: any[] = userRows || [];
      let effectiveError = usersError;

      if (usersError?.code === '42703') {
        const fallback = await supabase
          .from('users')
          .select('id, email, plan')
          .in('id', uniqueUserIds);
        effectiveRows = fallback.data || [];
        effectiveError = fallback.error;
      }

      if (effectiveError) {
        console.warn('[SOCIAL] Users lookup warning:', effectiveError);
      }

      effectiveRows.forEach((row: any) => {
        userDetailsMap.set(row.id, {
          email: row.email ?? null,
          username: row.username ?? null,
          plan: row.plan ?? null,
          last_prompt_at: row.last_prompt_at ?? null,
        });
      });
    }

    const friends = (friendsRes.data ?? []).map((row) => {
      const detail = userDetailsMap.get(row.friend_id) ?? { email: null, username: null, plan: null, last_prompt_at: null };
      return {
        friendId: row.friend_id,
        createdAt: row.created_at,
        email: detail.email,
        username: detail.username ?? null,
        plan: detail.plan,
        lastActivity: detail.last_prompt_at ?? null,
      };
    });

    const incoming = (incomingRes.data ?? []).map((row) => {
      const detail = userDetailsMap.get(row.sender_id) ?? { email: null, username: null, plan: null, last_prompt_at: null };
      return {
        requestId: row.id,
        senderId: row.sender_id,
        email: detail.email,
        username: detail.username ?? null,
        createdAt: row.created_at,
      };
    });

    const outgoing = (outgoingRes.data ?? []).map((row) => {
      const detail = userDetailsMap.get(row.receiver_id) ?? { email: null, username: null, plan: null, last_prompt_at: null };
      return {
        requestId: row.id,
        receiverId: row.receiver_id,
        status: row.status,
        email: detail.email,
        username: detail.username ?? null,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      friends,
      requests: {
        incoming,
        outgoing,
      },
    });
  } catch (error) {
    console.error('[SOCIAL] Friends list error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

