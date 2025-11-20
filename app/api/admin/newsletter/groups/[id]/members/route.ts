import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

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
      .from('newsletter_contact_groups')
      .select(
        `
        contact_id,
        contact:newsletter_contacts(
          id,
          email,
          name,
          status,
          subscribed_at,
          created_at
        )
      `,
      )
      .eq('group_id', params.id);

    if (error) throw error;

    const members = (data || []).map((item: any) => {
      const contact = Array.isArray(item.contact) ? item.contact[0] : item.contact;
      return {
        contactId: item.contact_id,
        id: contact?.id,
        email: contact?.email,
        name: contact?.name,
        status: contact?.status,
        subscribed_at: contact?.subscribed_at,
        created_at: contact?.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] group members GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar los miembros del grupo' },
      { status: 500 },
    );
  }
}

