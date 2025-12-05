import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import {
  getNewsletterAdminClient,
  assignContactToGroups,
  removeContactFromGroups,
} from '@/lib/newsletter/server';

const bulkSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1),
  action: z.enum(['add-group', 'remove-group', 'unsubscribe']),
  groupId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = bulkSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    if ((payload.action === 'add-group' || payload.action === 'remove-group') && !payload.groupId) {
      return NextResponse.json(
        { success: false, error: 'Selecciona un grupo' },
        { status: 400 },
      );
    }

    if (payload.action === 'add-group') {
      await Promise.all(
        payload.contactIds.map((contactId) =>
          assignContactToGroups(supabase, contactId, [payload.groupId!])),
      );
    } else if (payload.action === 'remove-group') {
      await Promise.all(
        payload.contactIds.map((contactId) =>
          removeContactFromGroups(supabase, contactId, [payload.groupId!])),
      );
    } else if (payload.action === 'unsubscribe') {
      await supabase
        .from('newsletter_contacts')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
        })
        .in('id', payload.contactIds);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] contacts bulk action error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Acción masiva fallida' },
      { status: 500 },
    );
  }
}

