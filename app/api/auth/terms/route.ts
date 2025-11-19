import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getOrCreateUsageUser } from '@/lib/billing/usage';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';

const bodySchema = z.object({
  marketingOptIn: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const pleiaUser = await getPleiaServerUser();
    if (!pleiaUser?.id || !pleiaUser?.email) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const supabase = admin ?? (await createSupabaseRouteClient());
    const normalizedEmail = pleiaUser.email.toLowerCase();
    let marketingOptIn = !!parsed.data.marketingOptIn;
    try {
      const { data: existingNewsletter } = await supabase
        .from('newsletter')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (existingNewsletter?.email) {
        marketingOptIn = true;
      }
    } catch (newsletterLookupError) {
      console.warn('[AUTH] Failed to inspect newsletter subscription during terms acceptance:', newsletterLookupError);
    }

    const now = new Date().toISOString();

    const usageUser = await getOrCreateUsageUser({
      userId: pleiaUser.id,
      email: pleiaUser.email,
    });

    if (!usageUser) {
      return NextResponse.json(
        { ok: false, error: 'Failed to locate user record' },
        { status: 500 },
      );
    }

    const hasColumn = (column: string) =>
      Object.prototype.hasOwnProperty.call(usageUser, column);

    const updatePayload: Record<string, any> = {};

    if (hasColumn('terms_accepted_at')) {
      updatePayload.terms_accepted_at = now;
    }
    if (hasColumn('marketing_opt_in')) {
      updatePayload.marketing_opt_in = marketingOptIn;
    }
    if (hasColumn('newsletter_opt_in')) {
      updatePayload.newsletter_opt_in = marketingOptIn;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', pleiaUser.id);

      if (error) {
        if (error.code === '42703') {
          console.warn('[AUTH] Skipping optional columns during terms acceptance:', error);
        } else {
          console.warn('[AUTH] Failed to update terms acceptance:', error);
          return NextResponse.json(
            { ok: false, error: 'Failed to update user record' },
            { status: 500 },
          );
        }
      }
    }

    try {
      if (marketingOptIn) {
        await supabase
          .from('newsletter')
          .upsert(
            {
              email: normalizedEmail,
              subscribed_at: now,
              manually_added: false,
            },
            { onConflict: 'email' },
          );
      } else {
        await supabase.from('newsletter').delete().eq('email', normalizedEmail);
      }
    } catch (newsletterError) {
      console.warn('[AUTH] Failed to sync newsletter opt-in:', newsletterError);
    }

    return NextResponse.json({
      ok: true,
      termsAcceptedAt: now,
      marketingOptIn,
    });
  } catch (error) {
    console.error('[AUTH] terms acceptance error:', error);
    return NextResponse.json(
      { ok: false, error: 'Unexpected error' },
      { status: 500 },
    );
  }
}


