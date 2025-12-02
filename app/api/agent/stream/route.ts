/**
 * PLEIA Agent Streaming Endpoint
 * 
 * Este endpoint combina la generación de planes con la ejecución de herramientas,
 * emitiendo pensamientos del agente y tracks en tiempo real.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateAgentSystemPrompt, ExecutionPlan, ToolCall } from '@/lib/agent/tools';
import { executeToolCall, Track, ToolResult } from '@/lib/agent/tool-executor';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';
import { createPlaylist, addTracksToPlaylist } from '@/lib/spotify/playlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ═══════════════════════════════════════════════════════════════
// GET Handler (SSE Streaming)
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const prompt = searchParams.get('prompt');
  const targetTracks = parseInt(searchParams.get('target_tracks') || '50', 10);
  const playlistName = searchParams.get('playlist_name') || 'PLEIA Playlist';

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  // Verificar autenticación
  const pleiaUser = await getPleiaServerUser();
  if (!pleiaUser?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const accessToken = await getHubAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Spotify authentication required' }, { status: 401 });
  }

  // Crear stream SSE
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          console.error('[AGENT-STREAM] Error sending event:', e);
        }
      };

      const sendThinking = (thought: string) => {
        sendEvent('AGENT_THINKING', { thought, timestamp: Date.now() });
      };

      try {
        console.log('[AGENT-STREAM] Starting for:', prompt);

        // ═══════════════════════════════════════════════════════════════
        // FASE 1: Generar plan de ejecución
        // ═══════════════════════════════════════════════════════════════
        
        sendEvent('AGENT_START', { message: 'Analizando tu petición...' });
        sendThinking('Analizando el prompt para entender qué tipo de playlist necesitas...');

        const plan = await generatePlan(prompt, targetTracks);
        
        if (!plan) {
          sendEvent('ERROR', { error: 'No se pudo generar el plan' });
          controller.close();
          return;
        }

        console.log('[AGENT-STREAM] Plan generated:', plan.execution_plan.length, 'steps');

        // Emitir todos los pensamientos del plan
        for (const thought of plan.thinking) {
          sendThinking(thought);
          await delay(300); // Pequeña pausa para efecto visual
        }

        sendEvent('AGENT_PLAN', { 
          steps: plan.execution_plan.length,
          tools: plan.execution_plan.map(s => s.tool)
        });

        // ═══════════════════════════════════════════════════════════════
        // FASE 2: Ejecutar herramientas
        // ═══════════════════════════════════════════════════════════════

        const allTracks: Track[] = [];
        const usedTrackIds = new Set<string>();

        for (let i = 0; i < plan.execution_plan.length; i++) {
          const step = plan.execution_plan[i];
          
          // Emitir pensamiento sobre la herramienta actual
          sendThinking(step.reason);
          
          sendEvent('TOOL_START', {
            tool: step.tool,
            stepIndex: i + 1,
            totalSteps: plan.execution_plan.length,
            params: step.params
          });

          // Ejecutar la herramienta
          const result = await executeToolCall(step, accessToken, {
            allTracksSoFar: allTracks,
            usedTrackIds
          });

          // Añadir tracks (excepto adjust_distribution que reordena)
          if (step.tool === 'adjust_distribution') {
            // Reemplazar con los tracks ajustados
            allTracks.length = 0;
            allTracks.push(...result.tracks);
          } else {
            allTracks.push(...result.tracks);
          }

          // Emitir progreso
          sendEvent('TOOL_COMPLETE', {
            tool: step.tool,
            tracksFound: result.tracks.length,
            totalSoFar: allTracks.length,
            target: targetTracks
          });

          // Emitir chunk de tracks
          if (result.tracks.length > 0 && step.tool !== 'adjust_distribution') {
            sendEvent('TRACKS_CHUNK', {
              tracks: result.tracks.slice(0, 10), // Primeros 10 para preview
              totalSoFar: allTracks.length,
              target: targetTracks
            });
          }

          await delay(100);
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 3: Crear playlist en Spotify
        // ═══════════════════════════════════════════════════════════════

        sendThinking('Creando tu playlist en Spotify...');
        
        const finalTracks = allTracks.slice(0, targetTracks);
        
        if (finalTracks.length === 0) {
          sendEvent('ERROR', { error: 'No se encontraron canciones' });
          controller.close();
          return;
        }

        // Crear playlist
        let playlist = null;
        try {
          const trackUris = finalTracks
            .filter(t => t.uri)
            .map(t => t.uri as string);

          if (trackUris.length > 0) {
            playlist = await createPlaylist(accessToken, {
              name: playlistName,
              description: `Generada por PLEIA Agent: "${prompt}"`,
              public: false
            });

            if (playlist?.id) {
              await addTracksToPlaylist(accessToken, playlist.id, trackUris);
              sendThinking('¡Playlist creada! Ya puedes escucharla en Spotify.');
            }
          }
        } catch (playlistError) {
          console.error('[AGENT-STREAM] Error creating playlist:', playlistError);
          sendThinking('No pude crear la playlist en Spotify, pero aquí tienes las canciones.');
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 4: Finalizar
        // ═══════════════════════════════════════════════════════════════

        sendEvent('DONE', {
          tracks: finalTracks,
          totalTracks: finalTracks.length,
          target: targetTracks,
          playlist: playlist ? {
            id: playlist.id,
            name: playlist.name,
            url: playlist.external_urls?.spotify
          } : null,
          message: `¡Listo! He encontrado ${finalTracks.length} canciones para ti.`
        });

        controller.close();

      } catch (error: any) {
        console.error('[AGENT-STREAM] Error:', error);
        sendEvent('ERROR', { error: error.message || 'Error desconocido' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// POST Handler (alternativo)
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const { prompt, target_tracks, playlist_name } = await request.json();
  
  // Redirigir a GET con parámetros
  url.searchParams.set('prompt', prompt);
  url.searchParams.set('target_tracks', String(target_tracks || 50));
  url.searchParams.set('playlist_name', playlist_name || 'PLEIA Playlist');
  
  return GET(new NextRequest(url));
}

// ═══════════════════════════════════════════════════════════════
// Función auxiliar: Generar plan
// ═══════════════════════════════════════════════════════════════

async function generatePlan(prompt: string, targetTracks: number): Promise<ExecutionPlan | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[AGENT-STREAM] No OpenAI API key');
    return null;
  }

  const systemPrompt = generateAgentSystemPrompt();
  
  const userMessage = `Prompt del usuario: "${prompt}"
Número de canciones solicitado: ${targetTracks}

Analiza el prompt y genera un plan de ejecución.
Recuerda incluir adjust_distribution al final.`;

  try {
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
          description: 'Emite el plan de ejecución',
          parameters: {
            type: 'object',
            properties: {
              thinking: {
                type: 'array',
                items: { type: 'string' }
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
                }
              },
              total_target: { type: 'number' }
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
    
    if (!result?.tool_calls?.[0]) {
      // Intentar parsear del contenido
      if (result?.content) {
        const match = result.content.match(/emit_plan\s*\((\{[\s\S]*?\})\)/);
        if (match?.[1]) {
          return JSON.parse(match[1]) as ExecutionPlan;
        }
      }
      return null;
    }

    const toolCall = result.tool_calls[0];
    if (toolCall.type !== 'function' || !('function' in toolCall)) {
      return null;
    }

    const plan = JSON.parse(toolCall.function.arguments) as ExecutionPlan;
    
    // Asegurar adjust_distribution al final
    const lastTool = plan.execution_plan[plan.execution_plan.length - 1];
    if (lastTool?.tool !== 'adjust_distribution') {
      plan.execution_plan.push({
        tool: 'adjust_distribution',
        params: { shuffle: true, avoid_consecutive_same_artist: true, total_target: targetTracks },
        reason: 'Ajustando la distribución final...'
      });
    }

    return plan;

  } catch (error) {
    console.error('[AGENT-STREAM] Plan generation error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Utilidades
// ═══════════════════════════════════════════════════════════════

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

