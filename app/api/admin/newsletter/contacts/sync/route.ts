import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { ensureContactByEmail } from '@/lib/newsletter/server';

export async function POST(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUser = getSupabaseAdmin() ?? (await createSupabaseRouteClient());
    if (!supabaseUser) {
      return NextResponse.json({ success: false, error: 'Supabase no configurado' }, { status: 500 });
    }

    const { data: users, error } = await supabaseUser
      .from('users')
      .select('id,email,plan,marketing_opt_in,created_at')
      .or('marketing_opt_in.eq.true');
    if (error) throw error;

    const contactClient = supabaseUser;
    let synced = 0;

    for (const user of users || []) {
      if (!user.email) continue;
      try {
        const contact = await ensureContactByEmail(contactClient, user.email, {
          origin: 'supabase-users',
        });
        await contactClient
          .from('newsletter_contacts')
          .update({
            plan: user.plan || contact?.plan || null,
            is_founder: contact?.is_founder || false,
            metadata: {
              ...(contact?.metadata || {}),
              plan: user.plan,
              is_founder: false,
              source: 'supabase-users',
            },
            status: 'subscribed',
            unsubscribed_at: null,
          })
          .eq('email', user.email.toLowerCase());
        synced += 1;
      } catch (innerError) {
        console.warn('[NEWSLETTER] contact sync error', innerError);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] contacts sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo sincronizar' },
      { status: 500 },
    );
  }
}

