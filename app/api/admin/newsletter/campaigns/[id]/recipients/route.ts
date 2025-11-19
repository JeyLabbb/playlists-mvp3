import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getNewsletterAdminClient();
    const { id } = await params;
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 200), 500);
    const offset = Number(url.searchParams.get('offset') || 0);

    const { data, error } = await supabase
      .from('newsletter_campaign_recipients')
      .select(
        `
        id,
        email,
        status,
        sent_at,
        delivered_at,
        opened_at,
        clicked_at,
        bounced_at,
        last_error,
        created_at,
        contact:newsletter_contacts(id,name,status)
      `,
      )
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      recipients: data || [],
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] campaign recipients error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar los destinatarios' },
      { status: 500 },
    );
  }
}

