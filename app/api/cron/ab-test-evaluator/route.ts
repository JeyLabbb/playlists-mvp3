import { NextRequest, NextResponse } from 'next/server';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron job para evaluar A/B tests pendientes
 * Se ejecuta cada 15 minutos (configurable en vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar cron secret (seguridad)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[CRON] Unauthorized attempt to access ab-test-evaluator');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getNewsletterAdminClient();
    
    // Buscar campañas con A/B test que necesitan evaluación
    const { data: campaigns, error } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('ab_test_enabled', true)
      .is('ab_test_evaluated_at', null);
    
    if (error) {
      console.error('[CRON] Error fetching campaigns:', error);
      throw error;
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        evaluated: 0,
        message: 'No pending A/B tests to evaluate',
        timestamp: new Date().toISOString(),
      });
    }

    let evaluatedCount = 0;
    const now = new Date();

    for (const campaign of campaigns) {
      // Calcular si ya pasó el tiempo del test
      const testStartedAt = new Date(campaign.created_at);
      const durationMs = campaign.test_duration * 
        (campaign.test_duration_unit === 'days' ? 24 : 1) * 
        60 * 60 * 1000;
      const shouldEvaluateAt = new Date(testStartedAt.getTime() + durationMs);

      if (now >= shouldEvaluateAt) {
        console.log(`[CRON] Evaluating A/B test for campaign ${campaign.id} (${campaign.title})`);
        
        try {
          // Llamar al endpoint de evaluación
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                         'http://localhost:3000';
          
          const response = await fetch(`${baseUrl}/api/admin/newsletter/ab-test-evaluate`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ campaignId: campaign.id }),
          });

          if (response.ok) {
            const result = await response.json();
            evaluatedCount++;
            console.log(`[CRON] ✅ Evaluated campaign ${campaign.id}. Winner: ${result.winner}`);
          } else {
            const error = await response.text();
            console.error(`[CRON] ❌ Failed to evaluate campaign ${campaign.id}:`, error);
          }
        } catch (evalError: any) {
          console.error(`[CRON] ❌ Error evaluating campaign ${campaign.id}:`, evalError);
        }
      } else {
        const minutesRemaining = Math.ceil((shouldEvaluateAt.getTime() - now.getTime()) / (1000 * 60));
        console.log(`[CRON] Campaign ${campaign.id} not ready yet (${minutesRemaining} minutes remaining)`);
      }
    }

    return NextResponse.json({
      success: true,
      checked: campaigns.length,
      evaluated: evaluatedCount,
      pending: campaigns.length - evaluatedCount,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[CRON] Error in ab-test-evaluator:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// También permitir POST para testing manual
export async function POST(request: NextRequest) {
  return GET(request);
}

