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
import { logAgentAnalysis } from '@/lib/agent/analysis';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';
import { createPlaylist, addTracksToPlaylist } from '@/lib/spotify/playlist';
import { createClient } from '@supabase/supabase-js';
import { consumeUsage } from '@/lib/billing/usage';
import { MUSICAL_CONTEXTS } from '@/lib/music/contexts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ═══════════════════════════════════════════════════════════════
// GET Handler (SSE Streaming)
// ═══════════════════════════════════════════════════════════════

// Función para generar nombre de playlist con IA
async function generatePlaylistName(prompt: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return 'PLEIA Playlist';
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en crear nombres de playlists atractivos y relevantes. 
          
          Genera un nombre de playlist profesional y atractivo basado EXACTAMENTE en el prompt del usuario. 
          
          REGLAS CRÍTICAS:
          - El nombre DEBE reflejar el contenido real del prompt
          - Si el prompt menciona un festival, evento o lugar específico, inclúyelo en el nombre
          - Si el prompt menciona años (2025, 2024, etc.), inclúyelos si son relevantes
          - Si el prompt menciona un género o estilo, inclúyelo
          - Breve (máximo 40 caracteres)
          - Estilizado y profesional
          - Puedes usar emojis relevantes (máximo 1-2)
          - NO incluir "by PLEIA" o "PLEIA"
          - NO inventar información que no esté en el prompt
          
          Ejemplos CORRECTOS:
          "quiero una playlist para recordar Riverland 2025 y 2024" → "Riverland 2024-2025 🎵" o "Riverland Memories"
          "recordar Riverland 2025" → "Riverland 2025 🎵"
          "trap español para activarme" → "Trap Español 🔥"
          "techno suave 2020s" → "Chill Techno (2020s)"
          "reggaeton como Bad Bunny pero sin Bad Bunny" → "Reggaeton Vibes" o "Reggaeton Style"
          
          Ejemplos INCORRECTOS (NO hacer esto):
          - Si el prompt es sobre Riverland, NO generar algo sobre Bad Bunny
          - Si el prompt es sobre un festival, NO generar algo genérico sin mencionar el festival
          
          Responde SOLO con el nombre de la playlist, sin explicaciones adicionales.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7 // Reducir temperatura para más consistencia
    });

    const generatedName = response.choices[0]?.message?.content?.trim();
    
    // Limpiar el nombre de posibles prefijos/sufijos no deseados
    let cleanedName = generatedName
      .replace(/^["']|["']$/g, '') // Quitar comillas al inicio/final
      .replace(/^Nombre de playlist:\s*/i, '') // Quitar prefijos comunes
      .replace(/^Playlist:\s*/i, '')
      .trim();
    
    if (cleanedName && cleanedName.length > 0 && cleanedName.length <= 100) {
      console.log(`[AGENT-STREAM] Generated playlist name from prompt "${prompt.substring(0, 50)}...": "${cleanedName}"`);
      return cleanedName;
    }
  } catch (error) {
    console.error('[AGENT-STREAM] Error generating playlist name:', error);
  }
  
  // Fallback: usar el prompt truncado, pero mejorado
  const fallbackName = prompt.length > 40 ? prompt.substring(0, 37) + '...' : prompt;
  console.log(`[AGENT-STREAM] Using fallback name: "${fallbackName}"`);
  return fallbackName;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const prompt = searchParams.get('prompt');
  const targetTracks = parseInt(searchParams.get('target_tracks') || '50', 10);
  const userProvidedName = searchParams.get('playlist_name');
  // Si el usuario no proporcionó nombre, usar prompt como fallback (se generará con IA más tarde)
  const playlistName = userProvidedName || 'PLEIA Playlist';

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

      const sendThinking = (thought: string | undefined) => {
        // Validar que thought sea un string válido
        if (!thought || typeof thought !== 'string') {
          return; // No enviar nada si thought es undefined o no es string
        }
        
        // Limpiar cualquier emoji del mensaje antes de enviarlo (más agresivo)
        const cleanThought = thought
          .replace(/💭\s*/g, '')
          .replace(/🤔\s*/g, '')
          .replace(/💬\s*/g, '')
          .replace(/[\u{1F4AD}\u{1F914}\u{1F4AC}\u{1F4A4}]/gu, '') // Unicode ranges para emojis de pensamiento
          .replace(/[\u2600-\u27BF]/g, '') // Rango general de emojis
          .replace(/\s+/g, ' ') // Normalizar espacios
          .trim();
        if (cleanThought) {
          sendEvent('AGENT_THINKING', { thought: cleanThought, timestamp: Date.now() });
        }
      };

      // Variables que necesitan estar en scope para el catch
      let savedPromptId: string | null = null;
      
      try {
        console.log('[AGENT-STREAM] Starting for:', prompt);

        // Guardar el prompt en la base de datos (SIN consumir uso todavía)
        const savePrompt = async (): Promise<string | null> => {
          try {
            if (pleiaUser?.email && prompt) {
              // Obtener URL correcta del request
              const url = new URL(request.url);
              const protocol = url.protocol;
              const host = url.host;
              const baseUrl = `${protocol}//${host}`;
              
              // Guardar prompt
              const response = await fetch(`${baseUrl}/api/telemetry/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'prompt',
                  payload: {
                    email: pleiaUser.email,
                    prompt: prompt,
                    source: 'agent_stream'
                  }
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                const promptId = result.id || null;
                console.log(`[AGENT-STREAM] ✅ Prompt saved: ${promptId || 'unknown'}`);
                return promptId;
              } else {
                const errorText = await response.text();
                console.error('[AGENT-STREAM] Error saving prompt:', errorText);
                return null;
              }
            }
            return null;
          } catch (error) {
            console.error('[AGENT-STREAM] Error in savePrompt:', error);
            return null;
          }
        };
        
        // Consumir uso SOLO si se devolvió al menos 1 canción
        const consumeUsageIfSuccess = async (promptId: string | null, trackCount: number) => {
          if (trackCount === 0) {
            console.log(`[AGENT-STREAM] ⚠️ No tracks returned, skipping usage consumption`);
            return;
          }
          
          if (!promptId || !pleiaUser?.email) {
            console.warn(`[AGENT-STREAM] ⚠️ Cannot consume usage: missing promptId or email`);
            return;
          }
          
          try {
            const consumeResult = await consumeUsage(pleiaUser.email, {
              prompt_id: promptId,
              prompt: prompt.substring(0, 100),
              source: 'agent_stream'
            });
            
            if (consumeResult.ok) {
              console.log(`[AGENT-STREAM] ✅ Usage consumed: ${consumeResult.used}/${consumeResult.remaining === 'unlimited' ? '∞' : consumeResult.remaining}`);
              
              // 🚨 MTRYX: Track usage event to MTRYX
              try {
                const { trackUsage } = await import('@/lib/mtryxClient');
                await trackUsage({
                  email: pleiaUser.email,
                  userId: pleiaUser.id,
                  feature: 'agent_playlist_generation',
                  remainingFreeUses: consumeResult.remaining,
                  plan: consumeResult.plan || 'free',
                  usageId: null, // No tenemos usageId de la versión legacy de consumeUsage
                });
              } catch (mtryxError) {
                // No fallar el flujo si falla el tracking a MTRYX
                console.error('[AGENT-STREAM] ❌ Error tracking usage to MTRYX:', mtryxError);
              }
            } else {
              const reason = 'reason' in consumeResult ? consumeResult.reason : 'unknown';
              console.warn(`[AGENT-STREAM] ⚠️ Usage consumption failed: ${reason}`);
            }
          } catch (usageError) {
            console.error('[AGENT-STREAM] Error consuming usage:', usageError);
          }
        };
        
        // Guardar prompt al inicio (sin consumir uso todavía)
        savedPromptId = await savePrompt();

        // ═══════════════════════════════════════════════════════════════
        // FASE 1: Generar plan de ejecución
        // ═══════════════════════════════════════════════════════════════
        
        sendEvent('AGENT_START', { message: 'Analizando tu petición...' });
        sendThinking('Analizando el prompt para entender qué tipo de playlist necesitas...');

        const plan = await generatePlan(prompt, targetTracks);
        
        if (!plan) {
          console.log('[AGENT-STREAM] ⚠️ Plan generation failed, activating fallback...');
          sendThinking('No se pudo generar el plan. Usando sistema de respaldo...');
          
          // Activar fallback si no se puede generar el plan
          try {
            const url = new URL(request.url);
            const protocol = url.protocol;
            const host = url.host;
            const baseUrl = `${protocol}//${host}`;
            
            const fallbackResponse = await fetch(`${baseUrl}/api/playlist/llm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: prompt,
                target_tracks: targetTracks,
              }),
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              const fallbackTracks = fallbackData.tracks || [];
              
              if (fallbackTracks.length > 0) {
                console.log(`[AGENT-STREAM] ✅ Fallback successful (no plan): ${fallbackTracks.length} tracks`);
                
                sendEvent('FALLBACK_ACTIVATED', {
                  message: 'Se usó el sistema de respaldo para generar tu playlist',
                  reason: 'plan_generation_failed'
                });
                
                // Enviar tracks
                const chunkSize = 10;
                for (let i = 0; i < fallbackTracks.length; i += chunkSize) {
                  const chunk = fallbackTracks.slice(i, i + chunkSize);
                  sendEvent('TRACKS', {
                    tracks: chunk,
                    total: fallbackTracks.length,
                    progress: Math.min(100, Math.round(((i + chunk.length) / fallbackTracks.length) * 100))
                  });
                  await delay(100);
                }
                
                // Crear playlist en Spotify
                let fallbackPlaylist = null;
                try {
                  fallbackPlaylist = await createPlaylist(accessToken, {
                    name: playlistName,
                    description: `Generada por PLEIA: ${prompt.substring(0, 200)}`,
                    public: false
                  });
                  
                  if (fallbackPlaylist?.id) {
                    await addTracksToPlaylist(accessToken, fallbackPlaylist.id, fallbackTracks.map(t => t.uri));
                  }
                } catch (playlistError) {
                  console.error('[AGENT-STREAM] Error creating fallback playlist:', playlistError);
                }
                
                await consumeUsageIfSuccess(savedPromptId, fallbackTracks.length);
                
                // Trackear fallback a MTRYX
                try {
                  const { trackUsage } = await import('@/lib/mtryxClient');
                  await trackUsage({
                    email: pleiaUser.email,
                    userId: pleiaUser.id,
                    feature: 'agent_fallback_playlist_generation',
                    remainingFreeUses: null,
                    plan: null,
                    usageId: null,
                  });
                } catch (mtryxError) {
                  console.error('[AGENT-STREAM] ❌ Error tracking fallback to MTRYX:', mtryxError);
                }
                
                sendEvent('DONE', {
                  tracks: fallbackTracks,
                  totalTracks: fallbackTracks.length,
                  target: targetTracks,
                  playlist: fallbackPlaylist ? {
                    id: fallbackPlaylist.id,
                    name: fallbackPlaylist.name,
                    url: fallbackPlaylist.external_urls?.spotify
                  } : null,
                  message: `¡Listo! Se generaron ${fallbackTracks.length} canciones usando el sistema de respaldo.`,
                  fallback: true
                });
                
                controller.close();
                return;
              }
            }
          } catch (fallbackError) {
            console.error('[AGENT-STREAM] ❌ Fallback failed (no plan):', fallbackError);
          }
          
          sendEvent('ERROR', { error: 'No se pudo generar el plan y el fallback también falló' });
          controller.close();
          return;
        }

        console.log('[AGENT-STREAM] Plan generated:', plan.execution_plan.length, 'steps');

        // Emitir solo el primer pensamiento del plan (resumen general)
        if (plan.thinking && plan.thinking.length > 0) {
          // Combinar los pensamientos en uno más completo
          const mainThought = plan.thinking[0];
          sendThinking(mainThought);
          await delay(500);
        }

        sendEvent('AGENT_PLAN', { 
          steps: plan.execution_plan.length,
          tools: plan.execution_plan.map(s => s.tool)
        });

        // ═══════════════════════════════════════════════════════════════
        // FASE 2: Extraer exclusiones y artistas recomendados del plan
        // ═══════════════════════════════════════════════════════════════

        // Extraer exclusiones (banned_artists) del plan
        const bannedArtists = new Set<string>();
        for (const step of plan.execution_plan) {
          if (step.tool === 'generate_creative_tracks' && step.params?.artists_to_exclude) {
            const excluded = Array.isArray(step.params.artists_to_exclude) 
              ? step.params.artists_to_exclude 
              : [step.params.artists_to_exclude];
            excluded.forEach((artist: string) => bannedArtists.add(artist.toLowerCase()));
          }
        }
        
        // También extraer exclusiones del prompt original (por si el LLM no las puso en el plan)
        // Buscar patrones como "sin X", "no X", "excluir X", "sin canciones de X"
        const promptLower = prompt.toLowerCase();
        
        // Detectar festivales por nombres conocidos (no solo la palabra "festival")
        const festivalNames = ['riverland', 'coachella', 'glastonbury', 'primavera', 'mad cool', 'madcool', 'bbk', 'fiberfib', 'sonar', 'groove', 'lollapalooza', 'tomorrowland', 'download'];
        const isFestival = promptLower.includes('festival') || 
                          festivalNames.some(name => promptLower.includes(name));

        // Patrón mejorado: detectar exclusiones como 'sin X', 'no X', 'excluir X' de forma case-insensitive
        const exclusionPatterns = [
          /sin\s+(?:canciones?\s+de\s+|música\s+de\s+)?([a-záéíóúñ0-9\s]+?)(?:\.|,|$|y|o|con|de|del|la|el|los|las|para)/gi,
          /no\s+(?:quiero\s+|quieres\s+)?(?:canciones?\s+de\s+|música\s+de\s+)?([a-záéíóúñ0-9\s]+?)(?:\.|,|$|y|o|con|de|del|la|el|los|las|para)/gi,
          /excluir\s+(?:a\s+)?([a-záéíóúñ0-9\s]+?)(?:\.|,|$|y|o|con|de|del|la|el|los|las|para)/gi,
        ];

        for (const pattern of exclusionPatterns) {
          let match;
          while ((match = pattern.exec(promptLower)) !== null) {
            const rawName = match[1].trim();
            const commonWords = ['canciones', 'música', 'playlist', 'lista', 'tracks', 'songs', 'artistas', 'rock', 'pop', 'rap', 'hip', 'hop'];

            // Descartar palabras genéricas y ruido
            if (rawName.length <= 2 || commonWords.includes(rawName)) {
              continue;
            }

            // Nombre base detectado en el prompt (ya en minúsculas)
            let artistName = rawName;

            // PARCHE: el regex a veces corta "bad bunny" → "bad bunn"
            if (artistName === 'bad bunn') {
              artistName = 'bad bunny';
            }

            bannedArtists.add(artistName);
            console.log(
              `[AGENT-STREAM] ⚠️ Detected banned artist from prompt: "${artistName}" (raw: "${rawName}")`
            );
          }
        }
        
        // Extraer artistas recomendados (artists_to_include) del plan
        const recommendedArtists = new Set<string>();
        for (const step of plan.execution_plan) {
          if (step.tool === 'generate_creative_tracks' && step.params?.artists_to_include) {
            const included = Array.isArray(step.params.artists_to_include) 
              ? step.params.artists_to_include 
              : [step.params.artists_to_include];
            included.forEach((artist: string) => recommendedArtists.add(artist));
          }
          if (step.tool === 'get_similar_style' && step.params?.seed_artists) {
            const seeds = Array.isArray(step.params.seed_artists) 
              ? step.params.seed_artists 
              : [step.params.seed_artists];
            seeds.forEach((artist: string) => recommendedArtists.add(artist));
          }
          if (step.tool === 'get_artist_tracks' && step.params?.artist) {
            // Los artistas pedidos explícitamente también son recomendados
            recommendedArtists.add(step.params.artist);
          }
        }
        
        // También extraer artistas recomendados del prompt (patrones como "podrían ser X, Y, Z")
        // Buscar: "artistas tipo X podrían ser Y, Z" o "incluye X, Y, Z"
        const commonWords = ['canciones', 'música', 'playlist', 'lista', 'tracks', 'songs', 'artistas', 'rock', 'pop', 'rap', 'hip', 'hop'];
        const recommendedPatterns = [
          /(?:artistas?|artista)\s+tipo\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+\s+(?:podrían\s+ser|serían|podría\s+ser|sería)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s,]+?)(?:\.|$|y|o|con)/gi,
          /(?:podrían\s+ser|podría\s+ser|serían|sería|incluye?|añade?|pon|poner)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s,]+?)(?:\.|$|y|o|con)/gi,
        ];
        
        for (const pattern of recommendedPatterns) {
          let match;
          while ((match = pattern.exec(prompt)) !== null) {
            const artistsText = match[1].trim();
            // Separar por comas y "y"/"o", limpiar espacios
            const artists = artistsText
              .split(/[,yYoO]/)
              .map(a => a.trim())
              .filter(a => a.length > 1 && !commonWords.includes(a.toLowerCase()));
            
            artists.forEach(artist => {
              if (artist.length > 2) {
                recommendedArtists.add(artist);
                console.log(`[AGENT-STREAM] ✅ Detected recommended artist from prompt: "${artist}"`);
              }
            });
          }
        }
        
        console.log(`[AGENT-STREAM] Banned artists: [${Array.from(bannedArtists).join(', ')}]`);
        console.log(`[AGENT-STREAM] Recommended artists: [${Array.from(recommendedArtists).join(', ')}]`);

        // ═══════════════════════════════════════════════════════════════
        // FASE 3: Ejecutar herramientas
        // ═══════════════════════════════════════════════════════════════

        const allTracks: Track[] = [];
        const usedTrackIds = new Set<string>();
        
        // Helper para filtrar tracks excluidos
        const filterBannedArtists = (tracks: Track[]): Track[] => {
          return tracks.filter(track => {
            const trackArtists = track.artists?.map((a: any) => a.name.toLowerCase()) || [];
            const hasBannedArtist = trackArtists.some(artist => bannedArtists.has(artist));
            if (hasBannedArtist) {
              const bannedFound = trackArtists.filter(artist => bannedArtists.has(artist));
              console.log(`[AGENT-STREAM] ⚠️ FILTERED OUT: "${track.name}" by [${track.artists?.map((a: any) => a.name).join(', ')}]`);
              console.log(`[AGENT-STREAM] ⚠️ REASON: Contains banned artist(s): [${bannedFound.join(', ')}]`);
              console.log(`[AGENT-STREAM] ⚠️ All track artists: [${trackArtists.join(', ')}]`);
              console.log(`[AGENT-STREAM] ⚠️ Banned list: [${Array.from(bannedArtists).join(', ')}]`);
              return false;
            }
            return true;
          });
        };

        for (let i = 0; i < plan.execution_plan.length; i++) {
          const step = plan.execution_plan[i];
          
          console.log(`[AGENT-STREAM] ===== TOOL ${i + 1}/${plan.execution_plan.length}: ${step.tool} =====`);
          console.log(`[AGENT-STREAM] Tool params:`, JSON.stringify(step.params, null, 2));
          
          // Verificar y corregir min_consensus para search_playlists de festivales
          if (step.tool === 'search_playlists' && step.params?.query) {
            const queryLower = (step.params.query as string).toLowerCase();
            const festivalNames = ['riverland', 'coachella', 'glastonbury', 'primavera', 'mad cool', 'madcool', 'bbk', 'fiberfib', 'sonar', 'groove', 'lollapalooza', 'tomorrowland', 'download'];
            const isFestivalQuery = queryLower.includes('festival') || 
                                   festivalNames.some(name => queryLower.includes(name)) ||
                                   isFestival; // También verificar el prompt original
            
            if (isFestivalQuery) {
              if (!step.params.min_consensus || step.params.min_consensus < 2) {
                console.warn(`[AGENT-STREAM] ⚠️ Festival detected, forcing min_consensus=2 (was ${step.params.min_consensus || 'not set'})`);
                step.params.min_consensus = 2;
              }
              if (!step.params.limit_playlists || step.params.limit_playlists < 10) {
                step.params.limit_playlists = 10;
              }
              if (!step.params.tracks_per_playlist || step.params.tracks_per_playlist < 50) {
                step.params.tracks_per_playlist = 50;
              }
            }
          }
          
          console.log(`[AGENT-STREAM] Banned artists at start: [${Array.from(bannedArtists).join(', ')}]`);
          console.log(`[AGENT-STREAM] Total tracks before: ${allTracks.length}`);
          
          // Emitir pensamiento sobre la herramienta actual
          if (step.reason) {
            sendThinking(step.reason);
          }
          
          sendEvent('TOOL_START', {
            tool: step.tool,
            stepIndex: i + 1,
            totalSteps: plan.execution_plan.length,
            params: step.params
          });

          // Ejecutar la herramienta (pasar bannedArtists para filtrado interno)
          const result = await executeToolCall(step, accessToken, {
            allTracksSoFar: allTracks,
            usedTrackIds,
            bannedArtists
          });

          console.log(`[AGENT-STREAM] Tool returned ${result.tracks.length} raw tracks`);
          if (result.tracks.length > 0) {
            console.log(`[AGENT-STREAM] First 5 tracks from tool:`, result.tracks.slice(0, 5).map(t => {
              const artists = t.artists?.map(a => a.name).join(', ') || 'unknown';
              const hasFrankOcean = artists.toLowerCase().includes('frank ocean');
              return {
              name: t.name,
                artists: artists,
                suspicious: hasFrankOcean ? '🔍 FRANK OCEAN DETECTED' : ''
              };
            }));
            
            // Buscar específicamente Frank Ocean en los tracks
            const frankOceanTracks = result.tracks.filter(t => {
              const artists = t.artists?.map(a => a.name.toLowerCase()).join(', ') || '';
              return artists.includes('frank ocean');
            });
            if (frankOceanTracks.length > 0) {
              console.error(`[AGENT-STREAM] 🚨🚨🚨 FRANK OCEAN FOUND IN ${step.tool} RESULTS! 🚨🚨🚨`);
              frankOceanTracks.forEach(t => {
                console.error(`[AGENT-STREAM] 🚨 Track: "${t.name}" by [${t.artists?.map(a => a.name).join(', ')}]`);
              });
            }
          }

          // Filtrar tracks excluidos ANTES de añadirlos
          const filteredTracks = filterBannedArtists(result.tracks);
          console.log(`[AGENT-STREAM] After filtering banned artists: ${filteredTracks.length} tracks (filtered ${result.tracks.length - filteredTracks.length})`);

          // Añadir tracks (excepto adjust_distribution que reordena)
          if (step.tool === 'adjust_distribution') {
            // Reemplazar con los tracks ajustados (ya filtrados)
            allTracks.length = 0;
            allTracks.push(...filteredTracks);
          } else {
            allTracks.push(...filteredTracks);
          }

          console.log(`[AGENT-STREAM] Total tracks after ${step.tool}: ${allTracks.length}`);
          console.log(`[AGENT-STREAM] ===== END TOOL ${i + 1}: ${step.tool} =====\n`);

          // Solo emitir progreso interno (sin mensaje visible al usuario)
          sendEvent('TOOL_COMPLETE', {
            tool: step.tool,
            tracksFound: result.tracks.length,
            totalSoFar: allTracks.length,
            target: targetTracks
          });

          // Pausa mínima entre herramientas
          await delay(50);
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 3: Rellenar si faltan tracks
        // ═══════════════════════════════════════════════════════════════

        console.log('[AGENT-STREAM] All tools executed. Total tracks collected:', allTracks.length);

        // Si no hemos conseguido nada pero hay artistas vetados (caso tpico: "como X pero sin X"),
        // intentamos una pasada de emergencia con get_similar_style para artistas similares al vetado.
        const minTracksThreshold = Math.floor(targetTracks / 3);
        if (allTracks.length < minTracksThreshold && bannedArtists.size > 0) {
          try {
            const seedArtists = Array.from(bannedArtists);
            console.log(`[AGENT-STREAM] Only ${allTracks.length} tracks after initial plan (threshold: ${minTracksThreshold}). Running emergency get_similar_style with seeds:`, seedArtists);
            sendThinking('Buscando artistas similares al estilo solicitado...');

            const emergencyStep: ToolCall = {
              tool: 'get_similar_style',
              params: {
                seed_artists: seedArtists,
                limit: targetTracks * 2,
                include_seed_artists: false,
                style_modifier: 'mismo estilo pero sin incluir nunca al artista original',
              },
              reason: 'Buscar artistas y canciones similares a los artistas vetados, pero sin incluirlos, para poder ofrecer alternativas.',
            };

            const emergencyResult = await executeToolCall(emergencyStep, accessToken, {
              allTracksSoFar: allTracks,
              usedTrackIds,
              bannedArtists
            });

            const emergencyFiltered = filterBannedArtists(emergencyResult.tracks);
            allTracks.push(...emergencyFiltered);

            console.log('[AGENT-STREAM] Emergency similar-style step added', emergencyFiltered.length, 'tracks. Total now:', allTracks.length);
          } catch (emergencyError) {
            console.error('[AGENT-STREAM] Emergency similar-style fallback failed:', emergencyError);
          }
        }

        // Si faltan tracks, intentar rellenar con recomendaciones
        // PERO: Para festivales, NO hacer fill automático - solo usar search_playlists con más playlists
        // (isFestival ya está declarado arriba, no redeclarar)
        
        if (allTracks.length < targetTracks && allTracks.length > 0) {
          const missing = targetTracks - allTracks.length;
          
          // Para festivales, intentar buscar más playlists en lugar de hacer fill genérico
          // MEJORA: Solo hacer búsquedas adicionales si realmente faltan muchas canciones (más de 10)
          // y limitar a máximo 2 búsquedas adicionales para mantener calidad
          if (isFestival && missing > 10) {
            console.log(`[AGENT-STREAM] Festival detected - missing ${missing} tracks. Trying additional search_playlists instead of generic fill...`);
            sendThinking(`Buscando más playlists del festival para completar...`);
            
            try {
              const festivalMatch = prompt.match(/\b(festival\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i);
              const festivalName = festivalMatch ? (festivalMatch[2] || festivalMatch[0]) : prompt;
              
              // MEJORA: Reducir queries adicionales y hacerlas más estrictas
              // Solo las 2 más relevantes, con min_consensus más alto
              const additionalQueries = [
                `${festivalName} 2024`,
                `${festivalName} lineup`
              ];
              
              let queriesExecuted = 0;
              const MAX_ADDITIONAL_QUERIES = 2; // Limitar a 2 búsquedas adicionales
              
              for (const query of additionalQueries) {
                if (allTracks.length >= targetTracks || queriesExecuted >= MAX_ADDITIONAL_QUERIES) break;
                
                const additionalStep: ToolCall = {
                  tool: 'search_playlists',
                  params: {
                    query: `${query} playlist`,
                    limit_playlists: 3, // Reducir de 5 a 3 playlists
                    tracks_per_playlist: 30, // Reducir de 50 a 30 tracks por playlist
                    min_consensus: 3, // AUMENTAR consenso de 2 a 3 para mayor calidad
                  },
                  reason: `Buscar más playlists del festival con query alternativa: ${query}`,
                };

                const additionalResult = await executeToolCall(additionalStep, accessToken, {
                  allTracksSoFar: allTracks,
                  usedTrackIds,
                  bannedArtists
                });

                const additionalFiltered = filterBannedArtists(additionalResult.tracks);
                allTracks.push(...additionalFiltered);
                queriesExecuted++;
                console.log(`[AGENT-STREAM] Additional search "${query}" added ${additionalFiltered.length} tracks. Total now: ${allTracks.length}`);
              }
            } catch (festivalFillError) {
              console.error('[AGENT-STREAM] Festival fill failed:', festivalFillError);
            }
          } else if (isFestival && missing <= 10) {
            // Si faltan 10 o menos tracks, mejor no hacer búsquedas adicionales para mantener calidad
            console.log(`[AGENT-STREAM] Festival detected but only missing ${missing} tracks. Skipping additional searches to maintain quality.`);
          } else {
            // Solo hacer fill genérico si NO es un festival
            console.log(`[AGENT-STREAM] Missing ${missing} tracks, attempting to fill with recommendations...`);
            sendThinking(`Encontré ${allTracks.length} canciones, buscando ${missing} más para completar...`);
            
            // Timeout de 5 segundos: si faltan muy pocas canciones (1-3), usar generación creativa después de 5s
            const fillStartTime = Date.now();
            const FILL_TIMEOUT_MS = 5000; // 5 segundos
            const shouldUseQuickFallback = missing <= 3; // Solo para 1-3 canciones faltantes
            
            try {
              // Helper para shuffle aleatorio (Fisher-Yates)
              const shuffle = <T>(array: T[]): T[] => {
              const arr = [...array];
              for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
              }
              return arr;
            };
            
              // USAR LA ESTRATEGIA DE RELLENO DEL PLAN
              const fillStrategy = plan.fill_strategy || 'recommendations';
              const requestedArtists = plan.requested_artists || [];
              
              // Extraer restricciones de colaboración del plan
              const collaborationRestrictions = new Map<string, string[]>(); // artista -> [artistas con los que puede colaborar]
              for (const step of plan.execution_plan) {
                if (step.tool === 'get_collaborations') {
                  const mainArtist = step.params?.main_artist;
                  const mustCollabWith = step.params?.must_collaborate_with || [];
                  if (mainArtist) {
                    collaborationRestrictions.set(mainArtist.toLowerCase(), mustCollabWith.map((a: string) => a.toLowerCase()));
                  }
                }
              }
              
              console.log(`[AGENT-STREAM] Fill strategy: ${fillStrategy}`);
              console.log(`[AGENT-STREAM] Requested artists from plan: [${requestedArtists.join(', ')}]`);
              console.log(`[AGENT-STREAM] Recommended artists: [${Array.from(recommendedArtists).join(', ')}]`);
              console.log(`[AGENT-STREAM] Collaboration restrictions:`, Object.fromEntries(collaborationRestrictions));
              
              let artistNames: string[] = [];
              
              switch (fillStrategy) {
                case 'only_requested_artists':
                  // SOLO usar los artistas del prompt - no añadir ninguno más
                  artistNames = shuffle([...new Set(requestedArtists)]);
                  console.log(`[AGENT-STREAM] Only using ${artistNames.length} requested artists`);
                  break;
                  
                case 'similar_artists':
                  // PRIORIDAD: Artistas recomendados explícitamente, luego los pedidos, luego de tracks
                  const fromTracks = allTracks.flatMap(t => t.artists?.map((a: any) => a.name) || [])
                    .filter(name => !bannedArtists.has(name.toLowerCase())); // Excluir artistas banneados
                  
                  // Combinar: recomendados primero, luego pedidos, luego de tracks (sin duplicados)
                  const allCandidates = [...recommendedArtists, ...requestedArtists, ...fromTracks];
                  artistNames = shuffle([...new Set(allCandidates)]);
                  console.log(`[AGENT-STREAM] Using ${artistNames.length} artists (recommended + requested + from tracks)`);
                  break;
                  
                case 'any_from_genre':
                case 'recommendations':
                default:
                  // PRIORIDAD: Artistas recomendados primero, luego de tracks (sin artistas banneados)
                  const fromTracksFiltered = allTracks.flatMap(t => t.artists?.map((a: any) => a.name) || [])
                    .filter(name => !bannedArtists.has(name.toLowerCase()));
                  
                  // Combinar recomendados con tracks encontrados
                  const combined = [...recommendedArtists, ...fromTracksFiltered];
                  artistNames = shuffle([...new Set(combined)]);
                  console.log(`[AGENT-STREAM] Using ${artistNames.length} artists (recommended + from tracks, no banned)`);
                  break;
              }
              
              // Filtrar artistas banneados de la lista final
              artistNames = artistNames.filter(name => !bannedArtists.has(name.toLowerCase()));
              
              if (artistNames.length === 0) {
                console.log('[AGENT-STREAM] No artists to fill with, skipping fill phase');
              } else {
                console.log(`[AGENT-STREAM] Will fill with: [${artistNames.slice(0, 5).join(', ')}${artistNames.length > 5 ? '...' : ''}]`);
              }
              
              // Buscar tracks de cada artista y guardarlos organizados
              const tracksByArtist: Map<string, any[]> = new Map();
              
              for (const artistName of artistNames) {
              // Buscar MUCHOS tracks de este artista (con múltiples búsquedas si es necesario)
              let artistTracks: any[] = [];
              const neededPerArtist = Math.ceil(missing / artistNames.length) + 5; // Extra por si hay duplicados
              
              const artistNameLower = artistName.toLowerCase();
              const restrictions = collaborationRestrictions.get(artistNameLower);
              
              // Si tiene restricciones, buscar SOLO colaboraciones
              if (restrictions && restrictions.length > 0) {
                console.log(`[AGENT-STREAM] ${artistName} has restrictions - searching only collaborations with [${restrictions.join(', ')}]`);
                
                // Buscar colaboraciones específicas
                for (const collaborator of restrictions) {
                  if (artistTracks.length >= neededPerArtist) break;
                  
                  const queries = [
                    `${artistName} ${collaborator}`,
                    `${artistName} feat ${collaborator}`,
                    `${collaborator} ${artistName}`,
                    `${collaborator} feat ${artistName}`,
                  ];
                  
                  for (const query of queries) {
                    if (artistTracks.length >= neededPerArtist) break;
                    
                    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`;
                    const searchResponse = await fetch(searchUrl, {
                      headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    
                    if (searchResponse.ok) {
                      const searchData = await searchResponse.json();
                      const rawTracks = (searchData.tracks?.items || [])
                        .filter((t: any) => {
                          const trackArtists = t.artists?.map((a: any) => a.name.toLowerCase()) || [];
                          
                          // CRÍTICO: Verificar que no contiene artistas banneados
                          const hasBannedArtist = trackArtists.some(artist => bannedArtists.has(artist));
                          if (hasBannedArtist) return false;
                          
                          const hasArtist = trackArtists.includes(artistNameLower);
                          const hasCollaborator = trackArtists.some((ta: string) => 
                            restrictions.some((r: string) => ta.includes(r) || r.includes(ta))
                          );
                          return hasArtist && hasCollaborator && t.id && !usedTrackIds.has(t.id);
                        })
                        .map((track: any) => ({
                          id: track.id,
                          name: track.name,
                          uri: track.uri,
                          artists: track.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
                          album: track.album ? {
                            id: track.album.id,
                            name: track.album.name,
                            images: track.album.images || []
                          } : undefined
                        }));
                      
                      artistTracks.push(...rawTracks);
                    }
                  }
                }
              } else {
                // Sin restricciones: búsqueda normal
                // Primera búsqueda: por nombre de artista
                const randomOffset = Math.floor(Math.random() * 10);
                const searchUrl = `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(artistName)}&type=track&limit=50&offset=${randomOffset}`;
                const searchResponse = await fetch(searchUrl, {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  const rawTracks = (searchData.tracks?.items || [])
                    .filter((t: any) => {
                      // Verificar que el artista está en la canción
                      const trackArtists = t.artists?.map((a: any) => a.name.toLowerCase()) || [];
                      
                      // CRÍTICO: Verificar que no contiene artistas banneados
                      const hasBannedArtist = trackArtists.some(artist => bannedArtists.has(artist));
                      if (hasBannedArtist) return false;
                      
                      return trackArtists.includes(artistNameLower) && 
                             t.id && !usedTrackIds.has(t.id);
                    })
                    .map((track: any) => ({
                      id: track.id,
                      name: track.name,
                      uri: track.uri,
                      artists: track.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
                      album: track.album ? {
                        id: track.album.id,
                        name: track.album.name,
                        images: track.album.images || []
                      } : undefined
                    }));
                  
                  artistTracks.push(...rawTracks);
                }
                
                // Segunda búsqueda: solo el nombre (sin "artist:")
                if (artistTracks.length < neededPerArtist) {
                  const searchUrl2 = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=track&limit=50`;
                  const searchResponse2 = await fetch(searchUrl2, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                  });
                  
                  if (searchResponse2.ok) {
                    const searchData2 = await searchResponse2.json();
                    const rawTracks2 = (searchData2.tracks?.items || [])
                      .filter((t: any) => {
                        const trackArtists = t.artists?.map((a: any) => a.name.toLowerCase()) || [];
                        
                        // CRÍTICO: Verificar que no contiene artistas banneados
                        const hasBannedArtist = trackArtists.some(artist => bannedArtists.has(artist));
                        if (hasBannedArtist) return false;
                        
                        const isDuplicate = artistTracks.some(at => at.id === t.id);
                        return trackArtists.includes(artistNameLower) && 
                               t.id && !usedTrackIds.has(t.id) && !isDuplicate;
                      })
                      .map((track: any) => ({
                        id: track.id,
                        name: track.name,
                        uri: track.uri,
                        artists: track.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
                        album: track.album ? {
                          id: track.album.id,
                          name: track.album.name,
                          images: track.album.images || []
                        } : undefined
                      }));
                    
                    artistTracks.push(...rawTracks2);
                  }
                }
              }
              
              // Mezclar los tracks de este artista
              artistTracks = shuffle(artistTracks);
              
              if (artistTracks.length > 0) {
                tracksByArtist.set(artistName, artistTracks);
              }
            }
            
            console.log(`[AGENT-STREAM] Collected tracks from ${tracksByArtist.size} artists (total: ${Array.from(tracksByArtist.values()).reduce((sum, tracks) => sum + tracks.length, 0)} tracks)`);
            
            // Convertir el Map a array y mezclarlo para variar el orden de artistas
            const artistEntries = shuffle([...tracksByArtist.entries()]);
            
            // Si no hay artistas, no podemos rellenar
            if (artistEntries.length === 0) {
              console.log('[AGENT-STREAM] ⚠️ No artists available for fill, skipping balanced fill');
            } else {
                // CRÍTICO: Añadir tracks de forma equilibrada: 1 de cada artista, luego 2º de cada, etc.
                // Continuar hasta llegar al target o quedarnos sin tracks
                let round = 0;
                const maxRounds = Math.max(20, Math.ceil(targetTracks / Math.max(1, artistEntries.length))); // Aumentar rounds según necesidad, evitar división por 0
                
                console.log(`[AGENT-STREAM] Starting balanced fill: ${allTracks.length}/${targetTracks} tracks, ${artistEntries.length} artists, max ${maxRounds} rounds`);
                
                while (allTracks.length < targetTracks && round < maxRounds) {
              // Verificar timeout: si faltan pocas canciones y pasaron más de 5s, salir del bucle
              const fillElapsed = Date.now() - fillStartTime;
              if (shouldUseQuickFallback && fillElapsed > FILL_TIMEOUT_MS) {
                console.log(`[AGENT-STREAM] ⏱️ Fill timeout reached (${fillElapsed}ms) during balanced fill. Breaking loop to use quick fallback...`);
                break;
              }
              
              let addedThisRound = 0;
              
              // Mezclar el orden de artistas en cada ronda para más variedad
              const shuffledEntries = shuffle(artistEntries);
              
              for (const [artistName, artistTracks] of shuffledEntries) {
                if (allTracks.length >= targetTracks) break;
                
                // Obtener el track de esta ronda para este artista (round = índice en el array)
                if (round < artistTracks.length) {
                  const track = artistTracks[round];
                  
                  // Verificar duplicados
                  if (usedTrackIds.has(track.id)) {
                    // Si este track ya está usado, intentar el siguiente de este artista
                    let foundAlternative = false;
                    for (let altRound = round + 1; altRound < Math.min(round + 5, artistTracks.length); altRound++) {
                      const altTrack = artistTracks[altRound];
                      if (!usedTrackIds.has(altTrack.id)) {
                        // Usar este track alternativo
                        const trackArtists = altTrack.artists?.map((a: any) => a.name.toLowerCase()) || [];
                        const hasBannedArtist = trackArtists.some(artist => bannedArtists.has(artist));
                        
                        if (!hasBannedArtist) {
                          usedTrackIds.add(altTrack.id);
                          allTracks.push(altTrack);
                          addedThisRound++;
                          foundAlternative = true;
                          console.log(`[AGENT-STREAM] ✅ FILL: Added "${altTrack.name}" by ${artistName} (round ${round}, alt ${altRound})`);
                          break;
                        }
                      }
                    }
                    if (foundAlternative) continue;
                    else continue; // Saltar este artista en esta ronda
                  }
                  
                  // CRÍTICO: Verificar restricciones de colaboración
                  const artistNameLower = artistName.toLowerCase();
                  const restrictions = collaborationRestrictions.get(artistNameLower);
                  
                  if (restrictions && restrictions.length > 0) {
                    // Este artista solo puede aparecer en colaboraciones con artistas específicos
                    const trackArtists = track.artists?.map((a: any) => a.name.toLowerCase()) || [];
                    const hasRestrictedArtist = trackArtists.includes(artistNameLower);
                    
                    if (hasRestrictedArtist) {
                      // Verificar que al menos uno de los colaboradores permitidos está en el track
                      const hasAllowedCollaborator = trackArtists.some((trackArtist: string) => 
                        restrictions.some((allowed: string) => 
                          trackArtist.includes(allowed) || allowed.includes(trackArtist)
                        )
                      );
                      
                      if (!hasAllowedCollaborator) {
                        console.log(`[AGENT-STREAM] ⚠️ Skipping track "${track.name}" - ${artistName} must collaborate with [${restrictions.join(', ')}]`);
                        continue; // Saltar este track, no cumple la restricción
                      }
                    }
                  }
                  
                  // CRÍTICO: Verificar que no contiene artistas banneados
                  const trackArtists = track.artists?.map((a: any) => a.name.toLowerCase()) || [];
                  const hasBannedArtist = trackArtists.some(artist => bannedArtists.has(artist));
                  
                  if (hasBannedArtist) {
                    const bannedFound = trackArtists.filter(artist => bannedArtists.has(artist));
                    console.log(`[AGENT-STREAM] ⚠️ FILL SKIP: "${track.name}" by [${track.artists?.map((a: any) => a.name).join(', ')}]`);
                    console.log(`[AGENT-STREAM] ⚠️ REASON: Contains banned: [${bannedFound.join(', ')}]`);
                    continue;
                  }
                  
                  // Añadir el track si pasa todas las verificaciones
                  usedTrackIds.add(track.id);
                  allTracks.push(track);
                  addedThisRound++;
                  console.log(`[AGENT-STREAM] ✅ FILL: Added "${track.name}" by ${artistName} (round ${round}, total: ${allTracks.length}/${targetTracks})`);
                }
              }
              
              // Si no añadimos nada en esta ronda, intentar buscar más tracks de los artistas existentes
              if (addedThisRound === 0) {
                console.log(`[AGENT-STREAM] ⚠️ No tracks added in round ${round}, but still need ${targetTracks - allTracks.length} more`);
                
                // Intentar buscar más tracks de los artistas que ya tenemos
                let foundMore = false;
                for (const [artistName, existingTracks] of artistEntries) {
                  if (allTracks.length >= targetTracks) break;
                  if (existingTracks.length <= round + 5) {
                    // Este artista tiene pocos tracks, intentar buscar más
                    try {
                      const searchUrl = `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(artistName)}&type=track&limit=20&offset=${existingTracks.length}`;
                      const searchResponse = await fetch(searchUrl, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                      });
                      
                      if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        const newTracks = (searchData.tracks?.items || [])
                          .filter((t: any) => {
                            const trackArtists = t.artists?.map((a: any) => a.name.toLowerCase()) || [];
                            const hasBannedArtist = trackArtists.some(artist => bannedArtists.has(artist));
                            return !hasBannedArtist && 
                                   trackArtists.includes(artistName.toLowerCase()) && 
                                   t.id && !usedTrackIds.has(t.id);
                          })
                          .map((track: any) => ({
                            id: track.id,
                            name: track.name,
                            uri: track.uri,
                            artists: track.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
                            album: track.album ? {
                              id: track.album.id,
                              name: track.album.name,
                              images: track.album.images || []
                            } : undefined
                          }));
                        
                        if (newTracks.length > 0) {
                          existingTracks.push(...newTracks);
                          tracksByArtist.set(artistName, existingTracks);
                          foundMore = true;
                          console.log(`[AGENT-STREAM] 🔍 Found ${newTracks.length} more tracks for "${artistName}"`);
                        }
                      }
                    } catch (searchErr) {
                      console.warn(`[AGENT-STREAM] Error searching more tracks for ${artistName}:`, searchErr);
                    }
                  }
                }
                
                // Si no encontramos más tracks después de buscar, salir
                if (!foundMore) {
                  console.log(`[AGENT-STREAM] No more tracks available at round ${round}, stopping fill`);
                break;
                }
              }
              
                  round++;
                }
                
                console.log(`[AGENT-STREAM] ✅ After balanced fill: ${allTracks.length}/${targetTracks} tracks (${round} rounds, ${allTracks.length < targetTracks ? 'INCOMPLETE' : 'COMPLETE'})`);
                
                // Si aún faltan tracks y pasaron más de 5 segundos, usar generación creativa rápida (solo si NO es festival)
                const fillElapsed = Date.now() - fillStartTime;
                if (allTracks.length < targetTracks && shouldUseQuickFallback && fillElapsed > FILL_TIMEOUT_MS && !isFestival) {
                  const stillMissing = targetTracks - allTracks.length;
                  console.log(`[AGENT-STREAM] ⏱️ Fill timeout reached (${fillElapsed}ms). Still missing ${stillMissing} tracks. Using quick creative fallback...`);
                  sendThinking(`Generando ${stillMissing} canción${stillMissing > 1 ? 'es' : ''} final${stillMissing > 1 ? 'es' : ''}...`);
                  
                  try {
                    const quickFallbackStep: ToolCall = {
                      tool: 'generate_creative_tracks',
                      params: {
                        theme: prompt,
                        count: stillMissing * 5, // Pedir más para compensar filtrados
                        artists_to_exclude: Array.from(bannedArtists),
                      },
                      reason: 'Fallback rápido después de timeout de 5s para completar las últimas canciones.',
                    };

                    const quickFallbackResult = await executeToolCall(quickFallbackStep, accessToken, {
                      allTracksSoFar: allTracks,
                      usedTrackIds,
                      bannedArtists
                    });

                    const quickFiltered = filterBannedArtists(quickFallbackResult.tracks);
                    allTracks.push(...quickFiltered.slice(0, stillMissing));
                    console.log(`[AGENT-STREAM] Quick fallback added ${Math.min(quickFiltered.length, stillMissing)} tracks. Total now: ${allTracks.length}`);
                  } catch (quickError) {
                    console.error('[AGENT-STREAM] Quick fallback failed:', quickError);
                  }
                }
              } // Cierre del else dentro del try (si hay artistas)
            } catch (fillError) {
              console.error('[AGENT-STREAM] Error filling tracks:', fillError);
              console.error('[AGENT-STREAM] Fill error details:', fillError instanceof Error ? fillError.stack : fillError);
              // Continuar sin rellenar
            }
          } // Cierre del else para fill genérico (no festival)
        }
        
        // ═══════════════════════════════════════════════════════════════
        // FASE 3.5: Fallback creativo final SOLO si seguimos sin canciones o muy pocas
        // ═══════════════════════════════════════════════════════════════
        
        const minTracksForCreativeFallback = Math.floor(targetTracks / 3);
        if (allTracks.length < minTracksForCreativeFallback) {
          console.warn(`[AGENT-STREAM] Only ${allTracks.length} tracks after plan + fill (threshold: ${minTracksForCreativeFallback}). Trying ultimate creative fallback...`);
          
          // Detectar si es un festival - NO usar generate_creative_tracks para festivales
          // (isFestival ya está declarado arriba, usar esa variable)
          
          if (isFestival) {
            console.warn(`[AGENT-STREAM] ⚠️ Festival detected! Trying search_playlists instead of generate_creative_tracks`);
            sendThinking('Buscando playlists del festival...');
            try {
              // Extraer nombre del festival del prompt
              const festivalMatch = prompt.match(/\b(festival\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i);
              const festivalName = festivalMatch ? (festivalMatch[2] || festivalMatch[0]) : prompt;
              
              const festivalStep: ToolCall = {
                tool: 'search_playlists',
                params: {
                  query: `${festivalName} festival playlist`,
                  limit_playlists: 10, // Buscar 10 playlists diferentes
                  tracks_per_playlist: 50, // 50 tracks de cada playlist (mínimo para tener suficiente material)
                  min_consensus: 2, // CRÍTICO: Requerir que aparezca en al menos 2 playlists
                },
                reason: 'Buscar playlists reales del festival en lugar de generar canciones inventadas. Solo tracks que aparezcan en al menos 2 playlists.',
              };

              const festivalResult = await executeToolCall(festivalStep, accessToken, {
                allTracksSoFar: allTracks,
                usedTrackIds,
                bannedArtists
              });

              const festivalFiltered = filterBannedArtists(festivalResult.tracks);
              allTracks.push(...festivalFiltered);
              console.log('[AGENT-STREAM] Festival playlists added', festivalFiltered.length, 'tracks. Total now:', allTracks.length);
            } catch (festivalError) {
              console.error('[AGENT-STREAM] Festival playlist search failed:', festivalError);
              // Si falla, no usar generate_creative_tracks para festivales
              console.warn('[AGENT-STREAM] Skipping generate_creative_tracks for festival to avoid incorrect songs');
            }
          } else {
            // Solo usar generate_creative_tracks si NO es un festival
            sendThinking('Usando generación creativa como último recurso...');
            try {
              // Detectar género del prompt si es posible
              let detectedGenre = '';
              if (promptLower.includes('reggaeton') || promptLower.includes('latin') || promptLower.includes('urbano')) {
                detectedGenre = 'reggaeton, latin, urbano';
              } else if (promptLower.includes('rock')) {
                detectedGenre = 'rock, alternative';
              } else if (promptLower.includes('pop')) {
                detectedGenre = 'pop';
              } else if (promptLower.includes('hip hop') || promptLower.includes('rap')) {
                detectedGenre = 'hip hop, rap';
              }

              const fallbackStep: ToolCall = {
                tool: 'generate_creative_tracks',
                params: {
                  theme: prompt,
                  genre: detectedGenre || undefined,
                  count: targetTracks * 3, // Pedir MÁS para compensar filtrados
                  artists_to_exclude: Array.from(bannedArtists),
                },
                reason: 'Fallback creativo final cuando las demás herramientas no han devuelto suficientes canciones.',
              };

              const fallbackResult = await executeToolCall(fallbackStep, accessToken, {
                allTracksSoFar: allTracks,
                usedTrackIds,
                bannedArtists
              });

              const fallbackFiltered = filterBannedArtists(fallbackResult.tracks);
              allTracks.push(...fallbackFiltered);

              console.log('[AGENT-STREAM] Creative fallback added', fallbackFiltered.length, 'tracks. Total now:', allTracks.length);
            } catch (fallbackError) {
              console.error('[AGENT-STREAM] Ultimate creative fallback failed:', fallbackError);
            }
          }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // FASE 4: Ajustar distribución final (si no se hizo ya)
        // ═══════════════════════════════════════════════════════════════
        
        // Verificar si adjust_distribution ya se ejecutó en el plan
        const hasAdjustDistribution = plan.execution_plan.some(step => step.tool === 'adjust_distribution');
        
        if (!hasAdjustDistribution && allTracks.length > 0) {
          console.log('[AGENT-STREAM] adjust_distribution not in plan, calling it now before finalizing...');
          sendThinking('Ajustando la distribución final para variedad...');
          
          try {
            // Extraer artistas prioritarios de artists_to_include en el plan
            const priorityArtistsFromPlan: string[] = [];
            for (const step of plan.execution_plan) {
              if (step.tool === 'generate_creative_tracks' && step.params?.artists_to_include) {
                const included = Array.isArray(step.params.artists_to_include)
                  ? step.params.artists_to_include
                  : [step.params.artists_to_include];
                included.forEach((artist: string) => {
                  if (!priorityArtistsFromPlan.includes(artist)) {
                    priorityArtistsFromPlan.push(artist);
                  }
                });
              }
            }
            
            const distResult = await executeToolCall(
              {
                tool: 'adjust_distribution',
                params: {
                  total_target: targetTracks,
                  shuffle: true,
                  avoid_consecutive_same_artist: true,
                  max_per_artist: Math.ceil(targetTracks / 10), // Máximo ~10% del total por artista
                  priority_artists: priorityArtistsFromPlan.length > 0 ? priorityArtistsFromPlan : undefined,
                  priority_cap: priorityArtistsFromPlan.length > 0 ? Math.ceil(targetTracks / Math.max(2, priorityArtistsFromPlan.length)) : undefined,
                },
                reason: 'Ajustar variedad y distribución final por artista',
              },
              accessToken,
              { allTracksSoFar: allTracks, usedTrackIds, bannedArtists }
            );
            
            // Reemplazar allTracks con los tracks ajustados
            allTracks.length = 0;
            allTracks.push(...distResult.tracks);
            console.log('[AGENT-STREAM] Distribution adjusted. Final tracks:', allTracks.length);
          } catch (distError) {
            console.error('[AGENT-STREAM] Error adjusting distribution:', distError);
            // Continuar sin ajustar
          }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // FASE 5: Crear playlist en Spotify
        // ═══════════════════════════════════════════════════════════════
        
        sendThinking('Creando tu playlist en Spotify...');
        
        // Asegurar que no excedemos el target
        let finalTracks = allTracks.slice(0, targetTracks);

        console.log('[AGENT-STREAM] ===== FINAL TRACKS CHECK =====');
        console.log('[AGENT-STREAM] Final tracks after slice:', finalTracks.length, '/', targetTracks);
        
        if (allTracks.length > targetTracks) {
          console.log('[AGENT-STREAM] Trimmed from', allTracks.length, 'to', finalTracks.length);
        } else if (finalTracks.length < targetTracks) {
          console.log('[AGENT-STREAM] ⚠️ Only', finalTracks.length, 'tracks available (target:', targetTracks, ')');
        }
        console.log('[AGENT-STREAM] Banned artists: [', Array.from(bannedArtists).join(', '), ']');
        
        // VERIFICAR FINAL: ¿Hay algún track con artista banneado?
        const tracksWithBanned: any[] = [];
        for (const track of finalTracks) {
          const trackArtists = track.artists?.map((a: any) => a.name.toLowerCase()) || [];
          const hasBanned = trackArtists.some(artist => bannedArtists.has(artist));
          if (hasBanned) {
            const bannedFound = trackArtists.filter(artist => bannedArtists.has(artist));
            tracksWithBanned.push({
              name: track.name,
              artists: track.artists?.map((a: any) => a.name).join(', '),
              banned: bannedFound
            });
          }
        }
        
        if (tracksWithBanned.length > 0) {
          console.error('[AGENT-STREAM] ❌❌❌ ERROR: Found', tracksWithBanned.length, 'tracks with BANNED artists in final playlist!');
          tracksWithBanned.forEach(t => {
            console.error(`[AGENT-STREAM] ❌ "${t.name}" by [${t.artists}] - Contains banned: [${t.banned.join(', ')}]`);
          });
        } else {
          console.log('[AGENT-STREAM] ✅ No banned artists found in final tracks');
        }
        
        console.log('[AGENT-STREAM] First 5 final tracks:', finalTracks.slice(0, 5).map(t => ({
          name: t.name,
          artists: t.artists?.map((a: any) => a.name).join(', ')
        })));
        console.log('[AGENT-STREAM] ===== END FINAL CHECK =====');

        // Si tenemos más tracks de los pedidos, ya están cortados arriba
        if (allTracks.length > targetTracks) {
          console.log('[AGENT-STREAM] Trimmed from', allTracks.length, 'to', finalTracks.length);
        }

        if (finalTracks.length === 0) {
          console.error('[AGENT-STREAM] ERROR: No tracks found after all tools executed (even after fallback)');
          sendEvent('ERROR', { error: 'No se encontraron canciones después de ejecutar todas las herramientas' });
          controller.close();
          return;
        }

        // Generar nombre de playlist con IA
        // IMPORTANTE: Siempre generar desde el prompt actual, ignorar playlistName si no tiene sentido con el prompt
        let finalPlaylistName = playlistName;
        
        // Extraer palabras clave del prompt para validar
        const promptLowerForName = prompt.toLowerCase();
        const promptKeywords = promptLowerForName
          .split(/\s+/)
          .filter(word => word.length > 3) // Solo palabras de más de 3 caracteres
          .slice(0, 5); // Primeras 5 palabras clave
        
        // Detectar si el nombre proporcionado tiene sentido con el prompt actual
        // Verificar si alguna palabra clave del prompt aparece en el nombre
        const nameLower = playlistName.toLowerCase();
        const hasRelevantKeyword = promptKeywords.some(keyword => 
          nameLower.includes(keyword) || keyword.includes(nameLower.substring(0, keyword.length))
        );
        
        // Si no hay nombre proporcionado, o es el default, o no tiene palabras clave relevantes, generar uno nuevo
        const shouldGenerateNew = !userProvidedName || 
                                  playlistName === 'PLEIA Playlist' || 
                                  playlistName === prompt ||
                                  (!hasRelevantKeyword && userProvidedName);
        
        if (shouldGenerateNew) {
          try {
            console.log(`[AGENT-STREAM] Generating playlist name from prompt: "${prompt.substring(0, 100)}"`);
            if (userProvidedName && !hasRelevantKeyword) {
              console.log(`[AGENT-STREAM] ⚠️ Provided name "${playlistName}" doesn't match prompt keywords [${promptKeywords.join(', ')}], generating new one`);
            }
            finalPlaylistName = await generatePlaylistName(prompt);
            console.log(`[AGENT-STREAM] ✅ Generated playlist name: "${finalPlaylistName}"`);
          } catch (nameError) {
            console.error('[AGENT-STREAM] Error generating playlist name, using fallback:', nameError);
            finalPlaylistName = prompt.length > 40 ? prompt.substring(0, 37) + '...' : prompt;
          }
        } else {
          // Usuario proporcionó un nombre personalizado que tiene sentido, usarlo
          console.log(`[AGENT-STREAM] Using user-provided playlist name: "${finalPlaylistName}"`);
        }

        // Crear playlist
        let playlist = null;
        try {
          const trackUris = finalTracks
            .filter(t => t.uri)
            .map(t => t.uri as string);

          if (trackUris.length > 0) {
            playlist = await createPlaylist(accessToken, {
              name: finalPlaylistName,
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
        // FASE 5: Finalizar
        // ═══════════════════════════════════════════════════════════════

        console.log('[AGENT-STREAM] ✅ Sending DONE event with', finalTracks.length, 'tracks');
        console.log('[AGENT-STREAM] Playlist created:', playlist ? playlist.id : 'none');
        
        // DEBUG: Log first track structure to verify album.images is included
        if (finalTracks.length > 0) {
          const firstTrack = finalTracks[0];
          console.log('[AGENT-STREAM] First track structure:', {
            id: firstTrack.id,
            name: firstTrack.name,
            hasAlbum: !!firstTrack.album,
            albumImages: firstTrack.album?.images,
            imagesLength: firstTrack.album?.images?.length,
            firstImageUrl: firstTrack.album?.images?.[0]?.url
          });
        }
        
        // ⚠️ IMPORTANTE: Consumir uso SOLO si hay al menos 1 track
        if (finalTracks.length > 0) {
          await consumeUsageIfSuccess(savedPromptId, finalTracks.length);
        } else {
          console.log('[AGENT-STREAM] ⚠️ No tracks to return, usage will NOT be consumed');
        }

        // Lanzar análisis del agente en background (no bloquear el stream)
        (async () => {
          try {
            await logAgentAnalysis({
              userId: pleiaUser.id,
              playlistId: playlist?.id || null,
              prompt,
              tracks: finalTracks,
              plan,
              model: MODEL,
              origin: 'agent_stream_v1',
            });
          } catch (analysisError) {
            console.error('[AGENT-STREAM] Error logging agent analysis:', analysisError);
          }
        })();

        // ⚠️ IMPORTANTE: Consumir uso SOLO si hay al menos 1 track (ANTES de cerrar el controller)
        if (finalTracks.length > 0) {
          await consumeUsageIfSuccess(savedPromptId, finalTracks.length);
        } else {
          console.log('[AGENT-STREAM] ⚠️ No tracks to return, usage will NOT be consumed');
        }

        sendEvent('DONE', {
          tracks: finalTracks,
          totalTracks: finalTracks.length,
          target: targetTracks,
          playlist: playlist ? {
            id: playlist.id,
            name: finalPlaylistName, // Usar el nombre generado por IA
            url: playlist.external_urls?.spotify
          } : null,
          message: `¡Listo! He encontrado ${finalTracks.length} canciones para ti.`
        });

        console.log('[AGENT-STREAM] ✅ Stream completed successfully');
        controller.close();

      } catch (error: any) {
        console.error('[AGENT-STREAM] ❌ CRITICAL ERROR:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // ═══════════════════════════════════════════════════════════════
        // FALLBACK: Intentar generar playlist con sistema simple si el agente falla
        // ═══════════════════════════════════════════════════════════════
        console.log('[AGENT-STREAM] 🔄 Activating fallback playlist generation...');
        sendThinking('El agente encontró un problema. Usando sistema de respaldo para generar tu playlist...');
        
        try {
          // Obtener URL base para la llamada interna
          const url = new URL(request.url);
          const protocol = url.protocol;
          const host = url.host;
          const baseUrl = `${protocol}//${host}`;
          
          // Llamar al endpoint de generación simple como fallback
          const fallbackResponse = await fetch(`${baseUrl}/api/playlist/llm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: prompt,
              target_tracks: targetTracks,
            }),
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const fallbackTracks = fallbackData.tracks || [];
            
            if (fallbackTracks.length > 0) {
              console.log(`[AGENT-STREAM] ✅ Fallback successful: ${fallbackTracks.length} tracks generated`);
              
              // Enviar tracks del fallback
              sendEvent('FALLBACK_ACTIVATED', {
                message: 'Se usó el sistema de respaldo para generar tu playlist',
                originalError: error.message
              });
              
              // Enviar tracks en chunks para mantener consistencia con el formato del agente
              const chunkSize = 10;
              for (let i = 0; i < fallbackTracks.length; i += chunkSize) {
                const chunk = fallbackTracks.slice(i, i + chunkSize);
                sendEvent('TRACKS', {
                  tracks: chunk,
                  total: fallbackTracks.length,
                  progress: Math.min(100, Math.round(((i + chunk.length) / fallbackTracks.length) * 100))
                });
                await delay(100);
              }
              
              // Intentar crear playlist en Spotify
              let fallbackPlaylist = null;
              try {
                fallbackPlaylist = await createPlaylist(accessToken, {
                  name: playlistName,
                  description: `Generada por PLEIA: ${prompt.substring(0, 200)}`,
                  public: false
                });
                
                if (fallbackPlaylist?.id) {
                  await addTracksToPlaylist(accessToken, fallbackPlaylist.id, fallbackTracks.map(t => t.uri));
                  console.log('[AGENT-STREAM] ✅ Fallback playlist created in Spotify:', fallbackPlaylist.id);
                }
              } catch (playlistError) {
                console.error('[AGENT-STREAM] Error creating fallback playlist:', playlistError);
              }
              
              // Consumir uso si hay tracks (usar la función definida arriba)
              if (fallbackTracks.length > 0 && savedPromptId && pleiaUser?.email) {
                try {
                  await consumeUsage(pleiaUser.email, {
                    prompt_id: savedPromptId,
                    prompt: prompt.substring(0, 100),
                    source: 'agent_stream_fallback'
                  });
                  console.log('[AGENT-STREAM] ✅ Usage consumed for fallback tracks');
                } catch (usageError) {
                  console.error('[AGENT-STREAM] Error consuming usage for fallback:', usageError);
                }
              }
              
              // Trackear fallback a MTRYX
              try {
                const { trackUsage } = await import('@/lib/mtryxClient');
                await trackUsage({
                  email: pleiaUser.email,
                  userId: pleiaUser.id,
                  feature: 'agent_fallback_playlist_generation',
                  remainingFreeUses: null,
                  plan: null,
                  usageId: null,
                });
              } catch (mtryxError) {
                console.error('[AGENT-STREAM] ❌ Error tracking fallback to MTRYX:', mtryxError);
              }
              
              // Enviar evento DONE con los tracks del fallback
              sendEvent('DONE', {
                tracks: fallbackTracks,
                totalTracks: fallbackTracks.length,
                target: targetTracks,
                playlist: fallbackPlaylist ? {
                  id: fallbackPlaylist.id,
                  name: fallbackPlaylist.name,
                  url: fallbackPlaylist.external_urls?.spotify
                } : null,
                message: `¡Listo! Se generaron ${fallbackTracks.length} canciones usando el sistema de respaldo.`,
                fallback: true
              });
              
              console.log('[AGENT-STREAM] ✅ Fallback completed successfully');
              controller.close();
              return;
            }
          }
          
          // Si el fallback también falla, enviar error
          console.error('[AGENT-STREAM] ❌ Fallback also failed');
          sendEvent('ERROR', { 
            error: error.message || 'Error desconocido en el agente',
            details: error.stack?.split('\n').slice(0, 3).join(' | ') || 'No stack trace',
            fallbackFailed: true
          });
        } catch (fallbackError: any) {
          console.error('[AGENT-STREAM] ❌ Fallback generation failed:', fallbackError);
          sendEvent('ERROR', { 
            error: error.message || 'Error desconocido en el agente',
            details: error.stack?.split('\n').slice(0, 3).join(' | ') || 'No stack trace',
            fallbackFailed: true,
            fallbackError: fallbackError.message
          });
        }
        
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

