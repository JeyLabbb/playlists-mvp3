import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';
import { ensureFounderWorkflow } from '@/lib/newsletter/workflows';

const workflowStepSchema = z.object({
  action_type: z.enum(['wait', 'send_campaign', 'send_saved_mail', 'add_to_group', 'remove_from_group']),
  action_config: z.record(z.any()).default({}),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  trigger_type: z.enum(['manual', 'contact_added', 'group_joined', 'pleia_account_created']),
  trigger_config: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
  steps: z.array(workflowStepSchema).min(1),
});

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();

    // Asegura que exista el workflow de ejemplo para Founder Pass
    try {
      await ensureFounderWorkflow(supabase);
    } catch (e) {
      console.warn('[NEWSLETTER] Failed to ensure Founder workflow on GET:', e);
    }

    const { data, error } = await supabase
      .from('newsletter_workflows')
      .select('*, steps:newsletter_workflow_steps(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, workflows: data || [] });
  } catch (error: any) {
    console.error('[NEWSLETTER] workflows GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudieron cargar los workflows' },
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
    const payload = createWorkflowSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    const { data: workflow, error } = await supabase
      .from('newsletter_workflows')
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        trigger_type: payload.trigger_type,
        trigger_config: payload.trigger_config ?? {},
        is_active: payload.is_active ?? true,
      })
      .select('*')
      .single();
    if (error) throw error;

    const stepRows = payload.steps.map((step, index) => ({
      workflow_id: workflow.id,
      step_order: index,
      action_type: step.action_type,
      action_config: step.action_config,
    }));

    await supabase.from('newsletter_workflow_steps').insert(stepRows);

    const { data: refreshed } = await supabase
      .from('newsletter_workflows')
      .select('*, steps:newsletter_workflow_steps(*)')
      .eq('id', workflow.id)
      .single();

    return NextResponse.json({ success: true, workflow: refreshed });
  } catch (error: any) {
    console.error('[NEWSLETTER] workflows POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo crear el workflow' },
      { status: 500 },
    );
  }
}

