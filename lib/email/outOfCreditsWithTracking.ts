/**
 * Service to send "out of credits" email with Newsletter HQ tracking
 * This version integrates with newsletter_campaigns for full analytics
 */

import { getSupabaseAdmin } from '../supabase/server';
import { generateOutOfCreditsEmailHTML, generateOutOfCreditsEmailText } from './templates/outOfCredits';
import { ensureContactByEmail } from '../newsletter/server';

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

    // 1. Ensure contact exists in newsletter system
    const contact = await ensureContactByEmail(supabase, normalizedEmail, {
      name: normalizedEmail.split('@')[0],
      origin: 'out_of_credits_automation',
    });

    console.log('[OUT_OF_CREDITS_TRACKING] Contact ensured:', contact.id);

    // 2. Get or create "Out of Credits" campaign
    const now = new Date().toISOString();
    const campaignName = 'Out of Credits · Automatic';
    const campaignSlug = 'out-of-credits-automatic';

    let { data: existingCampaign } = await supabase
      .from('newsletter_campaigns')
      .select('id')
      .eq('slug', campaignSlug)
      .maybeSingle();

    let campaignId: string;

    if (existingCampaign) {
      campaignId = existingCampaign.id;
      console.log('[OUT_OF_CREDITS_TRACKING] Using existing campaign:', campaignId);
    } else {
      // Create campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from('newsletter_campaigns')
        .insert({
          name: campaignName,
          slug: campaignSlug,
          subject: 'Te has quedado sin playlists IA… pero tengo algo para ti.',
          title: 'PLEIA',
          body: 'Email automático cuando usuario agota sus créditos',
          primary_cta_label: 'Quiero playlists ilimitadas',
          primary_cta_url: 'https://playlists.jeylabbb.com/pricing',
          status: 'active',
          type: 'automated',
          created_at: now,
        })
        .select('id')
        .single();

      if (campaignError) {
        console.error('[OUT_OF_CREDITS_TRACKING] Error creating campaign:', campaignError);
        return { ok: false, error: campaignError.message };
      }

      campaignId = newCampaign.id;
      console.log('[OUT_OF_CREDITS_TRACKING] Created new campaign:', campaignId);
    }

    // 3. Create recipient entry
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

    // 4. Generate email content with tracking URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://playlists.jeylabbb.com';
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

    // 5. Send email via Resend (same config as other emails)
    const apiKey = process.env.RESEND_API_KEY;
    const rawFrom = process.env.RESEND_FROM || process.env.RESEND_NEWSLETTER_FROM || 'PLEIA <pleia@jeylabbb.com>';
    const from = rawFrom.replace(/^["']|["']$/g, '').trim();
    const replyTo = process.env.CONTACT_EMAIL || undefined;

    if (!apiKey) {
      console.error('[OUT_OF_CREDITS_TRACKING] ❌ RESEND_API_KEY missing');
      return { ok: false, error: 'RESEND_API_KEY missing' };
    }

    console.log('[OUT_OF_CREDITS_TRACKING] Sending via Resend...');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [normalizedEmail],
        subject: 'Te has quedado sin playlists IA… pero tengo algo para ti.',
        html: trackedHtml,
        text: textContent,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.error) {
      const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
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

    console.log('[OUT_OF_CREDITS_TRACKING] ✅ Email sent via Resend');

    // 6. Update recipient status to sent
    await supabase
      .from('newsletter_campaign_recipients')
      .update({
        status: 'sent',
        sent_at: now,
        delivered_at: now,
      })
      .eq('id', recipient.id);

    // 7. Record delivery event
    await supabase.from('newsletter_events').insert({
      campaign_id: campaignId,
      recipient_id: recipient.id,
      contact_id: contact.id,
      occurred_at: now,
      event_type: 'delivered',
    });

    console.log('[OUT_OF_CREDITS_TRACKING] ✅ Tracking events created');

    // 8. Mark email as sent in users table
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

