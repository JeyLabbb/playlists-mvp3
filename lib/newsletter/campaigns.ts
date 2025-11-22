import { sendNewsletterEmail } from '@/lib/email/newsletterProvider';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export type CampaignContentPayload = {
  subject: string;
  title: string;
  body: string;
  primaryCta?: { label: string; url: string };
  secondaryCta?: { label: string; url: string };
};

export async function deliverCampaignNow({
  supabase,
  campaign,
  recipients,
  content,
  trackingEnabled = true,
}: {
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>;
  campaign: any;
  recipients: any[];
  content: CampaignContentPayload;
}) {
  if (!recipients.length) return;

  await supabase
    .from('newsletter_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaign.id);

  const tokenMap: Record<string, { recipientId: string }> = {};
  if (trackingEnabled) {
    recipients.forEach((recipient) => {
      tokenMap[recipient.email.toLowerCase()] = { recipientId: recipient.id };
    });
  }

  for (const recipient of recipients) {
    try {
      await sendNewsletterEmail(
        [{ email: recipient.email, contactId: recipient.contact_id, recipientId: recipient.id }],
        {
          subject: content.subject,
          title: content.title,
          message: content.body,
          primaryCta: content.primaryCta,
          secondaryCta: content.secondaryCta,
          campaignContext: trackingEnabled
            ? {
                campaignId: campaign.id,
                recipientTokenMap: tokenMap,
              }
            : undefined,
        },
      );

      await supabase
        .from('newsletter_campaign_recipients')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
        })
        .eq('id', recipient.id);

      await supabase.from('newsletter_events').insert({
        campaign_id: campaign.id,
        recipient_id: recipient.id,
        contact_id: recipient.contact_id,
        occurred_at: new Date().toISOString(),
        event_type: 'delivered',
      });
    } catch (error) {
      console.error('[NEWSLETTER] deliverCampaignNow error', error);
      await supabase
        .from('newsletter_campaign_recipients')
        .update({
          status: 'failed',
          last_error: error instanceof Error ? error.message : 'unknown-error',
        })
        .eq('id', recipient.id);
    }
  }

  await supabase
    .from('newsletter_campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaign.id);
}

