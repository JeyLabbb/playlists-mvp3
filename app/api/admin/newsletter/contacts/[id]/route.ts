import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient, replaceContactGroups } from '@/lib/newsletter/server';

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  status: z.enum(['subscribed', 'unsubscribed', 'bounced']).optional(),
  metadata: z.record(z.any()).optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contactId } = await params;
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const payload = updateSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    const updates: Record<string, any> = {};
    if (payload.name) updates.name = payload.name;
    if (payload.metadata) updates.metadata = payload.metadata;
    if (payload.status) {
      updates.status = payload.status;
      updates.unsubscribed_at =
        payload.status === 'subscribed' ? null : new Date().toISOString();
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('newsletter_contacts').update(updates).eq('id', contactId);
      if (error) throw error;
    }

    if (payload.groupIds) {
      await replaceContactGroups(supabase, contactId, payload.groupIds);
    }

    const refreshed = await supabase
      .from('newsletter_contacts')
      .select(
        'id,email,name,status,origin,subscribed_at,unsubscribed_at,metadata,created_at,contact_groups:newsletter_contact_groups(group_id)',
      )
      .eq('id', contactId)
      .single();

    if (refreshed.error) throw refreshed.error;

    return NextResponse.json({
      success: true,
      contact: {
        ...refreshed.data,
        groups: (refreshed.data.contact_groups || []).map((g: { group_id: string }) => g.group_id),
      },
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] contacts PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo actualizar el contacto' },
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
    const { error } = await supabase.from('newsletter_contacts').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] contacts DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo eliminar el contacto' },
      { status: 500 },
    );
  }
}

