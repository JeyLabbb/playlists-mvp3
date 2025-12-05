/**
 * Service to send "out of credits" email notification
 * This email is sent only once when a user first attempts to generate a playlist with 0 remaining uses
 * Uses same email configuration as lib/resend.js (RESEND_API_KEY, RESEND_FROM)
 */

import { generateOutOfCreditsEmailHTML, generateOutOfCreditsEmailText } from './templates/outOfCredits';
import { getSupabaseAdmin } from '../supabase/server';

export type OutOfCreditsEmailResult =
  | { ok: true; emailSent: true }
  | { ok: true; emailSent: false; reason: 'already_sent' | 'no_email' | 'supabase_not_configured' }
  | { ok: false; error: string };

/**
 * Sends the "out of credits" email to a user if they haven't received it before
 * Updates the database to mark the email as sent
 * 
 * @param userId - The user's ID in Supabase
 * @param userEmail - The user's email address
 * @returns Result indicating if email was sent or why it wasn't
 */
export async function sendOutOfCreditsEmail(
  userId: string,
  userEmail: string
): Promise<OutOfCreditsEmailResult> {
  try {
    // Validate inputs
    if (!userEmail || !userEmail.includes('@')) {
      console.warn('[OUT_OF_CREDITS_EMAIL] Invalid email provided:', userEmail);
      return { ok: true, emailSent: false, reason: 'no_email' };
    }

    // Get Supabase admin client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[OUT_OF_CREDITS_EMAIL] Supabase admin client not configured');
      return { ok: true, emailSent: false, reason: 'supabase_not_configured' };
    }

    // Check if email was already sent
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('out_of_credits_email_sent')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[OUT_OF_CREDITS_EMAIL] Error fetching user:', fetchError);
      return { ok: false, error: fetchError.message };
    }

    if (!user) {
      console.warn('[OUT_OF_CREDITS_EMAIL] User not found:', userId);
      return { ok: false, error: 'User not found' };
    }

    // If email was already sent, don't send again
    if (user.out_of_credits_email_sent === true) {
      console.log('[OUT_OF_CREDITS_EMAIL] Email already sent to user:', userEmail);
      return { ok: true, emailSent: false, reason: 'already_sent' };
    }

    // Generate email content
    const pricingUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
      : 'https://playlists.jeylabbb.com/pricing';
    
    const htmlContent = generateOutOfCreditsEmailHTML(pricingUrl);
    const textContent = generateOutOfCreditsEmailText();

    // Send email using same variables as sendConfirmationEmail in lib/resend.js
    const apiKey = process.env.RESEND_API_KEY;
    // 🚨 CRITICAL: Limpiar comillas dobles del from (pueden venir de variables de entorno)
    const rawFrom = process.env.RESEND_FROM || process.env.RESEND_NEWSLETTER_FROM || 'PLEIA <pleia@jeylabbb.com>';
    const from = rawFrom.replace(/^["']|["']$/g, '').trim(); // Eliminar comillas al inicio y final
    const replyTo = process.env.CONTACT_EMAIL || undefined;

    if (!apiKey) {
      console.error('[OUT_OF_CREDITS_EMAIL] ❌ RESEND_API_KEY missing');
      return { ok: false, error: 'RESEND_API_KEY missing' };
    }

    console.log('[OUT_OF_CREDITS_EMAIL] Sending email to:', userEmail);
    console.log('[OUT_OF_CREDITS_EMAIL] From:', from);
    
    const payload = {
      from,
      to: [userEmail],
      subject: 'Te has quedado sin playlists IA… pero tengo algo para ti.',
      html: htmlContent,
      text: textContent,
      ...(replyTo ? { reply_to: replyTo } : {}),
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.error) {
      const message =
        data?.error?.message ||
        data?.message ||
        (typeof data === 'string' ? data : null) ||
        `HTTP ${response.status}`;
      console.error('[OUT_OF_CREDITS_EMAIL] ❌ Resend API failed:', message);
      return { ok: false, error: message };
    }

    console.log('[OUT_OF_CREDITS_EMAIL] ✅ Email sent successfully. MessageId:', data?.id);

    // Mark email as sent in database
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('users')
      .update({
        out_of_credits_email_sent: true,
        out_of_credits_email_sent_at: now,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[OUT_OF_CREDITS_EMAIL] Error updating user flag:', updateError);
      // Email was sent but flag update failed - this is not critical
      // We'll log it but still return success
      console.warn('[OUT_OF_CREDITS_EMAIL] Email sent successfully but failed to update flag for user:', userId);
    }

    console.log('[OUT_OF_CREDITS_EMAIL] ✅ Successfully sent email to:', userEmail);
    return { ok: true, emailSent: true };

  } catch (error: any) {
    console.error('[OUT_OF_CREDITS_EMAIL] Unexpected error:', error);
    return { ok: false, error: error.message || 'Unexpected error sending email' };
  }
}

/**
 * Checks if a user should receive the out of credits email
 * (i.e., they have 0 remaining uses and haven't received the email yet)
 * 
 * @param userId - The user's ID in Supabase
 * @returns Boolean indicating if the email should be sent
 */
export async function shouldSendOutOfCreditsEmail(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return false;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('out_of_credits_email_sent, usage_count, max_uses, plan')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return false;
    }

    // Check if email was already sent
    if (user.out_of_credits_email_sent === true) {
      return false;
    }

    // Check if user has unlimited plan
    const unlimitedPlans = ['founder', 'premium', 'monthly', 'hub'];
    if (unlimitedPlans.includes(user.plan)) {
      return false;
    }

    // Check if user has 0 remaining uses
    const limit = user.max_uses || 5;
    const used = user.usage_count || 0;
    const remaining = Math.max(0, limit - used);

    return remaining === 0;

  } catch (error) {
    console.error('[OUT_OF_CREDITS_EMAIL] Error checking if should send email:', error);
    return false;
  }
}

