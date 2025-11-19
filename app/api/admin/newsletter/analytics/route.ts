import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error } = await supabase
      .from('newsletter_events')
      .select('event_type, occurred_at')
      .gte('occurred_at', startDate);
    if (error) throw error;

    const summary = {
      delivered: 0,
      opened: 0,
      clicked: 0,
    };
    const daily: Record<string, { delivered: number; opened: number; clicked: number }> = {};

    (events || []).forEach((event) => {
      const day = new Date(event.occurred_at).toISOString().slice(0, 10);
      if (!daily[day]) {
        daily[day] = { delivered: 0, opened: 0, clicked: 0 };
      }
      if (event.event_type === 'delivered') {
        summary.delivered += 1;
        daily[day].delivered += 1;
      } else if (event.event_type === 'opened') {
        summary.opened += 1;
        daily[day].opened += 1;
      } else if (event.event_type === 'clicked') {
        summary.clicked += 1;
        daily[day].clicked += 1;
      }
    });

    const openRate = summary.delivered ? summary.opened / summary.delivered : 0;
    const clickRate = summary.delivered ? summary.clicked / summary.delivered : 0;

    return NextResponse.json({
      success: true,
      summary,
      rates: {
        openRate,
        clickRate,
      },
      daily: Object.entries(daily)
        .map(([date, value]) => ({ date, ...value }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] analytics GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo cargar el tracking' },
      { status: 500 },
    );
  }
}

