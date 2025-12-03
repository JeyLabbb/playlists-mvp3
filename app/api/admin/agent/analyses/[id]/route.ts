import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// Actualiza el flag excluded_from_reports de un análisis concreto
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not configured' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { excluded_from_reports } = body as { excluded_from_reports?: boolean };

    if (typeof excluded_from_reports !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'excluded_from_reports must be boolean' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('pleia_agent_analyses')
      .update({ excluded_from_reports })
      .eq('id', id);

    if (error) {
      console.error('[AGENT-ANALYSES-ID] Error updating analysis:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[AGENT-ANALYSES-ID] PATCH unexpected error:', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Unexpected error' },
      { status: 500 },
    );
  }
}

// Elimina completamente un análisis (para limpieza manual)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not configured' },
        { status: 500 },
      );
    }

    const { error } = await supabase
      .from('pleia_agent_analyses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AGENT-ANALYSES-ID] Error deleting analysis:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[AGENT-ANALYSES-ID] DELETE unexpected error:', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Unexpected error' },
      { status: 500 },
    );
  }
}
