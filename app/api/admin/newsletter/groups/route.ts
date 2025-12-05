import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();

    const { data: groups, error } = await supabase
      .from('newsletter_groups')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;

    const { data: membershipRows, error: membershipError } = await supabase
      .from('newsletter_contact_groups')
      .select('group_id');
    if (membershipError) throw membershipError;

    const counts = new Map<string, number>();
    (membershipRows || []).forEach(({ group_id }) => {
      counts.set(group_id, (counts.get(group_id) || 0) + 1);
    });

    return NextResponse.json({
      success: true,
      groups: (groups || []).map((group) => ({
        ...group,
        member_count: counts.get(group.id) || 0,
      })),
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] groups GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar los grupos' },
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
    const payload = createGroupSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    const { data, error } = await supabase
      .from('newsletter_groups')
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        is_default: payload.is_default ?? false,
        metadata: payload.metadata ?? {},
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({
      success: true,
      group: { ...data, member_count: 0 },
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] groups POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo crear el grupo' },
      { status: 500 },
    );
  }
}

