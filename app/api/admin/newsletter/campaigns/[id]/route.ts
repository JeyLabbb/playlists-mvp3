import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const updateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  subject: z.string().min(1).max(160).optional(),
  preheader: z.string().max(200).optional(),
  body: z.string().min(1).optional(),
  primaryCta: z.object({ label: z.string(), url: z.string().url() }).optional(),
  secondaryCta: z.object({ label: z.string(), url: z.string().url() }).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();
    const { data, error } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, campaign: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] campaign GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo cargar la campaña' },
      { status: 500 },
    );
  }
}

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
    const payload = updateSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    const updates: Record<string, any> = {};
    if (payload.title) updates.title = payload.title;
    if (payload.subject) updates.subject = payload.subject;
    if (payload.preheader !== undefined) updates.preheader = payload.preheader;
    if (payload.body) updates.body = payload.body;
    if (payload.primaryCta) {
      updates.primary_cta_label = payload.primaryCta.label;
      updates.primary_cta_url = payload.primaryCta.url;
    }
    if (payload.secondaryCta) {
      updates.secondary_cta_label = payload.secondaryCta.label;
      updates.secondary_cta_url = payload.secondaryCta.url;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { data, error } = await supabase
      .from('newsletter_campaigns')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, campaign: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] campaign PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo actualizar la campaña' },
      { status: 500 },
    );
  }
}

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
    const supabase = await getNewsletterAdminClient();
    const { error } = await supabase.from('newsletter_campaigns').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] campaign DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo eliminar la campaña' },
      { status: 500 },
    );
  }
}

