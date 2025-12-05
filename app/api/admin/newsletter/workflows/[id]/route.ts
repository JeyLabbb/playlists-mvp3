import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(500).optional(),
  trigger_type: z.enum(['manual', 'contact_added', 'group_joined', 'pleia_account_created']).optional(),
  trigger_config: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
  steps: z
    .array(
      z.object({
        action_type: z.enum(['wait', 'send_campaign', 'send_saved_mail', 'add_to_group', 'remove_from_group']),
        action_config: z.record(z.any()).default({}),
      }),
    )
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const payload = updateWorkflowSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    const updates: Record<string, any> = {};
    if (payload.name) updates.name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.trigger_type) updates.trigger_type = payload.trigger_type;
    if (payload.trigger_config) updates.trigger_config = payload.trigger_config;
    if (payload.is_active !== undefined) updates.is_active = payload.is_active;

    if (Object.keys(updates).length) {
      const { error } = await supabase
        .from('newsletter_workflows')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    }

    if (payload.steps) {
      await supabase.from('newsletter_workflow_steps').delete().eq('workflow_id', id);
      const stepRows = payload.steps.map((step, index) => ({
        workflow_id: id,
        step_order: index,
        action_type: step.action_type,
        action_config: step.action_config,
      }));
      await supabase.from('newsletter_workflow_steps').insert(stepRows);
    }

    const { data, error: refreshedError } = await supabase
      .from('newsletter_workflows')
      .select('*, steps:newsletter_workflow_steps(*)')
      .eq('id', id)
      .single();
    if (refreshedError) throw refreshedError;

    return NextResponse.json({ success: true, workflow: data });
  } catch (error: any) {
    console.error('[NEWSLETTER] workflow PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo actualizar el workflow' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await getNewsletterAdminClient();
    await supabase.from('newsletter_workflows').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] workflow DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo eliminar el workflow' },
      { status: 500 },
    );
  }
}

