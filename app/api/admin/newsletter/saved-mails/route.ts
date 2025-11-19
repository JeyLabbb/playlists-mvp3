import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const mailSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(300).optional(),
  subject: z.string().max(180).optional(),
  body: z.string().min(1),
  category: z.string().max(80).optional(),
  status: z.enum(['draft', 'published']).optional(),
  templateId: z.string().uuid().optional(),
  templateMode: z.enum(['custom', 'pleia']).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    let query = supabase
      .from('newsletter_saved_mails')
      .select('*')
      .order('updated_at', { ascending: false });
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, mails: data || [] });
  } catch (error: any) {
    console.error('[NEWSLETTER] saved mails GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar los mails' },
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
    const payload = mailSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();
    const { data, error } = await supabase
      .from('newsletter_saved_mails')
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        subject: payload.subject ?? null,
        body: payload.body,
        category: payload.category ?? 'general',
        status: payload.status ?? 'draft',
        template_id: payload.templateId ?? null,
        metadata: {
          ...(payload.metadata ?? {}),
          templateMode: payload.templateMode ?? 'custom',
        },
        created_by: adminAccess.email,
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, mail: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] saved mails POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo guardar el mail' },
      { status: 500 },
    );
  }
}



