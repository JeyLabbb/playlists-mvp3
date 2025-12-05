import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const PIXEL = Buffer.from('R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64');

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('c');
    const recipientId = url.searchParams.get('r');
    if (campaignId && recipientId) {
      const supabase = await getNewsletterAdminClient();
      await supabase
        .from('newsletter_campaign_recipients')
        .update({
          opened_at: new Date().toISOString(),
        })
        .eq('id', recipientId)
        .eq('campaign_id', campaignId)
        .is('opened_at', null);

      await supabase.from('newsletter_events').insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        occurred_at: new Date().toISOString(),
        event_type: 'opened',
      });
    }
  } catch (error) {
    console.error('[NEWSLETTER] track open error:', error);
  }

  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Length': PIXEL.length.toString(),
    },
  });
}

