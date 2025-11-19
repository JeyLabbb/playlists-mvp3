import { NextResponse } from 'next/server';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('c');
  const recipientId = url.searchParams.get('r');
  const target = url.searchParams.get('u');

  let redirectUrl = 'https://pleia.app';
  if (target && /^https?:\/\//i.test(target)) {
    redirectUrl = target;
  }

  if (campaignId && recipientId) {
    try {
      const supabase = await getNewsletterAdminClient();
      await supabase
        .from('newsletter_campaign_recipients')
        .update({
          clicked_at: new Date().toISOString(),
        })
        .eq('id', recipientId)
        .eq('campaign_id', campaignId)
        .is('clicked_at', null);

      await supabase.from('newsletter_events').insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        occurred_at: new Date().toISOString(),
        event_type: 'clicked',
        meta: { url: redirectUrl },
      });
    } catch (error) {
      console.error('[NEWSLETTER] track click error:', error);
    }
  }

  return NextResponse.redirect(redirectUrl, { status: 302 });
}

