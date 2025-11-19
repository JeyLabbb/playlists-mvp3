import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sendEmail';
import {
  ensureContactByEmail,
  assignContactToGroups,
  getNewsletterAdminClient,
} from '@/lib/newsletter/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional(),
  source: z.string().trim().max(120).optional(),
});

async function getDefaultGroupId() {
  try {
    const supabase = await getNewsletterAdminClient();
    const { data } = await supabase
      .from('newsletter_groups')
      .select('id')
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}

async function upsertNewsletterProfile(email: string, name?: string, source?: string) {
  const normalizedEmail = email.toLowerCase();
  const supabase = getSupabaseAdmin();
  const contactClient = await getNewsletterAdminClient();
  const now = new Date().toISOString();

  try {
    const kv = await import('@vercel/kv');
    const key = `jey_user_profile:${normalizedEmail}`;
    const existing = (await kv.kv.get<Record<string, any>>(key)) || {};
    await kv.kv.set(key, {
      ...existing,
      email,
      displayName: existing?.displayName || name || email.split('@')[0],
      newsletterOptIn: true,
      newsletterOptInAt: now,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    });
  } catch (error) {
    console.warn('[NEWSLETTER] Failed to update KV profile:', error);
  }

  try {
    if (supabase) {
      await supabase
        .from('users')
        .update({
          marketing_opt_in: true,
          updated_at: now,
        })
        .eq('email', normalizedEmail);

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
    }
  } catch (error) {
    console.warn('[NEWSLETTER] Failed to update legacy newsletter table:', error);
  }

  try {
    const contact = await ensureContactByEmail(contactClient, normalizedEmail, {
      name,
      origin: source || 'public-form',
    });

    await contactClient
      .from('newsletter_contacts')
      .update({
        status: 'subscribed',
        unsubscribed_at: null,
        origin: source || contact.origin || 'public-form',
      })
      .eq('id', contact.id);

    const defaultGroupId = await getDefaultGroupId();
    if (defaultGroupId) {
      await assignContactToGroups(contactClient, contact.id, [defaultGroupId]);
    }
  } catch (error) {
    console.warn('[NEWSLETTER] Failed to sync newsletter contact:', error);
  }
}

async function notifyAdmin(email: string, name?: string, source?: string) {
  const adminEmail = process.env.CONTACT_EMAIL;
  if (!adminEmail) return;

  const subject = `Nuevo miembro newsletter: ${email}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
      <h3>Nuevo alta en el boletín de PLEIA</h3>
      <p><strong>Email:</strong> ${email}</p>
      ${name ? `<p><strong>Nombre:</strong> ${name}</p>` : ''}
      ${source ? `<p><strong>Origen:</strong> ${source}</p>` : ''}
      <p>Se ha marcado la casilla de newsletter.</p>
    </div>
  `;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
  });

  if (!result.ok) {
    console.warn('[NEWSLETTER] Failed to notify admin:', result.error);
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = subscribeSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, name, source } = parsed.data;

    await upsertNewsletterProfile(email, name, source);
    await notifyAdmin(email, name, source);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[NEWSLETTER] Subscribe error:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo registrar en la newsletter' },
      { status: 500 },
    );
  }
}

