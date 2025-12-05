import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

const schema = z.object({
  requestId: z.string().uuid().optional(),
  senderId: z.string().uuid().optional(),
  action: z.enum(['accept', 'decline']),
});

export async function POST(request: Request) {
  try {
    const pleiaUser = await getPleiaServerUser();
    const userId = pleiaUser?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = await createSupabaseRouteClient();

    let requestRow: { id: string; sender_id: string; receiver_id: string } | null = null;

    if (parsed.data.requestId) {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .eq('id', parsed.data.requestId)
        .maybeSingle();

      if (error) {
        console.error('[SOCIAL] Respond fetch error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load request' }, { status: 500 });
      }
      requestRow = data;
    } else if (parsed.data.senderId) {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .eq('sender_id', parsed.data.senderId)
        .eq('receiver_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[SOCIAL] Respond fetch error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load request' }, { status: 500 });
      }
      requestRow = data;
    }

    if (!requestRow || requestRow.receiver_id !== userId) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    if (parsed.data.action === 'decline') {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', requestRow.id);

      if (error) {
        console.error('[SOCIAL] Decline error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update request' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'declined' });
    }

    // Accept workflow: update request & insert friendship (both directions)
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted', responded_at: now })
      .eq('id', requestRow.id);

    if (updateError) {
      console.error('[SOCIAL] Accept update error:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to accept request' }, { status: 500 });
    }

    const { error: insertError } = await supabase
      .from('friends')
      .upsert(
        [
          { user_id: userId, friend_id: requestRow.sender_id },
          { user_id: requestRow.sender_id, friend_id: userId },
        ],
        { onConflict: 'user_id,friend_id' },
      );

    if (insertError) {
      console.error('[SOCIAL] Insert friends error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to create friendship' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'accepted' });
  } catch (error) {
    console.error('[SOCIAL] Respond error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

