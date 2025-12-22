/**
 * Service to send "out of credits" email with Newsletter HQ tracking
 * This version integrates with newsletter_campaigns for full analytics
 */

import { getSupabaseAdmin } from '../supabase/server';
import { generateOutOfCreditsEmailHTML, generateOutOfCreditsEmailText } from './templates/outOfCredits';
import { ensureContactByEmail, getNewsletterAdminClient } from '../newsletter/server';
import { ensureOutOfCreditsWorkflow } from '../newsletter/workflows';
import { ensureMailEnv, getResendClient } from '../resend';

export type OutOfCreditsEmailTrackingResult =
  | { ok: true; emailSent: true; campaignId: string; recipientId: string }
  | { ok: true; emailSent: false; reason: 'already_sent' | 'no_email' | 'supabase_not_configured' }
  | { ok: false; error: string };

/**
 * Sends the "out of credits" email with full Newsletter HQ tracking
 * Creates a campaign entry and tracks opens/clicks
 * 
 * @param userId - The user's ID in Supabase
 * @param userEmail - The user's email address
 * @returns Result with campaign and recipient IDs for tracking
 */
export async function sendOutOfCreditsEmailWithTracking(
  userId: string,
  userEmail: string
): Promise<OutOfCreditsEmailTrackingResult> {
  try {
    // Validate inputs
    if (!userEmail || !userEmail.includes('@')) {
      console.warn('[OUT_OF_CREDITS_TRACKING] Invalid email provided:', userEmail);
      return { ok: true, emailSent: false, reason: 'no_email' };
    }

    // Get Supabase admin client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[OUT_OF_CREDITS_TRACKING] Supabase admin client not configured');
      return { ok: true, emailSent: false, reason: 'supabase_not_configured' };
    }

    const normalizedEmail = userEmail.toLowerCase();

    // Check if email was already sent
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('out_of_credits_email_sent')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[OUT_OF_CREDITS_TRACKING] Error fetching user:', fetchError);
      return { ok: false, error: fetchError.message };
    }

    if (!user) {
      console.warn('[OUT_OF_CREDITS_TRACKING] User not found:', userId);
      return { ok: false, error: 'User not found' };
    }

    if (user.out_of_credits_email_sent === true) {
      console.log('[OUT_OF_CREDITS_TRACKING] Email already sent to user:', normalizedEmail);
      return { ok: true, emailSent: false, reason: 'already_sent' };
    }

    console.log('[OUT_OF_CREDITS_TRACKING] ===== SENDING TRACKED EMAIL =====');
    console.log('[OUT_OF_CREDITS_TRACKING] User:', normalizedEmail);

    // 1. Ensure workflow exists in Newsletter HQ
    const newsletterClient = await getNewsletterAdminClient();
    const workflowId = await ensureOutOfCreditsWorkflow(newsletterClient);
    if (workflowId) {
      console.log('[OUT_OF_CREDITS_TRACKING] Workflow ensured:', workflowId);
    }

    // 2. Ensure contact exists in newsletter system
    const contact = await ensureContactByEmail(supabase, normalizedEmail, {
      name: normalizedEmail.split('@')[0],
      origin: 'out_of_credits_automation',
    });

    console.log('[OUT_OF_CREDITS_TRACKING] Contact ensured:', contact.id);

    // 3. Get or create "Out of Credits" campaign
    const now = new Date().toISOString();
    const campaignTitle = 'Out of Credits';
    const campaignSlug = 'out-of-credits-automatic';

    // Buscar por title y metadata.slug (ya que no existe columna slug)
    let { data: existingCampaigns } = await supabase
      .from('newsletter_campaigns')
      .select('id, title, metadata')
      .eq('title', campaignTitle);

    let existingCampaign = existingCampaigns && existingCampaigns.length > 0
      ? existingCampaigns.find((c: any) => c.metadata?.slug === campaignSlug) || existingCampaigns[0]
      : null;

    let campaignId: string;

    if (existingCampaign) {
      campaignId = existingCampaign.id;
      console.log('[OUT_OF_CREDITS_TRACKING] Using existing campaign:', campaignId);
    } else {
      // Create campaign linked to workflow
      const { data: newCampaign, error: campaignError } = await supabase
        .from('newsletter_campaigns')
        .insert({
          title: campaignTitle,
          subject: 'Te has quedado sin playlists IA… pero tengo algo para ti.',
          preheader: 'Opciones para continuar creando playlists ilimitadas',
          body: `Hey,

he visto que te has quedado sin usos en PLEIA.

Y antes de que cierres la pestaña pensando "bueno, ya está", te cuento algo rápido.

Hay un motivo por el que PLEIA te ha enganchado: te ahorra tiempo, te inspira, y te crea playlists que tú no podrías hacer ni en media hora.

Y sé que jode quedarse justo en lo mejor. Ese momento de escribir un prompt y que bam, aparece una playlist que encaja contigo.

Por eso tienes dos caminos desde aquí (y ambos te desbloquean acceso ilimitado para siempre):

👉 Opción 1 – Rápida
Invita a 3 amigos con tu enlace y listo. Acceso ilimitado de por vida. (No pagas nada. Literal.)

👉 Opción 2 – Directa
Hazte founder por 5€ y accede para siempre. Sin límites. Sin mensualidades.

Solo los primeros miles tendrán acceso ilimitado. Después esto cambiará.

Nos vemos dentro.

— MTRYX, fundadores de PLEIA`,
          primary_cta_label: 'Quiero playlists ilimitadas',
          primary_cta_url: 'https://playlists.jeylabbb.com/pricing',
          status: 'active',
          send_mode: 'immediate',
          created_by: 'system',
          metadata: {
            slug: campaignSlug,
            type: 'automated',
            workflow_id: workflowId || null,
            mail_category: 'retention',
            tracking_enabled: true,
            automated: true,
            trigger: 'out_of_credits',
          },
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (campaignError) {
        console.error('[OUT_OF_CREDITS_TRACKING] Error creating campaign:', campaignError);
        return { ok: false, error: campaignError.message };
      }

      campaignId = newCampaign.id;
      console.log('[OUT_OF_CREDITS_TRACKING] Created new campaign:', campaignId);
      
      // Update workflow with campaign reference
      if (workflowId) {
        await supabase
          .from('newsletter_workflow_steps')
          .update({
            action_config: {
              campaign_id: campaignId,
              tracking_enabled: true,
            },
          })
          .eq('workflow_id', workflowId)
          .eq('step_order', 0);
      }
    }

    // 4. Create recipient entry
    const { data: recipient, error: recipientError } = await supabase
      .from('newsletter_campaign_recipients')
      .insert({
        campaign_id: campaignId,
        contact_id: contact.id,
        email: normalizedEmail,
        status: 'pending',
        created_at: now,
      })
      .select('id')
      .single();

    if (recipientError) {
      console.error('[OUT_OF_CREDITS_TRACKING] Error creating recipient:', recipientError);
      return { ok: false, error: recipientError.message };
    }

    console.log('[OUT_OF_CREDITS_TRACKING] Recipient created:', recipient.id);

    // 5. Generate email content with tracking URLs
    // Use production domain to avoid spam filters (URLs must match sending domain)
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.PRODUCTION_URL || 'https://playlists.jeylabbb.com';
    // Ensure we're not using Vercel preview URLs
    if (baseUrl.includes('vercel.app')) {
      baseUrl = process.env.PRODUCTION_URL || 'https://playlists.jeylabbb.com';
    }
    const pricingUrl = `${baseUrl}/pricing`;
    
    // Build tracking URL for CTA
    const trackingUrl = new URL('/api/newsletter/track/click', baseUrl);
    trackingUrl.searchParams.set('c', campaignId);
    trackingUrl.searchParams.set('r', recipient.id);
    trackingUrl.searchParams.set('u', pricingUrl);
    trackingUrl.searchParams.set('l', 'primary');

    const htmlContent = generateOutOfCreditsEmailHTML(trackingUrl.toString());
    const textContent = generateOutOfCreditsEmailText();

    // Add tracking pixel for opens
    const pixelUrl = new URL('/api/newsletter/track/open', baseUrl);
    pixelUrl.searchParams.set('c', campaignId);
    pixelUrl.searchParams.set('r', recipient.id);
    const pixelTag = `<img src="${pixelUrl.toString()}" alt="" width="1" height="1" style="display:none;max-height:0px;max-width:0px;" />`;
    const trackedHtml = htmlContent.includes('</body>') 
      ? htmlContent.replace('</body>', `${pixelTag}</body>`)
      : `${htmlContent}${pixelTag}`;

    // 6. Send email via Resend usando la misma configuración base que el welcome mail
    const { from } = ensureMailEnv();
    const resend = getResendClient();

    console.log('[OUT_OF_CREDITS_TRACKING] Sending via Resend (SDK)...');

    try {
      const result = await resend.emails.send({
        from,
        to: [normalizedEmail],
        subject: 'Te has quedado sin playlists IA… pero tengo algo para ti.',
        html: trackedHtml,
        text: textContent,
      });

      console.log('[OUT_OF_CREDITS_TRACKING] ✅ Email sent via Resend', result);
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      console.error('[OUT_OF_CREDITS_TRACKING] ❌ Resend failed:', message);
      
      // Update recipient status to failed
      await supabase
        .from('newsletter_campaign_recipients')
        .update({
          status: 'failed',
          last_error: message,
        })
        .eq('id', recipient.id);

      return { ok: false, error: message };
    }

    // 7. Update recipient status to sent
    await supabase
      .from('newsletter_campaign_recipients')
      .update({
        status: 'sent',
        sent_at: now,
        delivered_at: now,
      })
      .eq('id', recipient.id);

    // 8. Record delivery event
    await supabase.from('newsletter_events').insert({
      campaign_id: campaignId,
      recipient_id: recipient.id,
      contact_id: contact.id,
      occurred_at: now,
      event_type: 'delivered',
    });

    console.log('[OUT_OF_CREDITS_TRACKING] ✅ Tracking events created');

    // 9. Mark email as sent in users table
    await supabase
      .from('users')
      .update({
        out_of_credits_email_sent: true,
        out_of_credits_email_sent_at: now,
      })
      .eq('id', userId);

    console.log('[OUT_OF_CREDITS_TRACKING] ✅ User flag updated');
    console.log('[OUT_OF_CREDITS_TRACKING] ===== SUCCESS =====');
    console.log('[OUT_OF_CREDITS_TRACKING] Campaign ID:', campaignId);
    console.log('[OUT_OF_CREDITS_TRACKING] Recipient ID:', recipient.id);

    return {
      ok: true,
      emailSent: true,
      campaignId,
      recipientId: recipient.id,
    };

  } catch (error: any) {
    console.error('[OUT_OF_CREDITS_TRACKING] ❌ Unexpected error:', error);
    return { ok: false, error: error.message || 'Unexpected error' };
  }
}

