/**
 * Endpoint para actualizar status de campañas automáticas a ACTIVE
 * 
 * Las campañas automáticas (Welcome Founder Pass, Welcome Mail, Out of Credits)
 * deben aparecer como ACTIVE porque son automatizaciones activas
 * 
 * GET /api/admin/newsletter/fix-automated-campaigns
 */

import { NextResponse } from 'next/server';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export async function GET() {
  try {
    console.log('[FIX-AUTOMATED] ===== ACTUALIZANDO STATUS =====');

    const supabase = await getNewsletterAdminClient();
    if (!supabase) {
      return NextResponse.json({
        error: 'Newsletter admin client not configured',
      }, { status: 500 });
    }

    const automatedCampaigns = [
      'Welcome Founder Pass',
      'Welcome_Mail',
      'Out of Credits · Automático',
    ];

    const results = [];

    // Actualizar cada campaña automática
    for (const title of automatedCampaigns) {
      console.log(`[FIX-AUTOMATED] Actualizando: ${title}`);

      // Buscar campaña
      const { data: campaign } = await supabase
        .from('newsletter_campaigns')
        .select('id, title, status, metadata')
        .eq('title', title)
        .maybeSingle();

      if (!campaign) {
        console.log(`[FIX-AUTOMATED] ⚠️  Campaña no encontrada: ${title}`);
        results.push({
          title,
          status: 'not_found',
          message: 'Campaign not found',
        });
        continue;
      }

      // Determinar categoría
      let category = 'welcome';
      if (title.includes('Out of Credits')) {
        category = 'retention';
      }

      // Actualizar a ACTIVE con metadata correcta
      const { error: updateError } = await supabase
        .from('newsletter_campaigns')
        .update({
          status: 'active',
          metadata: {
            ...(campaign.metadata || {}),
            type: 'automated',
            mail_category: category,
            automated: true,
            tracking_enabled: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);

      if (updateError) {
        console.error(`[FIX-AUTOMATED] ❌ Error actualizando ${title}:`, updateError);
        results.push({
          title,
          status: 'error',
          error: updateError.message,
        });
      } else {
        console.log(`[FIX-AUTOMATED] ✅ ${title} → ACTIVE`);
        results.push({
          title,
          status: 'updated',
          previousStatus: campaign.status,
          newStatus: 'active',
          category,
        });
      }
    }

    // Verificar resultados finales
    const { data: updatedCampaigns } = await supabase
      .from('newsletter_campaigns')
      .select('id, title, status, metadata')
      .in('title', automatedCampaigns);

    console.log('[FIX-AUTOMATED] ===== COMPLETADO =====');

    return NextResponse.json({
      success: true,
      message: '✅ Campañas automáticas actualizadas a ACTIVE',
      updates: results,
      campaigns: updatedCampaigns?.map((c: any) => ({
        title: c.title,
        status: c.status,
        type: c.metadata?.type,
        category: c.metadata?.mail_category,
        automated: c.metadata?.automated,
      })),
      nextSteps: [
        '1. Refrescar Newsletter HQ',
        '2. Todas las campañas automáticas deberían aparecer como ACTIVE',
        '3. "Welcome Founder Pass" → ACTIVE ✅',
        '4. "Welcome_Mail" → ACTIVE ✅',
        '5. "Out of Credits · Automático" → ACTIVE ✅',
      ],
    });

  } catch (error: any) {
    console.error('[FIX-AUTOMATED] ❌ Error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}


