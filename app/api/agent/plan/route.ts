/**
 * PLEIA Agent Plan Generator
 * 
 * Este endpoint recibe un prompt y genera un plan de ejecución
 * usando las herramientas del agente.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateAgentSystemPrompt, ExecutionPlan, ToolCall } from '@/lib/agent/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validar API key al cargar
if (!process.env.OPENAI_API_KEY) {
  console.error('[AGENT-PLAN] ⚠️ OPENAI_API_KEY is not set!');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[AGENT-PLAN] ===== GENERATING EXECUTION PLAN =====');

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { prompt, target_tracks = 50 } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('[AGENT-PLAN] Prompt:', prompt);
    console.log('[AGENT-PLAN] Target tracks:', target_tracks);

    // Generar el system prompt con todas las herramientas
    const systemPrompt = generateAgentSystemPrompt();

    // Mensaje del usuario
    const userMessage = `Prompt del usuario: "${prompt}"
Número de canciones solicitado: ${target_tracks}

Analiza el prompt y genera un plan de ejecución usando las herramientas disponibles.
Recuerda:
- Usa máximo 5-6 herramientas
- SIEMPRE incluye adjust_distribution al final
- Los caps deben sumar aproximadamente ${Math.ceil(target_tracks * 1.3)} (para compensar duplicados)
- Genera pensamientos naturales que expliquen tu razonamiento`;

    console.log('[AGENT-PLAN] Calling OpenAI...');

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'emit_plan',
          description: 'Emite el plan de ejecución para la playlist',
          parameters: {
            type: 'object',
            properties: {
              thinking: {
                type: 'array',
                items: { type: 'string' },
                description: 'Pensamientos del agente (se mostrarán al usuario)'
              },
              execution_plan: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tool: { type: 'string' },
                    params: { type: 'object' },
                    reason: { type: 'string' }
                  },
                  required: ['tool', 'params', 'reason']
                },
                description: 'Lista de herramientas a ejecutar en orden'
              },
              total_target: {
                type: 'number',
                description: 'Número total de tracks objetivo'
              }
            },
            required: ['thinking', 'execution_plan', 'total_target']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'emit_plan' } },
      temperature: 0.3,
      max_tokens: 2000
    });

    const result = completion.choices[0]?.message;
    console.log('[AGENT-PLAN] OpenAI response received');

    // Extraer el plan del tool call
    if (!result?.tool_calls || result.tool_calls.length === 0) {
      // Intentar parsear del contenido si no hay tool calls
      if (result?.content) {
        const match = result.content.match(/emit_plan\s*\((\{[\s\S]*?\})\)/);
        if (match?.[1]) {
          try {
            const plan = JSON.parse(match[1]) as ExecutionPlan;
            return NextResponse.json(validateAndEnrichPlan(plan, target_tracks));
          } catch (e) {
            console.error('[AGENT-PLAN] Failed to parse plan from content');
          }
        }
      }
      
      return NextResponse.json(
        { error: 'No plan generated' },
        { status: 500 }
      );
    }

    const toolCall = result.tool_calls[0];
    if (toolCall.type !== 'function' || !('function' in toolCall)) {
      return NextResponse.json(
        { error: 'Invalid tool call format' },
        { status: 500 }
      );
    }

    const plan = JSON.parse(toolCall.function.arguments) as ExecutionPlan;
    
    // Validar y enriquecer el plan
    const validatedPlan = validateAndEnrichPlan(plan, target_tracks);

    const duration = Date.now() - startTime;
    console.log('[AGENT-PLAN] Plan generated in', duration, 'ms');
    console.log('[AGENT-PLAN] Thinking steps:', validatedPlan.thinking.length);
    console.log('[AGENT-PLAN] Execution steps:', validatedPlan.execution_plan.length);

    return NextResponse.json(validatedPlan);

  } catch (error: any) {
    console.error('[AGENT-PLAN] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to generate plan', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Valida y enriquece el plan de ejecución
 */
function validateAndEnrichPlan(plan: ExecutionPlan, targetTracks: number): ExecutionPlan {
  // Asegurar que thinking existe
  if (!Array.isArray(plan.thinking) || plan.thinking.length === 0) {
    plan.thinking = ['Analizando el prompt...', 'Preparando las herramientas necesarias...'];
  }

  // Asegurar que execution_plan existe
  if (!Array.isArray(plan.execution_plan) || plan.execution_plan.length === 0) {
    plan.execution_plan = [{
      tool: 'generate_creative_tracks',
      params: { count: targetTracks },
      reason: 'Generación por defecto'
    }];
  }

  // Asegurar total_target
  plan.total_target = plan.total_target || targetTracks;

  // Verificar que adjust_distribution está al final
  const lastTool = plan.execution_plan[plan.execution_plan.length - 1];
  if (lastTool.tool !== 'adjust_distribution') {
    plan.execution_plan.push({
      tool: 'adjust_distribution',
      params: {
        shuffle: true,
        avoid_consecutive_same_artist: true,
        total_target: plan.total_target
      },
      reason: 'Ajuste final de distribución'
    });

    plan.thinking.push('Voy a ajustar la distribución final para variedad...');
  }

  // Limitar a 6 herramientas
  if (plan.execution_plan.length > 6) {
    plan.execution_plan = plan.execution_plan.slice(0, 6);
  }

  // Validar cada herramienta
  const validTools = [
    'get_artist_tracks',
    'get_collaborations',
    'get_similar_style',
    'generate_creative_tracks',
    'search_playlists',
    'adjust_distribution'
  ];

  plan.execution_plan = plan.execution_plan.filter(step => {
    if (!validTools.includes(step.tool)) {
      console.warn('[AGENT-PLAN] Invalid tool removed:', step.tool);
      return false;
    }
    return true;
  });

  return plan;
}

