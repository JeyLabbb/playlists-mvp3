import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const ctaSchema = z.object({
  label: z.string().min(1).max(80),
  url: z.string().url(),
});

const templateSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(300).optional(),
  subject: z.string().max(160).optional(),
  body: z.string().min(1),
  primaryCta: ctaSchema.optional(),
  secondaryCta: ctaSchema.optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();
    const { data, error } = await supabase
      .from('newsletter_templates')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({
      success: true,
      templates: data || [],
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] templates GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar las plantillas' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();
    const payload = templateSchema.parse(await request.json());

    if (payload.isDefault) {
      await supabase.from('newsletter_templates').update({ is_default: false }).neq('id', null);
    }

    const { data, error } = await supabase
      .from('newsletter_templates')
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        subject: payload.subject ?? null,
        body: payload.body,
        primary_cta: payload.primaryCta ?? null,
        secondary_cta: payload.secondaryCta ?? null,
        is_default: payload.isDefault ?? false,
        created_by: adminAccess.email,
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, template: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] templates POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo crear la plantilla' },
      { status: 500 },
    );
  }
}

