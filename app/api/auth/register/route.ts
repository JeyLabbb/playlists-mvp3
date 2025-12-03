import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUsageLimit } from '@/lib/billing/usage';

async function updateKvProfile(email: string, name?: string, newsletterOptIn?: boolean) {
  try {
    const kv = await import('@vercel/kv');
    const profileKey = `jey_user_profile:${email}`;
    const existing =
      (await kv.kv.get<Record<string, any>>(profileKey)) || {};
    const now = new Date().toISOString();
    const username =
      existing?.username ||
      email.split('@')[0];

    await kv.kv.set(profileKey, {
      ...existing,
      email,
      username,
      displayName: existing?.displayName || name || username,
      plan: existing?.plan || 'free',
      newsletterOptIn: !!newsletterOptIn,
      acceptedTermsAt: now,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    });
  } catch (error) {
    console.warn('[AUTH] Failed to update KV profile:', error);
  }
}

function buildUsername(email: string, userId?: string | null) {
  const local = (email.split('@')[0] || 'pleia')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .substring(0, 20) || 'pleia';
  const suffix = userId
    ? userId.replace(/[^a-z0-9]/gi, '').slice(0, 6)
    : Math.random().toString(36).slice(2, 6);
  return `${local}-${suffix}`.substring(0, 30);
}

async function upsertPleiaUser(params: {
  email: string;
  userId?: string | null;
  newsletterOptIn: boolean;
}) {
  const { email, userId, newsletterOptIn } = params;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const normalizedEmail = email.toLowerCase();
  const now = new Date().toISOString();
  const defaultMaxUses = getUsageLimit();

  try {
    const { data: existingUser } = await admin
      .from('users')
      .select(
        'id, usage_count, max_uses, plan, is_founder, marketing_opt_in, terms_accepted_at, created_at, username',
      )
      .eq('email', normalizedEmail)
      .maybeSingle();

    const payload: any = {
      email: normalizedEmail,
      plan: existingUser?.plan || 'free',
      usage_count: existingUser?.usage_count ?? 0,
      max_uses:
        existingUser?.max_uses === null
          ? null
          : existingUser?.max_uses ?? defaultMaxUses,
      is_founder: existingUser?.is_founder ?? false,
      marketing_opt_in:
        typeof existingUser?.marketing_opt_in === 'boolean'
          ? existingUser.marketing_opt_in || newsletterOptIn
          : newsletterOptIn,
      terms_accepted_at: existingUser?.terms_accepted_at || now,
    };

    if (existingUser?.id) {
      payload.id = existingUser.id;
    } else if (userId) {
      payload.id = userId;
      payload.created_at = existingUser?.created_at || now;
    } else {
      payload.created_at = existingUser?.created_at || now;
    }

    if (!existingUser?.username) {
      payload.username = buildUsername(normalizedEmail, payload.id);
    }

    await admin
      .from('users')
      .upsert(payload, { onConflict: 'email' });
  } catch (error) {
    console.warn('[AUTH] Failed to upsert users row:', error);
  }
}

async function syncNewsletter(email: string, newsletterOptIn: boolean, manuallyAdded = false) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const normalizedEmail = email.toLowerCase();
  const now = new Date().toISOString();

  try {
    if (newsletterOptIn) {
      await admin
        .from('newsletter')
        .upsert(
          {
            email: normalizedEmail,
            subscribed_at: now,
            manually_added: manuallyAdded,
          },
          { onConflict: 'email' },
        );
    } else {
      await admin.from('newsletter').delete().eq('email', normalizedEmail);
    }
  } catch (error) {
    console.warn('[AUTH] Failed to sync newsletter subscription:', error);
  }
}

async function notifyNewsletter(email: string, name?: string) {
  const adminEmail = process.env.CONTACT_EMAIL;
  if (!adminEmail) return;

  const subject = `Nuevo alta newsletter: ${email}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
      <h3>Nuevo miembro del boletín de PLEIA</h3>
      <p><strong>Email:</strong> ${email}</p>
      ${name ? `<p><strong>Nombre:</strong> ${name}</p>` : ''}
      <p>Registrado desde el formulario de registro.</p>
    </div>
  `;

  try {
    const { sendEmail } = await import('@/lib/email/sendEmail');
    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
    });
    if (!result.ok) {
      console.warn('[AUTH] Failed to notify admin about newsletter opt-in:', result.error);
    }
  } catch (error) {
    console.warn('[AUTH] Failed to send newsletter notification:', error);
  }
}

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().trim().max(120).optional(),
  termsAccepted: z.boolean().optional(),
  newsletterOptIn: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Datos de registro inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      email,
      password,
      name,
      termsAccepted = false,
      newsletterOptIn = false,
    } = parsed.data;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { ok: false, error: 'Debes aceptar los términos y condiciones.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : 'https://playlists.jeylabbb.com/auth/callback',
      },
    });

    if (error) {
      const message = error.message === 'User already registered'
        ? 'Este email ya tiene una cuenta. Inicia sesión.'
        : error.message;
      return NextResponse.json(
        { ok: false, error: message },
        { status: 400 }
      );
    }

    // CRÍTICO: Auto-confirmar el email SIEMPRE para que el usuario pueda iniciar sesión inmediatamente
    // No enviamos emails de confirmación, así que confirmamos automáticamente
    if (data?.user?.id) {
      try {
        const admin = getSupabaseAdmin();
        if (admin) {
          const { error: confirmError } = await admin.auth.admin.updateUserById(
            data.user.id,
            { email_confirm: true }
          );
          if (confirmError) {
            console.error('[AUTH] ❌ CRITICAL: Failed to auto-confirm email:', confirmError);
            // Si falla la confirmación, el usuario no podrá iniciar sesión
            // Por eso es crítico que funcione
            return NextResponse.json(
              { ok: false, error: 'Error al confirmar el email. Por favor, intenta de nuevo.' },
              { status: 500 }
            );
          } else {
            console.log('[AUTH] ✅ Email auto-confirmed for user:', email);
          }
        } else {
          console.error('[AUTH] ❌ CRITICAL: Admin client not available for email confirmation');
          return NextResponse.json(
            { ok: false, error: 'Error de configuración del servidor. Por favor, contacta al soporte.' },
            { status: 500 }
          );
        }
      } catch (confirmErr) {
        console.error('[AUTH] ❌ CRITICAL: Error during email auto-confirmation:', confirmErr);
        return NextResponse.json(
          { ok: false, error: 'Error al confirmar el email. Por favor, intenta de nuevo.' },
          { status: 500 }
        );
      }
    } else {
      console.error('[AUTH] ❌ CRITICAL: No user ID returned from signUp');
      return NextResponse.json(
        { ok: false, error: 'Error al crear la cuenta. Por favor, intenta de nuevo.' },
        { status: 500 }
      );
    }

    await updateKvProfile(email, name, newsletterOptIn);
    await upsertPleiaUser({ email, userId: data?.user?.id, newsletterOptIn });
    await syncNewsletter(email, newsletterOptIn);
    if (newsletterOptIn) {
      await notifyNewsletter(email, name);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[AUTH] Error registering user:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al crear la cuenta' },
      { status: 500 }
    );
  }
}

