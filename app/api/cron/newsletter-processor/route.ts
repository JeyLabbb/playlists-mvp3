import { NextRequest, NextResponse } from 'next/server';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos máximo

/**
 * CRON JOB PRINCIPAL DE NEWSLETTER
 * Se ejecuta todos los días a las 20:00 UTC (21:00 España, 22:00 en verano)
 * 
 * Procesa:
 * 1. Campañas programadas para hoy
 * 2. A/B Tests que necesitan evaluación
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    scheduledCampaigns: { processed: 0, sent: 0, errors: [] as string[] },
    abTests: { checked: 0, evaluated: 0, errors: [] as string[] },
    executionTimeMs: 0,
  };

  try {
    // Verificar cron secret (seguridad)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[CRON] ❌ Unauthorized attempt to access newsletter-processor');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] 🚀 Starting newsletter processor at', new Date().toISOString());
    
    const supabase = await getNewsletterAdminClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000');

    // =====================================================
    // 1. PROCESAR CAMPAÑAS PROGRAMADAS
    // =====================================================
    console.log('[CRON] 📧 Processing scheduled campaigns...');
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin del día
    
    const { data: scheduledCampaigns, error: scheduledError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', today.toISOString());
    
    if (scheduledError) {
      console.error('[CRON] Error fetching scheduled campaigns:', scheduledError);
      results.scheduledCampaigns.errors.push(scheduledError.message);
    } else if (scheduledCampaigns && scheduledCampaigns.length > 0) {
      results.scheduledCampaigns.processed = scheduledCampaigns.length;
      console.log(`[CRON] Found ${scheduledCampaigns.length} scheduled campaigns to send`);
      
      for (const campaign of scheduledCampaigns) {
        try {
          console.log(`[CRON] Sending campaign: ${campaign.id} (${campaign.title})`);
          
          // Obtener destinatarios
          const { data: recipients } = await supabase
            .from('newsletter_campaign_recipients')
            .select('email')
            .eq('campaign_id', campaign.id);
          
          if (!recipients || recipients.length === 0) {
            console.warn(`[CRON] No recipients for campaign ${campaign.id}`);
            results.scheduledCampaigns.errors.push(`Campaign ${campaign.id}: No recipients`);
            continue;
          }

          // Enviar emails
          const response = await fetch(`${baseUrl}/api/admin/newsletter/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: campaign.subject,
              body: campaign.body,
              recipientEmails: recipients.map(r => r.email),
              campaignId: campaign.id,
              templateMode: campaign.template_mode || 'custom',
              primaryCta: campaign.primary_cta,
              secondaryCta: campaign.secondary_cta,
            }),
          });

          if (response.ok) {
            // Marcar como enviada
            await supabase
              .from('newsletter_campaigns')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', campaign.id);
            
            results.scheduledCampaigns.sent++;
            console.log(`[CRON] ✅ Campaign ${campaign.id} sent successfully`);
          } else {
            const error = await response.text();
            results.scheduledCampaigns.errors.push(`Campaign ${campaign.id}: ${error}`);
            console.error(`[CRON] ❌ Failed to send campaign ${campaign.id}:`, error);
          }
        } catch (sendError: any) {
          results.scheduledCampaigns.errors.push(`Campaign ${campaign.id}: ${sendError.message}`);
          console.error(`[CRON] ❌ Error sending campaign ${campaign.id}:`, sendError);
        }
      }
    } else {
      console.log('[CRON] No scheduled campaigns to send today');
    }

    // =====================================================
    // 2. EVALUAR A/B TESTS PENDIENTES
    // =====================================================
    console.log('[CRON] 🧪 Processing A/B tests...');
    
    const { data: abCampaigns, error: abError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('ab_test_enabled', true)
      .is('ab_test_evaluated_at', null)
      .eq('status', 'sent');
    
    if (abError) {
      console.error('[CRON] Error fetching A/B campaigns:', abError);
      results.abTests.errors.push(abError.message);
    } else if (abCampaigns && abCampaigns.length > 0) {
      results.abTests.checked = abCampaigns.length;
      console.log(`[CRON] Found ${abCampaigns.length} A/B tests to check`);
      
      const now = new Date();
      
      for (const campaign of abCampaigns) {
        // Calcular si ya pasó el tiempo del test
        const testStartedAt = new Date(campaign.sent_at || campaign.created_at);
        const durationMs = (campaign.test_duration || 24) * 
          ((campaign.test_duration_unit || 'hours') === 'days' ? 24 : 1) * 
          60 * 60 * 1000;
        const shouldEvaluateAt = new Date(testStartedAt.getTime() + durationMs);

        if (now >= shouldEvaluateAt) {
          console.log(`[CRON] Evaluating A/B test for campaign ${campaign.id}`);
          
          try {
            const response = await fetch(`${baseUrl}/api/admin/newsletter/ab-test-evaluate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campaignId: campaign.id }),
            });

            if (response.ok) {
              const result = await response.json();
              results.abTests.evaluated++;
              console.log(`[CRON] ✅ A/B Test evaluated. Winner: ${result.winner}`);
            } else {
              const error = await response.text();
              results.abTests.errors.push(`A/B ${campaign.id}: ${error}`);
              console.error(`[CRON] ❌ Failed to evaluate A/B test ${campaign.id}:`, error);
            }
          } catch (evalError: any) {
            results.abTests.errors.push(`A/B ${campaign.id}: ${evalError.message}`);
            console.error(`[CRON] ❌ Error evaluating A/B test ${campaign.id}:`, evalError);
          }
        } else {
          const hoursRemaining = Math.ceil((shouldEvaluateAt.getTime() - now.getTime()) / (1000 * 60 * 60));
          console.log(`[CRON] A/B test ${campaign.id} not ready (${hoursRemaining}h remaining)`);
        }
      }
    } else {
      console.log('[CRON] No A/B tests to evaluate');
    }

    // =====================================================
    // FINALIZAR
    // =====================================================
    results.executionTimeMs = Date.now() - startTime;
    console.log(`[CRON] ✅ Newsletter processor completed in ${results.executionTimeMs}ms`);
    console.log(`[CRON] Summary: ${results.scheduledCampaigns.sent} campaigns sent, ${results.abTests.evaluated} A/B tests evaluated`);

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('[CRON] ❌ Critical error in newsletter-processor:', error);
    results.success = false;
    results.executionTimeMs = Date.now() - startTime;
    return NextResponse.json(
      { ...results, error: error.message },
      { status: 500 }
    );
  }
}

// POST para testing manual desde el panel admin
export async function POST(request: NextRequest) {
  return GET(request);
}


