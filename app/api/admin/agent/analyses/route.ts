import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ensureAdminAccess } from '@/lib/admin/session';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  try {
    const adminAccess = await ensureAdminAccess(request);
    if (!adminAccess.ok) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase admin client not configured' }, { status: 500 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '40', 10);

    const { data, error } = await supabase
      .from('pleia_agent_analyses')
      .select('id, created_at, user_id, playlist_id, prompt, tracks, feedback, analysis, model, origin, excluded_from_reports')
      .eq('excluded_from_reports', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AGENT-ANALYSES] Error fetching analyses:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const analyses = data || [];

    // Construir resumen global con OpenAI (solo si hay análisis)
    let globalSummary: string | null = null;

    if (analyses.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        const compactCases = analyses.slice(0, 25).map((row: any) => ({
          created_at: row.created_at,
          prompt: row.prompt,
          feedback: row.feedback || null,
          analysis: row.analysis || null,
        }));

        const systemPrompt = `
Eres un analista experto de un sistema de playlists con IA (PLEIA).
Has recibido varios análisis individuales de cómo se comporta el agente con distintos prompts, más el feedback de los usuarios cuando lo hay.

LIMITACIONES IMPORTANTES:
- Solo puedes basarte en los datos que ves en estos casos (prompt, feedback, análisis previos).
- NO inventes problemas que no aparezcan en esos datos.
- Si algo no está claro o no se puede saber (por ejemplo, si cierta playlist encaja o no con un festival concreto), simplemente ignóralo o dilo explícitamente.

Tu tarea:
- Detectar patrones globales: qué cosas suele hacer bien el agente, qué falla a menudo, qué excepciones curiosas aparecen, SIEMPRE basándote en lo que ves en estos casos.
- Proponer ajustes CONCRETOS al agente (no al usuario): caps de artistas, estrategia de relleno, uso de herramientas, detección de idioma/exclusiones, aleatoriedad, etc., siempre apoyándote en ejemplos reales de los casos.

Responde en español, en 1–2 párrafos largos, muy claros y accionables.
`;

        const userMessage = `
Casos recientes del agente (máx 25):
${JSON.stringify(compactCases, null, 2)}

Genera un resumen sintético de TODO esto:
- Patrones de acierto
- Patrones de error
- Cambios que harías al agente para dejarlo más fino.
`;

        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt.trim() },
            { role: 'user', content: userMessage.trim() },
          ],
          temperature: 0.5,
          max_tokens: 700,
        });

        globalSummary = completion.choices[0]?.message?.content?.trim() || null;
      } catch (summaryError: any) {
        console.error('[AGENT-ANALYSES] Error generating global summary:', summaryError);
      }
    }

    return NextResponse.json({
      success: true,
      globalSummary,
      analyses,
    });
  } catch (error: any) {
    console.error('[AGENT-ANALYSES] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unexpected error' },
      { status: 500 },
    );
  }
}


