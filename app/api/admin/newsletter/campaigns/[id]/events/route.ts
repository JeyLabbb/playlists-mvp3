import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();

    // Obtener eventos de la campaña
    const { data: events, error } = await supabase
      .from('newsletter_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('occurred_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      events: events || [],
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] campaigns/[id]/events GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al cargar eventos' },
      { status: 500 }
    );
  }
}

