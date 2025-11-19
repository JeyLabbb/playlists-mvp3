import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin() ?? (await createSupabaseRouteClient());
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 },
      );
    }

    const { data: usersData, error } = await supabase
      .from('users')
      .select('id,email,plan,marketing_opt_in,created_at')
      .or('marketing_opt_in.eq.true')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const subscribers =
      (usersData || []).map((user) => ({
        id: user.id,
        email: user.email,
        plan: user.plan,
        is_founder: user.plan === 'founder',
        subscribed_at: user.created_at,
        manually_added: false,
        marketing_opt_in: Boolean(user.marketing_opt_in),
        source: 'users',
      })) ?? [];

    const seenEmails = new Set(subscribers.map((subscriber) => subscriber.email?.toLowerCase()));

    const { data: newsletterRows } = await supabase
      .from('newsletter')
      .select('email, subscribed_at, manually_added');

    const manualEntries =
      (newsletterRows || [])
        .filter((row) => {
          const email = row.email?.toLowerCase();
          return email && !seenEmails.has(email);
        })
        .map((row) => ({
          id: null,
          email: row.email,
          plan: null,
          is_founder: false,
          subscribed_at: row.subscribed_at,
          manually_added: Boolean(row.manually_added),
          marketing_opt_in: true,
          source: 'newsletter',
        })) ?? [];

    const merged = [...subscribers, ...manualEntries];

    return NextResponse.json({
      success: true,
      subscribers: merged,
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] List error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load subscribers' },
      { status: 500 },
    );
  }
}
