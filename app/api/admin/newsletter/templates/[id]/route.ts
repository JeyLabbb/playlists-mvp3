import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(300).optional(),
  subject: z.string().max(160).optional(),
  body: z.string().min(1).optional(),
  primaryCta: z.object({ label: z.string(), url: z.string().url() }).optional(),
  secondaryCta: z.object({ label: z.string(), url: z.string().url() }).optional(),
  isDefault: z.boolean().optional(),
});

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
    const supabase = await getNewsletterAdminClient();
    const payload = updateSchema.parse(await request.json());

    if (payload.isDefault) {
      await supabase.from('newsletter_templates').update({ is_default: false }).neq('id', id);
    }

    const updates: Record<string, any> = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.subject !== undefined) updates.subject = payload.subject;
    if (payload.body !== undefined) updates.body = payload.body;
    if (payload.primaryCta !== undefined) updates.primary_cta = payload.primaryCta;
    if (payload.secondaryCta !== undefined) updates.secondary_cta = payload.secondaryCta;
    if (payload.isDefault !== undefined) updates.is_default = payload.isDefault;

    if (!Object.keys(updates).length) {
      return NextResponse.json({ success: true });
    }

    const { data, error } = await supabase
      .from('newsletter_templates')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, template: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] templates PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo actualizar la plantilla' },
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
    const { error } = await supabase.from('newsletter_templates').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] templates DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo eliminar la plantilla' },
      { status: 500 },
    );
  }
}

