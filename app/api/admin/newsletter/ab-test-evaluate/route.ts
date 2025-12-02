import { NextRequest, NextResponse } from 'next/server';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';
import { deliverCampaignNow, CampaignContentPayload } from '@/lib/newsletter/campaigns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Evalúa el ganador de un A/B test y envía al grupo holdout
 */
export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();
    
    if (!campaignId) {
      return NextResponse.json({ success: false, error: 'campaignId requerido' }, { status: 400 });
    }

    const supabase = await getNewsletterAdminClient();

    // Obtener campaña
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: 'Campaña no encontrada' }, { status: 404 });
    }

    if (!campaign.ab_test_enabled) {
      return NextResponse.json({ success: false, error: 'Esta campaña no tiene A/B test' }, { status: 400 });
    }

    // Obtener métricas de ambas variantes
    const { data: recipients, error: recipientsError } = await supabase
      .from('newsletter_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .in('ab_test_variant', ['A', 'B']);
    
    if (recipientsError) throw recipientsError;

    const variantA = recipients.filter(r => r.ab_test_variant === 'A');
    const variantB = recipients.filter(r => r.ab_test_variant === 'B');

    // Calcular métricas
    const metricsA = {
      sent: variantA.filter(r => r.status === 'sent').length,
      opens: variantA.filter(r => r.opened_at).length,
      clicks: variantA.filter(r => r.clicked_at).length,
    };

    const metricsB = {
      sent: variantB.filter(r => r.status === 'sent').length,
      opens: variantB.filter(r => r.opened_at).length,
      clicks: variantB.filter(r => r.clicked_at).length,
    };

    const openRateA = metricsA.sent > 0 ? (metricsA.opens / metricsA.sent) : 0;
    const openRateB = metricsB.sent > 0 ? (metricsB.opens / metricsB.sent) : 0;
    const ctrA = metricsA.opens > 0 ? (metricsA.clicks / metricsA.opens) : 0;
    const ctrB = metricsB.opens > 0 ? (metricsB.clicks / metricsB.opens) : 0;

    // Determinar ganador según criterio
    let winner: 'A' | 'B' = 'A';
    let winnerSubject = campaign.subject;
    
    switch (campaign.winner_criteria) {
      case 'opens':
        winner = metricsB.opens > metricsA.opens ? 'B' : 'A';
        break;
      case 'clicks':
        winner = metricsB.clicks > metricsA.clicks ? 'B' : 'A';
        break;
      case 'ctr':
        winner = ctrB > ctrA ? 'B' : 'A';
        break;
      case 'combined':
        const scoreA = metricsA.opens + metricsA.clicks;
        const scoreB = metricsB.opens + metricsB.clicks;
        winner = scoreB > scoreA ? 'B' : 'A';
        break;
      default:
        winner = openRateB > openRateA ? 'B' : 'A';
    }

    winnerSubject = winner === 'B' ? campaign.subject_b : campaign.subject;

    console.log(`[A/B TEST] Campaign ${campaignId} winner: ${winner} (${campaign.winner_criteria})`);
    console.log(`[A/B TEST] Metrics A:`, metricsA, `Open rate: ${(openRateA * 100).toFixed(2)}%`);
    console.log(`[A/B TEST] Metrics B:`, metricsB, `Open rate: ${(openRateB * 100).toFixed(2)}%`);

    // Guardar resultado del test
    await supabase
      .from('newsletter_campaigns')
      .update({
        ab_test_winner: winner,
        ab_test_evaluated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Obtener destinatarios holdout
    const { data: holdoutRecipients, error: holdoutError } = await supabase
      .from('newsletter_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('ab_test_variant', 'holdout')
      .eq('status', 'holdout');
    
    if (holdoutError) throw holdoutError;

    if (!holdoutRecipients || holdoutRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay destinatarios holdout para enviar',
        winner,
        metricsA,
        metricsB,
      });
    }

    // Actualizar status de holdout a pending
    await supabase
      .from('newsletter_campaign_recipients')
      .update({ status: 'pending' })
      .eq('campaign_id', campaignId)
      .eq('ab_test_variant', 'holdout');

    // Refrescar datos
    const { data: updatedHoldout } = await supabase
      .from('newsletter_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('ab_test_variant', 'holdout');

    // Enviar al grupo holdout con el asunto ganador
    await deliverCampaignNow({
      supabase,
      campaign,
      recipients: updatedHoldout || [],
      content: {
        subject: winnerSubject,
        title: campaign.title,
        body: campaign.body,
        ...(campaign.primary_cta_label && campaign.primary_cta_url && {
          primaryCta: { label: campaign.primary_cta_label, url: campaign.primary_cta_url }
        }),
        ...(campaign.secondary_cta_label && campaign.secondary_cta_url && {
          secondaryCta: { label: campaign.secondary_cta_label, url: campaign.secondary_cta_url }
        }),
      } as CampaignContentPayload,
      trackingEnabled: true,
    });

    console.log(`[A/B TEST] Sent winner (${winner}) to ${holdoutRecipients.length} holdout recipients`);

    return NextResponse.json({
      success: true,
      winner,
      winnerSubject,
      metricsA,
      metricsB,
      holdoutCount: holdoutRecipients.length,
    });

  } catch (error: any) {
    console.error('[A/B TEST] Evaluation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error evaluando A/B test' },
      { status: 500 }
    );
  }
}

