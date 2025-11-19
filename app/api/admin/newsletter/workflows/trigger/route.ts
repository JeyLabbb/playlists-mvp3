import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getNewsletterAdminClient, ensureContactByEmail } from '@/lib/newsletter/server';
import { executeWorkflowSteps } from '@/lib/newsletter/workflows';

const triggerSchema = z.object({
  workflowId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  origin: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = triggerSchema.parse(await request.json());
    const supabase = await getNewsletterAdminClient();

    const { data: workflow, error } = await supabase
      .from('newsletter_workflows')
      .select('*, steps:newsletter_workflow_steps(*)')
      .eq('id', payload.workflowId)
      .single();
    if (error || !workflow) {
      throw error || new Error('Workflow no encontrado');
    }

    const contact = await ensureContactByEmail(supabase, payload.email, {
      name: payload.name,
      origin: payload.origin ?? 'workflow',
    });

    workflow.steps.sort((a: any, b: any) => a.step_order - b.step_order);

    await executeWorkflowSteps({
      supabase,
      workflow,
      contact,
      startIndex: 0,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NEWSLETTER] workflow trigger error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'No se pudo ejecutar el workflow' },
      { status: 500 },
    );
  }
}

