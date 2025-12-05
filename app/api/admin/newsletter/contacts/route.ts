import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

const createContactSchema = z.object({
  email: z.string().email(),
});

function normalizeStatus(user: any) {
  return user.marketing_opt_in ? 'subscribed' : 'unsubscribed';
}

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin() ?? (await createSupabaseRouteClient());
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 },
      );
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('q');
    const planFilter = url.searchParams.get('plan');
    const founderFilter = url.searchParams.get('isFounder');
    const dateFrom = url.searchParams.get('from');
    const dateTo = url.searchParams.get('to');
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id,email,plan,marketing_opt_in,created_at')
      .or('marketing_opt_in.eq.true')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    const normalizedUsers =
      (usersData || []).map((user) => ({
        id: user.id,
        email: user.email,
        name: null,
        status: normalizeStatus(user),
        origin: 'users',
        plan: user.plan,
        is_founder: false,
        subscribed_at: user.created_at,
        groups: [],
        manually_added: false,
      })) ?? [];

    const normalizedEmails = new Set(
      normalizedUsers.map((user) => user.email?.toLowerCase()).filter(Boolean),
    );

    const { data: legacyNewsletter } = await supabase
      .from('newsletter')
      .select('email, subscribed_at, manually_added');

    const manualEntries =
      (legacyNewsletter || [])
        .filter((row) => {
          const email = row.email?.toLowerCase();
          return email && !normalizedEmails.has(email);
        })
        .map((row) => ({
          id: null,
          email: row.email,
          name: null,
          status: 'subscribed',
          origin: 'newsletter',
          plan: null,
          is_founder: false,
          subscribed_at: row.subscribed_at,
          groups: [],
          manually_added: Boolean(row.manually_added),
        })) ?? [];

    let merged = [...normalizedUsers, ...manualEntries];

    if (search) {
      const needle = search.toLowerCase();
      merged = merged.filter((contact) => contact.email?.toLowerCase().includes(needle));
    }

    if (planFilter) merged = merged.filter((contact) => (contact.plan || 'free') === planFilter);
    if (founderFilter === 'true') merged = merged.filter((contact) => contact.is_founder);
    if (founderFilter === 'false') merged = merged.filter((contact) => !contact.is_founder);
    if (dateFrom) merged = merged.filter((contact) => contact.subscribed_at >= dateFrom);
    if (dateTo) merged = merged.filter((contact) => contact.subscribed_at <= dateTo);

    const contacts = merged.slice(0, limit);

    return NextResponse.json({
      success: true,
      contacts,
      total: merged.length,
      limit,
      offset: 0,
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] contacts GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar los usuarios' },
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

    const payload = createContactSchema.parse(await request.json());
    const supabase = getSupabaseAdmin() ?? (await createSupabaseRouteClient());
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 },
      );
    }

    const { error } = await supabase
      .from('newsletter')
      .upsert(
        {
          email: payload.email.toLowerCase(),
          subscribed_at: new Date().toISOString(),
          manually_added: true,
        },
        { onConflict: 'email' },
      );
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] contacts POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo registrar el usuario' },
      { status: 500 },
    );
  }
}

