import { NextResponse } from 'next/server';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';
import { deliverCampaignNow } from '@/lib/newsletter/campaigns';
import { executeWorkflowSteps, resolveWorkflowContact } from '@/lib/newsletter/workflows';

const CRON_SECRET = process.env.NEWSLETTER_CRON_SECRET;

function hasCronAccess(request: Request) {
  if (!CRON_SECRET) return false;
  const header = request.headers.get('x-cron-secret') || request.headers.get('authorization');
  if (!header) return false;
  if (header === CRON_SECRET) return true;
  if (header.toLowerCase().startsWith('bearer ') && header.slice(7) === CRON_SECRET) return true;
  return false;
}

async function processCampaignJob(
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>,
  job: any,
) {
  const campaignId = job.payload?.campaignId;
  if (!campaignId) {
    throw new Error('campaignId missing on job payload');
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('newsletter_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
  if (campaignError || !campaign) {
    throw campaignError || new Error('Campaign not found');
  }

  const { data: recipients, error: recipientsError } = await supabase
    .from('newsletter_campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'scheduled']);
  if (recipientsError) throw recipientsError;

  await deliverCampaignNow({
    supabase,
    campaign,
    recipients: recipients || [],
    content: {
      subject: campaign.subject,
      title: campaign.title,
      body: campaign.body,
      primaryCta:
        campaign.primary_cta_label && campaign.primary_cta_url
          ? { label: campaign.primary_cta_label, url: campaign.primary_cta_url }
          : undefined,
      secondaryCta:
        campaign.secondary_cta_label && campaign.secondary_cta_url
          ? { label: campaign.secondary_cta_label, url: campaign.secondary_cta_url }
          : undefined,
    },
  });
}

async function processWorkflowStepJob(
  supabase: Awaited<ReturnType<typeof getNewsletterAdminClient>>,
  job: any,
) {
  const workflowId = job.payload?.workflowId;
  const contactId = job.payload?.contactId;
  const email = job.payload?.email;
  const nextStepIndex = job.payload?.nextStepIndex ?? 0;
  if (!workflowId || !contactId || !email) {
    throw new Error('workflow job payload incompleto');
  }

  const contact = await resolveWorkflowContact(supabase, contactId, email);
  if (!contact) {
    throw new Error('Contacto no encontrado para workflow');
  }

  const { data: workflow, error } = await supabase
    .from('newsletter_workflows')
    .select('*, steps:newsletter_workflow_steps(*)')
    .eq('id', workflowId)
    .single();
  if (error || !workflow) {
    throw error || new Error('Workflow no encontrado');
  }

  workflow.steps.sort((a: any, b: any) => a.step_order - b.step_order);

  await executeWorkflowSteps({
    supabase,
    workflow,
    contact,
    startIndex: nextStepIndex,
  });
}

export async function POST(request: Request) {
  try {
    let authorized = false;
    if (hasCronAccess(request)) {
      authorized = true;
    } else {
      const adminAccess = await ensureAdminAccess(request);
      if (!adminAccess.ok) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      authorized = true;
    }

    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getNewsletterAdminClient();
    const now = new Date().toISOString();
    const { data: jobs, error } = await supabase
      .from('newsletter_jobs')
      .select('*')
      .lte('scheduled_for', now)
      .is('completed_at', null)
      .is('failed_at', null)
      .order('scheduled_for', { ascending: true })
      .limit(5);
    if (error) throw error;

    const processed: string[] = [];
    for (const job of jobs || []) {
      try {
        if (job.job_type === 'campaign-send') {
          await processCampaignJob(supabase, job);
        } else if (job.job_type === 'workflow-step') {
          await processWorkflowStepJob(supabase, job);
        }
        await supabase
          .from('newsletter_jobs')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', job.id);
        processed.push(job.id);
      } catch (jobError: any) {
        console.error('[NEWSLETTER] Job failed', job.id, jobError);
        await supabase
          .from('newsletter_jobs')
          .update({
            failed_at: new Date().toISOString(),
            error: jobError?.message || 'unknown-error',
          })
          .eq('id', job.id);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
    });
  } catch (error: any) {
    console.error('[NEWSLETTER] jobs run error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron ejecutar los jobs' },
      { status: 500 },
    );
  }
}

