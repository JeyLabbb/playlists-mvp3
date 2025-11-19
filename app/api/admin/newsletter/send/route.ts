import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseRouteClient } from '@/lib/supabase/routeClient';
import { sendNewsletterEmail } from '@/lib/email/newsletterProvider';

const bodySchema = z.object({
  subject: z.string().min(1).max(120).optional(),
  title: z.string().min(1).max(120).optional(),
  message: z.string().min(1).max(5000).optional(),
  previewOnly: z.boolean().optional(),
  recipientEmails: z.array(z.string().email()).optional(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const payload = bodySchema.parse(body);

    const supabase = getSupabaseAdmin() ?? (await createSupabaseRouteClient());

    // Build full recipient list using same logic as list endpoint
    const userQuery = await supabase.from('users').select('*');
    if (userQuery.error) throw userQuery.error;

    const newsletterQuery = await supabase
      .from('newsletter')
      .select('email')
      .neq('email', null);
    if (newsletterQuery.error) throw newsletterQuery.error;

    const mergedRecipients = new Set<string>();

    (userQuery.data || []).forEach((user) => {
      const email = user.email?.toLowerCase();
      if (!email) return;

      const marketingOptIn = Boolean(
        Object.prototype.hasOwnProperty.call(user, 'marketing_opt_in')
          ? user.marketing_opt_in
          : false,
      );
      const newsletterOptIn = Boolean(
        Object.prototype.hasOwnProperty.call(user, 'newsletter_opt_in')
          ? user.newsletter_opt_in
          : false,
      );

      if (marketingOptIn || newsletterOptIn) {
        mergedRecipients.add(email);
      }
    });

    (newsletterQuery.data || []).forEach((row) => {
      const email = row.email?.toLowerCase();
      if (!email) return;
      mergedRecipients.add(email);
    });

    if (!mergedRecipients.size) {
      return NextResponse.json({ success: false, error: 'No subscribers to notify' }, { status: 400 });
    }

    let targetRecipients: string[];
    if (payload.previewOnly) {
      targetRecipients = [adminAccess.email];
    } else if (payload.recipientEmails?.length) {
      const requested = new Set(payload.recipientEmails.map((email: string) => email.toLowerCase()));
      targetRecipients = Array.from(mergedRecipients).filter((email) => requested.has(email));
    } else {
      targetRecipients = Array.from(mergedRecipients);
    }

    if (!targetRecipients.length) {
      return NextResponse.json({ success: false, error: 'Selecciona al menos un destinatario' }, { status: 400 });
    }

    console.log('[NEWSLETTER] Dispatch requested', {
      totalSubscribers: mergedRecipients.size,
      targetCount: targetRecipients.length,
      previewOnly: payload.previewOnly ?? false,
      subjectPreview: payload.subject?.slice(0, 80) || '(default)',
      adminInvoker: adminAccess.email,
    });

    const result = await sendNewsletterEmail(targetRecipients, {
      subject: payload.subject,
      title: payload.title,
      message: payload.message,
      previewOnly: payload.previewOnly ?? false,
    });

    if (!result.ok) {
      const msg =
        result.reason === 'missing-api-key'
          ? 'RESEND_API_KEY no está configurada. Añádela a tu entorno para enviar newsletters reales.'
          : result.reason === 'empty-recipients'
            ? 'No hay suscriptores disponibles para enviar.'
            : 'No se pudo enviar la newsletter.';

      return NextResponse.json(
        {
          success: false,
          error: msg,
          reason: result.reason,
        },
        { status: 400 },
      );
    }

    console.log('[NEWSLETTER] Dispatch result', {
      queued: result.queued,
      previewOnly: result.previewOnly ?? false,
      provider: result.provider,
      reason: result.reason ?? null,
    });

    return NextResponse.json({
      success: true,
      queued: result.queued,
      provider: result.provider,
      previewOnly: payload.previewOnly ?? false,
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] Send error:', error);
    const status = error?.status ?? 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send newsletter' },
      { status },
    );
  }
}


