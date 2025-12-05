import OpenAI from 'openai';
import { getSupabaseAdmin } from '../supabase/server';
import type { ExecutionPlan } from './tools';
import type { Track } from './tool-executor';

const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AgentAnalysisInput {
  userId?: string | null;
  playlistId?: string | null;
  prompt: string;
  tracks: Track[];
  plan: ExecutionPlan | null;
  model?: string;
  origin?: string;
}

export async function logAgentAnalysis(input: AgentAnalysisInput) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[AGENT-ANALYSIS] OPENAI_API_KEY not set, skipping analysis');
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[AGENT-ANALYSIS] Supabase admin not configured, skipping analysis');
      return;
    }

    const { userId, playlistId, prompt, tracks, plan, model, origin } = input;

    // Insert base row first (without analysis) to tener rastro aunque la llamada a OpenAI falle
    const { data: inserted, error: insertError } = await supabase
      .from('pleia_agent_analyses')
      .insert({
        user_id: userId ?? null,
        playlist_id: playlistId ?? null,
        prompt,
        tracks,
        feedback: null,
        agent_plan: plan,
        analysis: null,
        model: model || MODEL,
        origin: origin || 'agent_stream_v1',
      })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      console.error('[AGENT-ANALYSIS] Error inserting base row:', insertError);
      return;
    }

    const analysisId = inserted.id as string;

    // Preparar resumen compacto de tracks y plan para no enviar un JSON enorme
    const trackSummaries = tracks.slice(0, 60).map((t: any, idx) => ({
      index: idx + 1,
      name: t.name,
      artists: (t.artists || []).map((a: any) => a.name),
      uri: t.uri,
    }));

    const planSummary = plan
      ? plan.execution_plan.map((step) => ({
          tool: step.tool,
          params: step.params,
          reason: step.reason,
        }))
      : [];

    const systemPrompt = `
Eres un analista senior del agente de PLEIA (playlist con IA).
Conoces perfectamente cómo funciona el agente INTERNAMENTE:
- Recibe un prompt en español del usuario.
- Genera un plan de herramientas (get_artist_tracks, get_similar_style, generate_creative_tracks, search_playlists, adjust_distribution, etc.).
- Ejecuta esas herramientas contra Spotify y devuelve una lista de canciones.

LIMITACIONES IMPORTANTES (NO LAS INCUMPLAS):
- NO tienes acceso a información externa real (no sabes qué es exactamente un festival o concepto concreto como "Riverland 2025", más allá del texto del prompt).
- NO inventes juicios de relevancia basados en conocimiento externo: solo puedes hablar de relevancia si el propio prompt lo hace explícito (ej: idioma, artistas concretos, género claro, "SOLO de X", "sin Y", etc.).
- Si no puedes saber si las canciones encajan o no con un concepto externo, dilo claramente (ej: "no puedo saber si las canciones encajan con 'Riverland 2025' porque no tengo contexto externo") y NO digas que "no parecen relacionadas" con ese concepto.

Tu tarea para ESTE CASO CONCRETO:
- Analizar si, mirando solo el prompt, el plan y la estructura de la playlist, el agente ha respetado las restricciones explícitas (idioma, número aproximado de canciones, distribución entre artistas, exclusiones, caps, etc.).
- Detectar patrones de acierto y errores SOLO basados en:
  · Si el plan usa o no las herramientas adecuadas para lo que el prompt pide.
  · Si la distribución de artistas/canciones parece razonable respecto al prompt (por ejemplo, "muchas de X", "25% de rock", "solo de estos artistas"...).
  · Si se respetan o no exclusiones claras que estén EN EL PROMPT.
- Proponer cambios concretos en el AGENTE (no en el usuario) para que la próxima vez lo haga mejor: cambios en caps, estrategia de relleno, uso de herramientas, detección de exclusiones/idioma, etc.

Muy importante:
- Si no tienes información suficiente para juzgar algo (por ejemplo, si las canciones encajan o no con un festival o concepto abstracto), dilo explícitamente y NO inventes problemas.
- No digas que "las canciones no parecen relacionadas con X" si no tienes evidencia directa en el prompt o en los nombres de artistas/canciones, y en casos como "Riverland 2025" asume que NO puedes juzgar relevancia externa y céntrate solo en estructura y respeto de restricciones explícitas.
- SOLO propón cambios al agente cuando veas fallos CLAROS respecto a restricciones explícitas (por ejemplo: no respeta un "SOLO de X", ignora un "sin Y", no cumple caps de artistas, ignora el idioma pedido, devuelve muchas menos canciones de las pedidas, etc.).
- Si en este caso concreto el agente parece respetar bien lo que se le pidió (no ves violaciones claras), di explícitamente que "por ahora todo parece consistente con el prompt" y NO sugieras cambios extra.

Responde SIEMPRE en español, en un único párrafo largo pero legible (puedes usar frases cortas separadas por punto).
NO devuelvas JSON, solo texto libre.
`;

    const userMessage = `
PROMPT DEL USUARIO:
${prompt}

RESUMEN DEL PLAN DEL AGENTE (orden de herramientas):
${JSON.stringify(planSummary, null, 2)}

TRACKS DEVUELTOS (máx 60):
${JSON.stringify(trackSummaries, null, 2)}

Analiza este caso concreto y responde:
- Qué ha hecho bien el agente.
- Qué ha hecho mal o podría fallar a menudo en casos similares.
- Qué ajustes concretos harías al agente (estrategia de herramientas, caps, relleno, detección de exclusiones/idiomas/etc.) para que se acerque más a lo que pide el usuario.
`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user', content: userMessage.trim() },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    const analysisText = completion.choices[0]?.message?.content?.trim() || null;

    if (!analysisText) {
      console.warn('[AGENT-ANALYSIS] OpenAI returned empty analysis');
      return;
    }

    const { error: updateError } = await supabase
      .from('pleia_agent_analyses')
      .update({ analysis: analysisText })
      .eq('id', analysisId);

    if (updateError) {
      console.error('[AGENT-ANALYSIS] Error updating analysis text:', updateError);
    } else {
      console.log('[AGENT-ANALYSIS] Analysis stored for id:', analysisId);
    }
  } catch (error: any) {
    console.error('[AGENT-ANALYSIS] Unexpected error:', error?.message || error);
  }
}


