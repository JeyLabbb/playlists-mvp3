import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  friendId: z.string().uuid(),
});

/**
 * DELETE: Remove a friend relationship (bidirectional)
 * Elimina la amistad en ambas direcciones (user_id -> friend_id y friend_id -> user_id)
 */
export async function DELETE(request: Request) {
  try {
    const pleiaUser = await getPleiaServerUser();
    const userId = pleiaUser?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');

    if (!friendId) {
      return NextResponse.json({ success: false, error: 'friendId is required' }, { status: 400 });
    }

    const parsed = schema.safeParse({ friendId });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid friendId' }, { status: 400 });
    }

    const supabase = await createSupabaseRouteClient();

    // Verificar que existe la amistad
    const { data: friendRow, error: checkError } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', parsed.data.friendId)
      .maybeSingle();

    if (checkError) {
      console.error('[SOCIAL] Check friend error:', checkError);
      return NextResponse.json({ success: false, error: 'Failed to check friendship' }, { status: 500 });
    }

    if (!friendRow) {
      return NextResponse.json({ success: false, error: 'Friendship not found' }, { status: 404 });
    }

    // Eliminar la amistad en ambas direcciones
    const [delete1, delete2] = await Promise.all([
      supabase
        .from('friends')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', parsed.data.friendId),
      supabase
        .from('friends')
        .delete()
        .eq('user_id', parsed.data.friendId)
        .eq('friend_id', userId),
    ]);

    if (delete1.error || delete2.error) {
      console.error('[SOCIAL] Delete friend error:', {
        delete1: delete1.error,
        delete2: delete2.error,
      });
      return NextResponse.json({ success: false, error: 'Failed to remove friendship' }, { status: 500 });
    }

    console.log('[SOCIAL] Friend removed successfully:', {
      userId,
      friendId: parsed.data.friendId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SOCIAL] Remove friend error:', error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

