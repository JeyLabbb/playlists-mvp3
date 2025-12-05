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
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);

    let query = supabase
      .from('newsletter_jobs')
      .select('*')
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (status === 'pending') {
      query = query
        .is('completed_at', null)
        .is('failed_at', null);
    } else if (status === 'failed') {
      query = query.not('failed_at', 'is', null);
    } else if (status === 'completed') {
      query = query.not('completed_at', 'is', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      jobs: data || [],
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] jobs GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar los jobs' },
      { status: 500 },
    );
  }
}

