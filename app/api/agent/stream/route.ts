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
        
        // Patrón mejorado: "sin [canciones de] X" o "no [quiero] X" o "excluir X"
        const exclusionPatterns = [
          /sin\s+(?:canciones?\s+de\s+|música\s+de\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+?)(?:\.|,|$|y|o|con|de|del|la|el|los|las|para)/gi,
          /no\s+(?:quiero\s+|quieres\s+)?(?:canciones?\s+de\s+|música\s+de\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+?)(?:\.|,|$|y|o|con|de|del|la|el|los|las|para)/gi,
          /excluir\s+(?:a\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+?)(?:\.|,|$|y|o|con|de|del|la|el|los|las|para)/gi,
        ];
        
        for (const pattern of exclusionPatterns) {
          let match;
          while ((match = pattern.exec(prompt)) !== null) {
            const artistName = match[1].trim();
            // Filtrar palabras comunes que no son artistas
            const commonWords = ['canciones', 'música', 'playlist', 'lista', 'tracks', 'songs', 'artistas', 'rock', 'pop', 'rap', 'hip', 'hop'];
            if (artistName.length > 2 && !commonWords.includes(artistName.toLowerCase())) {
              bannedArtists.add(artistName.toLowerCase());
              console.log(`[AGENT-STREAM] ⚠️ Detected banned artist from prompt: "${artistName}"`);
            }
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
              console.log(`[AGENT-STREAM] ⚠️ Filtered out track "${track.name}" - contains banned artist`);
              return false;
            }
            return true;
          });
        };

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

          // Filtrar tracks excluidos ANTES de añadirlos
          const filteredTracks = filterBannedArtists(result.tracks);

          // Añadir tracks (excepto adjust_distribution que reordena)
          if (step.tool === 'adjust_distribution') {
            // Reemplazar con los tracks ajustados (ya filtrados)
            allTracks.length = 0;
            allTracks.push(...filteredTracks);
          } else {
            allTracks.push(...filteredTracks);
          }

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
        
        // Si faltan tracks, intentar rellenar con recomendaciones
        if (allTracks.length < targetTracks && allTracks.length > 0) {
          const missing = targetTracks - allTracks.length;
          console.log(`[AGENT-STREAM] Missing ${missing} tracks, attempting to fill with recommendations...`);
          sendThinking(`Encontré ${allTracks.length} canciones, buscando ${missing} más para completar...`);
          
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
                console.log(`[AGENT-STREAM] Found ${artistTracks.length} tracks for "${artistName}"`);
              } else {
                console.log(`[AGENT-STREAM] No tracks found for "${artistName}"`);
              }
            }
            
            console.log(`[AGENT-STREAM] Collected tracks from ${tracksByArtist.size} artists`);
            
            // Convertir el Map a array y mezclarlo para variar el orden de artistas
            const artistEntries = shuffle([...tracksByArtist.entries()]);
            
            // Ahora añadir tracks de forma equilibrada: 1 de cada artista, luego 2º de cada, etc.
            let round = 0;
            const maxRounds = 10; // Máximo 10 canciones por artista
            
            while (allTracks.length < targetTracks && round < maxRounds) {
              let addedThisRound = false;
              
              // Mezclar el orden de artistas en cada ronda para más variedad
              const shuffledEntries = shuffle(artistEntries);
              
              for (const [artistName, artistTracks] of shuffledEntries) {
                if (allTracks.length >= targetTracks) break;
                
                // Obtener el track de esta ronda para este artista
                if (round < artistTracks.length) {
                  const track = artistTracks[round];
                  if (usedTrackIds.has(track.id)) continue;
                  
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
                    console.log(`[AGENT-STREAM] ⚠️ Skipping track "${track.name}" - contains banned artist`);
                    continue;
                  }
                  
                  // Añadir el track si pasa todas las verificaciones
                  usedTrackIds.add(track.id);
                  allTracks.push(track);
                  addedThisRound = true;
                }
              }
              
              // Si no añadimos nada en esta ronda, no hay más tracks disponibles
              if (!addedThisRound) {
                console.log(`[AGENT-STREAM] No more tracks available at round ${round}`);
                break;
              }
              
              round++;
            }
            
            console.log(`[AGENT-STREAM] After balanced fill: ${allTracks.length} tracks (${round} rounds)`);
          } catch (fillError) {
            console.error('[AGENT-STREAM] Error filling tracks:', fillError);
            // Continuar sin rellenar
          }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // FASE 4: Crear playlist en Spotify
        // ═══════════════════════════════════════════════════════════════
        
        sendThinking('Creando tu playlist en Spotify...');
        
        // Asegurar que no excedemos el target
        const finalTracks = allTracks.slice(0, targetTracks);
        
        console.log('[AGENT-STREAM] Final tracks after slice:', finalTracks.length, '/', targetTracks);
        
        // Si tenemos más tracks de los pedidos, ya están cortados arriba
        if (allTracks.length > targetTracks) {
          console.log('[AGENT-STREAM] Trimmed from', allTracks.length, 'to', finalTracks.length);
        }
        
        if (finalTracks.length === 0) {
          console.error('[AGENT-STREAM] ERROR: No tracks found after all tools executed');
          sendEvent('ERROR', { error: 'No se encontraron canciones después de ejecutar todas las herramientas' });
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
        // FASE 5: Finalizar
        // ═══════════════════════════════════════════════════════════════

        console.log('[AGENT-STREAM] ✅ Sending DONE event with', finalTracks.length, 'tracks');
        console.log('[AGENT-STREAM] Playlist created:', playlist ? playlist.id : 'none');

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

        console.log('[AGENT-STREAM] ✅ Stream completed successfully');
        controller.close();

      } catch (error: any) {
        console.error('[AGENT-STREAM] ❌ CRITICAL ERROR:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        sendEvent('ERROR', { 
          error: error.message || 'Error desconocido en el agente',
          details: error.stack?.split('\n').slice(0, 3).join(' | ') || 'No stack trace'
        });
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

