import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

const bodySchema = z.object({
  email: z.string().email(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = bodySchema.parse(body);

    const supabase = getSupabaseAdmin() ?? (await createSupabaseRouteClient());

    const normalizedEmail = payload.email.toLowerCase();

    const { error } = await supabase.from('newsletter').delete().eq('email', normalizedEmail);
    if (error) throw error;

    await supabase.from('newsletter_contacts').delete().eq('email', normalizedEmail);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] Remove error:', error);
    const status = error?.status ?? 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove subscriber' },
      { status },
    );
  }
}


