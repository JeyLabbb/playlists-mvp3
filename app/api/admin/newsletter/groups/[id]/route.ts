import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const updateGroupSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const payload = updateGroupSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    const updates: Record<string, any> = {};
    if (payload.name) updates.name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.is_default !== undefined) updates.is_default = payload.is_default;
    if (payload.metadata) updates.metadata = payload.metadata;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, group: null });
    }

    const { data, error } = await supabase
      .from('newsletter_groups')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, group: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] groups PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo actualizar el grupo' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();
    const { error } = await supabase.from('newsletter_groups').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] groups DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo eliminar el grupo' },
      { status: 500 },
    );
  }
}

