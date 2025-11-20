import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  subject: z.string().max(160).optional(),
  body: z.string().min(1).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const params = await context.params;
    const supabase = await getNewsletterAdminClient();
    const { data, error } = await supabase
      .from('newsletter_saved_mails')
      .select('*')
      .eq('id', params.id)
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, savedMail: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] saved-mail GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo cargar el mail guardado' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const params = await context.params;
    const payload = updateSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    const updates: Record<string, any> = {};
    if (payload.name) updates.name = payload.name;
    if (payload.subject) updates.subject = payload.subject;
    if (payload.body) updates.body = payload.body;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { data, error } = await supabase
      .from('newsletter_saved_mails')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, savedMail: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] saved-mail PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo actualizar el mail guardado' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const params = await context.params;
    const supabase = await getNewsletterAdminClient();
    const { error } = await supabase.from('newsletter_saved_mails').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] saved-mail DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo eliminar el mail guardado' },
      { status: 500 },
    );
  }
}

