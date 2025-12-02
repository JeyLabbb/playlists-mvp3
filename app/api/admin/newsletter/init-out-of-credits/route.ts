/**
 * Endpoint para inicializar el workflow y campaña "Out of Credits"
 * Esto los hace aparecer en Newsletter HQ inmediatamente
 * 
 * GET /api/admin/newsletter/init-out-of-credits
 */

import { NextResponse } from 'next/server';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';
import { ensureOutOfCreditsWorkflow } from '@/lib/newsletter/workflows';

export async function GET() {
  try {
    console.log('[INIT-OUT-OF-CREDITS] ===== INICIALIZANDO =====');

    const supabase = await getNewsletterAdminClient();
    if (!supabase) {
      return NextResponse.json({
        error: 'Newsletter admin client not configured',
      }, { status: 500 });
    }

    // 1. Crear workflow
    const workflowId = await ensureOutOfCreditsWorkflow(supabase);
    
    if (!workflowId) {
      return NextResponse.json({
        error: 'Failed to create workflow',
      }, { status: 500 });
    }

    console.log('[INIT-OUT-OF-CREDITS] ✅ Workflow created/found:', workflowId);

    // 2. Verificar workflow
    const { data: workflow } = await supabase
      .from('newsletter_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    // 3. Crear campaña si no existe
    const campaignSlug = 'out-of-credits-automatic';
    const campaignTitle = 'Out of Credits · Automático';
    
    // Buscar por metadata.slug ya que no existe columna slug
    let { data: existingCampaigns } = await supabase
      .from('newsletter_campaigns')
      .select('id, title, status, metadata')
      .eq('title', campaignTitle);

    let existingCampaign = existingCampaigns && existingCampaigns.length > 0 
      ? existingCampaigns.find((c: any) => c.metadata?.slug === campaignSlug) || existingCampaigns[0]
      : null;

    let campaignId: string;
    let campaignCreated = false;

    if (existingCampaign) {
      campaignId = existingCampaign.id;
      console.log('[INIT-OUT-OF-CREDITS] ✅ Campaign already exists:', campaignId);
    } else {
      const now = new Date().toISOString();
      const { data: newCampaign, error: campaignError } = await supabase
        .from('newsletter_campaigns')
        .insert({
          title: campaignTitle,
          subject: 'Te has quedado sin playlists IA… pero tengo algo para ti.',
          preheader: 'Opciones para continuar creando playlists ilimitadas',
          body: `Hey,

he visto que te has quedado sin usos en PLEIA.

Y antes de que cierres la pestaña pensando "bueno, ya está", te cuento algo rápido.

Hay un motivo por el que PLEIA te ha enganchado: te ahorra tiempo, te inspira, y te crea playlists que tú no podrías hacer ni en media hora.

Y sé que jode quedarse justo en lo mejor. Ese momento de escribir un prompt y que bam, aparece una playlist que encaja contigo.

Por eso tienes dos caminos desde aquí (y ambos te desbloquean acceso ilimitado para siempre):

👉 Opción 1 – Rápida
Invita a 3 amigos con tu enlace y listo. Acceso ilimitado de por vida. (No pagas nada. Literal.)

👉 Opción 2 – Directa
Hazte founder por 5€ y accede para siempre. Sin límites. Sin mensualidades.

Solo los primeros miles tendrán acceso ilimitado. Después esto cambiará.

Nos vemos dentro.

— MTRYX, fundadores de PLEIA`,
          primary_cta_label: 'Quiero playlists ilimitadas',
          primary_cta_url: 'https://playlists.jeylabbb.com/pricing',
          status: 'active',
          send_mode: 'immediate',
          created_by: 'system',
          metadata: {
            slug: campaignSlug,
            type: 'automated',
            workflow_id: workflowId,
            mail_category: 'retention',
            tracking_enabled: true,
            automated: true,
            trigger: 'out_of_credits',
          },
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (campaignError) {
        console.error('[INIT-OUT-OF-CREDITS] Error creating campaign:', campaignError);
        return NextResponse.json({
          error: 'Failed to create campaign',
          details: campaignError.message,
        }, { status: 500 });
      }

      campaignId = newCampaign.id;
      campaignCreated = true;
      console.log('[INIT-OUT-OF-CREDITS] ✅ Campaign created:', campaignId);

      // Actualizar workflow step con campaign_id
      await supabase
        .from('newsletter_workflow_steps')
        .update({
          action_config: {
            campaign_id: campaignId,
            tracking_enabled: true,
          },
        })
        .eq('workflow_id', workflowId)
        .eq('step_order', 0);
    }

    // 4. Verificar campaña
    const { data: campaign } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    // 5. Contar recipients (debería ser 0 inicialmente)
    const { count } = await supabase
      .from('newsletter_campaign_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);

    console.log('[INIT-OUT-OF-CREDITS] ===== COMPLETADO =====');

    return NextResponse.json({
      success: true,
      message: '✅ Workflow y Campaña inicializados correctamente',
      workflow: {
        id: workflowId,
        name: workflow?.name,
        status: workflow?.is_active ? 'active' : 'inactive',
        trigger: workflow?.trigger_type,
        created: workflow ? 'existing' : 'new',
      },
      campaign: {
        id: campaignId,
        title: campaign?.title,
        slug: campaign?.metadata?.slug,
        status: campaign?.status,
        type: campaign?.metadata?.type,
        category: campaign?.metadata?.mail_category,
        tracking: campaign?.metadata?.tracking_enabled,
        workflow_id: campaign?.metadata?.workflow_id,
        created: campaignCreated ? 'new' : 'existing',
      },
      recipients: {
        total: count || 0,
      },
      links: {
        newsletterHQ: 'https://playlists.jeylabbb.com/admin/newsletter',
        workflows: 'https://playlists.jeylabbb.com/admin/newsletter?tab=workflows',
        campaigns: 'https://playlists.jeylabbb.com/admin/newsletter?tab=campaigns',
      },
      nextSteps: [
        '1. Ir a Newsletter HQ: https://playlists.jeylabbb.com/admin/newsletter',
        '2. Tab "Workflows" → Ver "Out of Credits · Automático"',
        '3. Tab "Campaigns" → Ver "Out of Credits · Automático"',
        '4. Listo! Aparecerá con 0 sends hasta que alguien agote créditos',
      ],
    });

  } catch (error: any) {
    console.error('[INIT-OUT-OF-CREDITS] ❌ Error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

