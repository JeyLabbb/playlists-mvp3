import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { getUsageLimit } from '@/lib/billing/usage';
import { ensureContactByEmail } from '@/lib/newsletter/server';

const bodySchema = z.object({
  email: z.string().email(),
  manuallyAdded: z.boolean().optional(),
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
    const now = new Date().toISOString();

    console.log('[NEWSLETTER][ADD] Incoming request', {
      email: normalizedEmail,
      manuallyAdded: payload.manuallyAdded ?? true,
      admin: adminAccess.email,
    });

    const { data: existingUser, error: userFetchError } = await supabase
      .from('users')
      .select(
        'id, email, plan, usage_count, max_uses, marketing_opt_in, terms_accepted_at, created_at',
      )
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userFetchError) {
      console.error('[NEWSLETTER][ADD] Supabase user fetch error', userFetchError);
      throw userFetchError;
    }

    console.log('[NEWSLETTER][ADD] Existing user lookup', {
      found: Boolean(existingUser),
      marketing_opt_in: existingUser?.marketing_opt_in ?? null,
      plan: existingUser?.plan ?? null,
    });

    if (existingUser?.marketing_opt_in) {
      return NextResponse.json(
        { success: false, error: 'El usuario ya está suscrito a la newsletter' },
        { status: 409 },
      );
    }

    let targetUserId = existingUser?.id ?? null;

    if (existingUser) {
      const updatePayload: Record<string, any> = {
        marketing_opt_in: true,
      };
      updatePayload.marketing_opt_in = true;
      if (!existingUser.plan) updatePayload.plan = 'free';
      if (typeof existingUser.usage_count !== 'number') updatePayload.usage_count = 0;
      if (existingUser.max_uses == null) updatePayload.max_uses = getUsageLimit();
      updatePayload.terms_accepted_at = existingUser.terms_accepted_at ?? now;

      console.log('[NEWSLETTER][ADD] Updating existing user', {
        userId: existingUser.id,
        updatePayload,
      });

      const { error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('[NEWSLETTER][ADD] Error updating user', updateError);
        throw updateError;
      }
    } else {
      console.log('[NEWSLETTER][ADD] Creating placeholder user');
      const insertPayload: Record<string, any> = {
        email: normalizedEmail,
        plan: 'free',
        usage_count: 0,
        max_uses: getUsageLimit(),
        marketing_opt_in: true,
        terms_accepted_at: now,
        created_at: now,
      };

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        console.error('[NEWSLETTER][ADD] Error inserting placeholder user', insertError);
        throw insertError;
      }

      targetUserId = insertedUser?.id ?? null;
    }

    console.log('[NEWSLETTER][ADD] Upserting into newsletter table', {
      userId: targetUserId,
      email: normalizedEmail,
    });
    const { error } = await supabase
      .from('newsletter')
      .upsert(
        {
          email: normalizedEmail,
          manually_added: payload.manuallyAdded ?? true,
          subscribed_at: now,
        },
        { onConflict: 'email' },
      );

    if (error) {
      console.error('[NEWSLETTER][ADD] Newsletter upsert error', error);
      throw error;
    }

    console.log('[NEWSLETTER][ADD] Ensuring contact profile');
    await ensureContactByEmail(supabase, normalizedEmail, { origin: 'legacy-add' });

    console.log('[NEWSLETTER][ADD] Completed successfully', { email: normalizedEmail });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] Add error:', error);
    const status = error?.status ?? 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add subscriber' },
      { status },
    );
  }
}


