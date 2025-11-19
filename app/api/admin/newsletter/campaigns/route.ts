import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import {
  getNewsletterAdminClient,
  ensureContactByEmail,
  assignContactToGroups,
} from '@/lib/newsletter/server';
import { deliverCampaignNow, type CampaignContentPayload } from '@/lib/newsletter/campaigns';

const ctaSchema = z.object({
  label: z.string().min(1).max(80),
  url: z.string().url(),
});

const createCampaignSchema = z.object({
  title: z.string().min(1).max(160),
  subject: z.string().min(1).max(160),
  preheader: z.string().max(200).optional(),
  body: z.string().min(1),
  primaryCta: ctaSchema.optional(),
  secondaryCta: ctaSchema.optional(),
  groupIds: z.array(z.string().uuid()).optional(),
  recipientEmails: z.array(z.string().email()).optional(),
  sendMode: z.enum(['draft', 'immediate', 'scheduled']).default('draft'),
  scheduledFor: z.string().datetime().optional(),
  trackingEnabled: z.boolean().optional(),
});

async function fetchContactsForGroups(
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>,
  groupIds: string[],
) {
  if (!groupIds?.length) return [];
  const { data, error } = await supabase
    .from('newsletter_contact_groups')
    .select(
      'group_id, contact:newsletter_contacts(id,email,status)',
    )
    .in('group_id', groupIds);
  if (error) throw error;
  const contacts: { id: string; email: string }[] = [];
  (data || []).forEach((row: any) => {
    if (!row.contact) return;
    if (row.contact.status !== 'subscribed') return;
    contacts.push({
      id: row.contact.id,
      email: row.contact.email,
    });
  });
  return contacts;
}

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);

    const { data: campaigns, error } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const ids = (campaigns || []).map((c) => c.id);
    let statsMap = new Map<string, { total: number; sent: number; opened: number; clicked: number }>();
    if (ids.length) {
      const { data: recipientRows, error: recipientsError } = await supabase
        .from('newsletter_campaign_recipients')
        .select('campaign_id,status,opened_at,clicked_at')
        .in('campaign_id', ids);
      if (recipientsError) throw recipientsError;
      statsMap = recipientRows.reduce((map, row) => {
        const entry = map.get(row.campaign_id) || { total: 0, sent: 0, opened: 0, clicked: 0 };
        entry.total += 1;
        if (row.status === 'sent') entry.sent += 1;
        if (row.opened_at) entry.opened += 1;
        if (row.clicked_at) entry.clicked += 1;
        map.set(row.campaign_id, entry);
        return map;
      }, statsMap);
    }

    return NextResponse.json({
      success: true,
      campaigns: (campaigns || []).map((campaign) => ({
        ...campaign,
        stats: statsMap.get(campaign.id) || { total: 0, sent: 0, opened: 0, clicked: 0 },
      })),
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] campaigns GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar las campañas' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const payload = createCampaignSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    if (
      payload.sendMode !== 'draft' &&
      !payload.recipientEmails?.length &&
      !payload.groupIds?.length
    ) {
      return NextResponse.json(
        { success: false, error: 'Selecciona grupos o destinatarios antes de enviar' },
        { status: 400 },
      );
    }

    if (payload.sendMode === 'scheduled' && !payload.scheduledFor) {
      return NextResponse.json(
        { success: false, error: 'Debes indicar fecha y hora para programar el envío' },
        { status: 400 },
      );
    }

    const { data: campaign, error } = await supabase
      .from('newsletter_campaigns')
      .insert({
        title: payload.title,
        subject: payload.subject,
        preheader: payload.preheader ?? null,
        body: payload.body,
        primary_cta_label: payload.primaryCta?.label ?? null,
        primary_cta_url: payload.primaryCta?.url ?? null,
        secondary_cta_label: payload.secondaryCta?.label ?? null,
        secondary_cta_url: payload.secondaryCta?.url ?? null,
        send_mode: payload.sendMode,
        status: payload.sendMode === 'draft' ? 'draft' : 'pending',
        scheduled_for: payload.sendMode === 'scheduled' ? payload.scheduledFor : null,
        created_by: adminAccess.email,
      })
      .select('*')
      .single();
    if (error) throw error;

    if (payload.groupIds?.length) {
      const rows = payload.groupIds.map((groupId) => ({
        campaign_id: campaign.id,
        group_id: groupId,
      }));
      try {
        await supabase.from('newsletter_campaign_groups').insert(rows);
      } catch (error) {
        // Ignore errors when inserting campaign groups
      }
    }

    const recipientsMap = new Map<string, { id: string; email: string }>();

    if (payload.groupIds?.length) {
      const groupContacts = await fetchContactsForGroups(supabase, payload.groupIds);
      groupContacts.forEach((contact) => {
        recipientsMap.set(contact.email.toLowerCase(), contact);
      });
    }

    if (payload.recipientEmails?.length) {
      for (const email of payload.recipientEmails) {
        const contact = await ensureContactByEmail(supabase, email, {
          origin: 'manual-campaign',
        });
        if (contact.status !== 'subscribed') {
          await supabase
            .from('newsletter_contacts')
            .update({ status: 'subscribed', unsubscribed_at: null })
            .eq('id', contact.id);
        }
        recipientsMap.set(contact.email.toLowerCase(), { id: contact.id, email: contact.email });
      }
    }

    const recipientsList = Array.from(recipientsMap.values());

    if (
      (payload.sendMode === 'immediate' || payload.sendMode === 'scheduled') &&
      recipientsList.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: 'No hay destinatarios válidos para la campaña' },
        { status: 400 },
      );
    }

    let recipientRows: any[] = [];
    if (recipientsList.length) {
      const insertRows = recipientsList.map((contact) => ({
        campaign_id: campaign.id,
        contact_id: contact.id,
        email: contact.email,
        status: 'pending',
      }));
      const { data: insertedRecipients, error: recipientsError } = await supabase
        .from('newsletter_campaign_recipients')
        .insert(insertRows)
        .select('*');
      if (recipientsError) throw recipientsError;
      recipientRows = insertedRecipients || [];
    }

    const trackingEnabled = payload.trackingEnabled !== false;

    if (payload.sendMode === 'immediate') {
      const content: CampaignContentPayload = {
        subject: payload.subject,
        title: payload.title,
        body: payload.body,
      };
      if (payload.primaryCta?.label && payload.primaryCta?.url) {
        content.primaryCta = { label: payload.primaryCta.label, url: payload.primaryCta.url };
      }
      if (payload.secondaryCta?.label && payload.secondaryCta?.url) {
        content.secondaryCta = { label: payload.secondaryCta.label, url: payload.secondaryCta.url };
      }
      await deliverCampaignNow({
        supabase,
        campaign,
        recipients: recipientRows,
        content,
      });
    } else if (payload.sendMode === 'scheduled' && payload.scheduledFor) {
      await supabase.from('newsletter_jobs').insert({
        job_type: 'campaign-send',
        payload: { campaignId: campaign.id },
        scheduled_for: payload.scheduledFor,
      });
      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'scheduled' })
        .eq('id', campaign.id);
    }

    return NextResponse.json({
      success: true,
      campaign,
      recipients: recipientRows.length,
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] campaigns POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo crear la campaña' },
      { status: 500 },
    );
  }
}

