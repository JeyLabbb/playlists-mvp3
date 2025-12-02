import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth/mock-session';
import { getHubAccessToken } from '@/lib/spotify/hubAuth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============== SPOTIFY API FUNCTIONS ==============

async function searchSpotify(query: string, type: string = 'track', limit: number = 20) {
  try {
    const accessToken = await getHubAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}&market=ES`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[PLEIA2-SEARCH] Error:', error);
      throw new Error(`Spotify API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[PLEIA2-SEARCH] Exception:', error);
    throw error;
  }
}

async function getAudioFeatures(trackIds: string[]) {
  try {
    const accessToken = await getHubAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[PLEIA2-AUDIO] Error:', response.status, response.statusText);
      // Return empty result instead of throwing - this feature is not critical
      return { audio_features: [] };
    }

    return response.json();
  } catch (error) {
    console.error('[PLEIA2-AUDIO] Exception:', error);
    // Return empty result instead of throwing
    return { audio_features: [] };
  }
}

async function getRecommendations(seedTracks: string[], targetFeatures: any = {}) {
  try {
    const accessToken = await getHubAccessToken();
    
    const params = new URLSearchParams({
      seed_tracks: seedTracks.slice(0, 5).join(','),
      limit: '20',
      market: 'ES',
      ...targetFeatures
    });
    
    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[PLEIA2-RECS] Error:', response.status, response.statusText);
      // Return empty result instead of throwing
      return { tracks: [] };
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      console.error('[PLEIA2-RECS] Empty response');
      return { tracks: [] };
    }

    const data = JSON.parse(text);
    console.log('[PLEIA2-RECS] Success:', data.tracks?.length || 0, 'recommendations');
    return data;
  } catch (error) {
    console.error('[PLEIA2-RECS] Exception:', error);
    // Return empty result instead of throwing
    return { tracks: [] };
  }
}

// ============== OPENAI TOOLS DEFINITION ==============

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_spotify',
      description: 'Busca canciones, artistas o álbumes en Spotify. Usa esto para encontrar música según el gusto del usuario.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'La búsqueda a realizar (ej: "rock alternativo", "Radiohead", "canciones tristes")'
          },
          type: {
            type: 'string',
            enum: ['track', 'artist', 'album'],
            description: 'Tipo de búsqueda'
          },
          limit: {
            type: 'number',
            description: 'Número de resultados (default 20, max 50)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_audio_features',
      description: 'Analiza características de audio (energía, bailabilidad, tristeza, etc.) de canciones específicas de Spotify.',
      parameters: {
        type: 'object',
        properties: {
          track_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs de Spotify de las canciones a analizar'
          }
        },
        required: ['track_ids']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recommendations',
      description: 'Obtiene recomendaciones de Spotify basadas en canciones semilla y características de audio objetivo.',
      parameters: {
        type: 'object',
        properties: {
          seed_track_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs de canciones base (máx 5)'
          },
          target_energy: {
            type: 'number',
            description: 'Energía objetivo (0.0-1.0)'
          },
          target_valence: {
            type: 'number',
            description: 'Positividad objetivo (0.0-1.0, bajo=triste, alto=alegre)'
          },
          target_danceability: {
            type: 'number',
            description: 'Bailabilidad objetivo (0.0-1.0)'
          },
          target_acousticness: {
            type: 'number',
            description: 'Acústica objetivo (0.0-1.0)'
          }
        },
        required: ['seed_track_ids']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_playlist',
      description: 'Crea la playlist final con las canciones seleccionadas. Solo llama esto cuando tengas una buena lista.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre creativo para la playlist'
          },
          track_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs de Spotify de las canciones finales'
          },
          description: {
            type: 'string',
            description: 'Descripción de la playlist'
          }
        },
        required: ['name', 'track_ids']
      }
    }
  }
];

// ============== SYSTEM PROMPT ==============

const systemPrompt = `Eres PLEIA 2.0, un agente musical avanzado que crea playlists perfectas usando Spotify.

OBLIGATORIO: SIEMPRE debes usar tus herramientas para completar cualquier solicitud.

PROCESO MANDATORIO PARA CADA SOLICITUD:
1. Escribe 1 frase breve de lo que harás (específica al pedido)
2. Llama search_spotify con ARTISTAS ESPECÍFICOS, no solo géneros genéricos
3. Llama analyze_audio_features con los IDs encontrados
4. Llama get_recommendations con los mejores seed tracks
5. Llama create_playlist con 15-25 canciones
6. INVITA al usuario a refinar la playlist si quiere cambios

BÚSQUEDAS ESPECÍFICAS:
- En lugar de buscar "lofi": busca "Jinsang", "Idealism", "Nujabes", "L'Indécis"
- En lugar de buscar "rock alternativo": busca "Radiohead", "Arctic Monkeys", "The Strokes"
- En lugar de buscar "electrónica": busca "Daft Punk", "Justice", "Disclosure"
- SIEMPRE menciona artistas reales y conocidos en tus búsquedas

CONTEXTO DE PLAYLIST EXISTENTE:
Si el usuario pide "añadir más canciones" o "añade X canciones":
- La playlist actual ya tiene canciones (verás cuántas en el contexto)
- create_playlist AUTOMÁTICAMENTE las mantendrá y añadirá las nuevas
- NO necesitas incluir los IDs antiguos, solo los nuevos
- Los tracks nuevos se SUMARÁN a los existentes

FORMATO PARA CADA PASO:
Escribe 1 línea contextual antes de llamar cada herramienta. Ejemplos:

"Buscando rock alternativo melancólico de Radiohead y bandas similares"
"Analizando la tristeza y energía de las 30 canciones encontradas"
"Generando más canciones con ese mood introspectivo"
"Añadiendo 10 canciones más a tu playlist actual"

RESPUESTA FINAL:
Después de crear la playlist, SIEMPRE termina invitando al usuario a modificarla. Ejemplos:
- "Si quieres quitar algún artista, cambiar el estilo o ajustar algo, solo dímelo."
- "¿Te gustaría hacer algún ajuste? Puedo quitar canciones, cambiar artistas o modificar el mood."
- "Dime si quieres refinar algo: quitar artistas, añadir más energía, etc."

IMPORTANTE:
- Menciona ARTISTAS ESPECÍFICOS en tus búsquedas, no solo géneros
- Sé natural y breve
- SIEMPRE usa las herramientas, no solo hables de usarlas
- AL FINAL, invita a seguir refinando
- NO respondas sin usar herramientas`;

// ============== TOOL EXECUTION ==============

async function executeToolCall(toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall) {
  // Type guard para asegurar que es un tool call de función
  if (!('function' in toolCall)) {
    throw new Error('Invalid tool call: missing function property');
  }
  const toolName = (toolCall as any).function.name;
  const toolArgs = (toolCall as any).function.arguments;
  const parsedArgs = JSON.parse(toolArgs);

  console.log('[TOOL] Executing:', toolName, parsedArgs);

  try {
    switch (toolName) {
      case 'search_spotify': {
        const result = await searchSpotify(
          parsedArgs.query,
          parsedArgs.type || 'track',
          parsedArgs.limit || 20
        );
        
        // Simplificar respuesta para OpenAI pero guardar datos completos para el frontend
        const tracks = result.tracks?.items || [];
        
        console.log('[SEARCH] Found ' + tracks.length + ' tracks for query: ' + parsedArgs.query);
        if (tracks.length > 0) {
          console.log('[SEARCH] First 3 tracks:', tracks.slice(0, 3).map((t: any) => t.name + ' - ' + t.artists[0].name).join(', '));
        }
        
        return JSON.stringify({
          found: tracks.length,
          tracks: tracks.slice(0, 20).map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists.map((a: any) => a.name).join(', '), // String para frontend
            artists: t.artists.map((a: any) => a.name), // Array para OpenAI
            uri: t.uri,
            albumCover: t.album?.images?.[0]?.url || '', // Añadir albumCover
            popularity: t.popularity
          }))
        });
      }

      case 'analyze_audio_features': {
        try {
          const features = await getAudioFeatures(parsedArgs.track_ids);
          return JSON.stringify({
            features: features.audio_features.filter((f: any) => f !== null).map((f: any) => ({
              id: f.id,
              energy: f.energy,
              valence: f.valence,
              danceability: f.danceability,
              acousticness: f.acousticness,
              tempo: f.tempo
            }))
          });
        } catch (error: any) {
          console.warn('[TOOL] Audio features failed, continuing anyway:', error.message);
          return JSON.stringify({
            note: 'No se pudieron analizar algunas características, pero continuando con la playlist',
            features: []
          });
        }
      }

      case 'get_recommendations': {
        const targetFeatures: any = {};
        if (parsedArgs.target_energy !== undefined) targetFeatures.target_energy = parsedArgs.target_energy;
        if (parsedArgs.target_valence !== undefined) targetFeatures.target_valence = parsedArgs.target_valence;
        if (parsedArgs.target_danceability !== undefined) targetFeatures.target_danceability = parsedArgs.target_danceability;
        if (parsedArgs.target_acousticness !== undefined) targetFeatures.target_acousticness = parsedArgs.target_acousticness;

        const recs = await getRecommendations(parsedArgs.seed_track_ids, targetFeatures);
        
        if (!recs.tracks || recs.tracks.length === 0) {
          return JSON.stringify({
            found: 0,
            tracks: [],
            note: 'No se generaron recomendaciones. Usa las canciones de búsqueda para crear la playlist.'
          });
        }
        
        return JSON.stringify({
          found: recs.tracks.length,
          tracks: recs.tracks.map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists.map((a: any) => a.name).join(', '), // String para frontend
            artists: t.artists.map((a: any) => a.name), // Array para OpenAI
            uri: t.uri,
            albumCover: t.album?.images?.[0]?.url || '' // Añadir albumCover
          }))
        });
      }

      case 'create_playlist': {
        // No creamos aquí realmente, solo guardamos info
        return JSON.stringify({
          success: true,
          message: 'Playlist preparada',
          name: parsedArgs.name,
          track_count: parsedArgs.track_ids.length
        });
      }

      default:
        return JSON.stringify({ error: 'Unknown tool' });
    }
  } catch (error: any) {
    console.error('[TOOL ERROR]', toolName, error);
    return JSON.stringify({ 
      error: true, 
      message: error.message || 'Error ejecutando herramienta' 
    });
  }
}

// ============== MAIN ENDPOINT ==============

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationId, currentPlaylist, messages: prevMessages = [] } = await request.json();

    console.log('[PLEIA2] New message:', message);
    console.log('[PLEIA2] Session user:', session.user.email);

    // Construir contexto si hay playlist actual
    let contextInfo = '';
    if (currentPlaylist) {
      const topArtists = [...new Set(currentPlaylist.tracks.map((t: any) => t.artists?.[0]?.name || 'Unknown'))].slice(0, 5).join(', ');
      contextInfo = '\n\nPLAYLIST ACTUAL EN MEMORIA:\n' +
        'Nombre: "' + currentPlaylist.name + '"\n' +
        currentPlaylist.tracks.length + ' canciones\n' +
        'Artistas: ' + topArtists;
    }

    // Construir historial de conversación para OpenAI
    const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt + contextInfo },
      ...prevMessages.slice(-4).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    // Crear un stream de respuesta
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendMessage = (type: string, content: any) => {
          const data = 'data: ' + JSON.stringify({ type, content }) + '\n\n';
          controller.enqueue(encoder.encode(data));
        };

        try {
          let finalPlaylist = currentPlaylist;
          let allTracksData: any[] = currentPlaylist?.tracks || [];
          const agentThoughts: string[] = [];

          // Bucle de agente con herramientas (máximo 5 iteraciones)
          let iteration = 0;
          const MAX_ITERATIONS = 5;
          let currentMessages = [...conversationHistory];

          while (iteration < MAX_ITERATIONS) {
            iteration++;
            console.log('[PLEIA2] Iteration', iteration);

            const completion = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: currentMessages,
              tools: tools,
              tool_choice: iteration === 1 ? 'required' : 'auto', // Forzar herramientas en primera iteración
              parallel_tool_calls: false, // Forzar una herramienta a la vez para mejor control
              temperature: 0.7,
              max_tokens: 1000,
            });
            
            console.log('[PLEIA2] Completion finish_reason:', completion.choices[0].finish_reason);
            console.log('[PLEIA2] Has tool_calls:', !!completion.choices[0].message.tool_calls);
            console.log('[PLEIA2] Has content:', !!completion.choices[0].message.content);

            const assistantMessage = completion.choices[0].message;

            // Si el asistente llama herramientas
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
              // Capturar el pensamiento del agente (texto antes de tool calls)
              const agentThought = assistantMessage.content?.trim() || '';
              
              // Agregar mensaje del asistente al historial
              currentMessages.push(assistantMessage);

              // Ejecutar todas las herramientas llamadas
              for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);
                console.log('[PLEIA2] Tool call:', toolName, toolArgs);
                
                // Generar mensaje descriptivo basado en los argumentos reales
                let toolMessage = agentThought;
                if (!toolMessage || toolMessage.length < 10) {
                  // Generar mensaje contextual basado en los argumentos
                  switch (toolName) {
                    case 'search_spotify':
                      toolMessage = 'Buscando ' + (toolArgs.query || 'música');
                      break;
                    case 'analyze_audio_features':
                      const trackCount = toolArgs.track_ids?.length || 0;
                      toolMessage = 'Analizando características de ' + trackCount + ' canciones';
                      break;
                    case 'get_recommendations':
                      const features = [];
                      if (toolArgs.target_energy) features.push('energía');
                      if (toolArgs.target_valence) features.push('mood');
                      if (toolArgs.target_danceability) features.push('bailable');
                      const featuresText = features.length > 0 ? ' con ' + features.join(', ') : '';
                      toolMessage = 'Generando recomendaciones' + featuresText;
                      break;
                    case 'create_playlist':
                      toolMessage = 'Creando "' + (toolArgs.name || 'playlist') + '" con ' + (toolArgs.track_ids?.length || 0) + ' canciones';
                      break;
                    default:
                      toolMessage = 'Procesando';
                  }
                }
                
                sendMessage('tool_call', {
                  name: toolName,
                  message: toolMessage,
                  args: toolArgs,
                  status: 'loading'
                });
                
                const toolResult = await executeToolCall(toolCall);
                const resultData = JSON.parse(toolResult);
                
                console.log('[TOOL-RESULT]', toolName, '- Found:', resultData.found || 0, 'Tracks in result:', resultData.tracks?.length || 0);
                
                // Enviar resultado completado de la herramienta
                let summary = 'Completado';
                if (toolName === 'search_spotify') {
                  summary = (resultData.found || 0) + ' tracks encontrados';
                } else if (toolName === 'analyze_audio_features') {
                  summary = 'Análisis completado';
                } else if (toolName === 'get_recommendations') {
                  summary = (resultData.found || 0) + ' recomendaciones generadas';
                }
                
                sendMessage('tool_output', {
                  name: toolName,
                  result: resultData,
                  summary: summary,
                  status: 'completed'
                });
                
                // Agregar resultado al historial
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: toolResult
                });

                // Si es search_spotify o get_recommendations, guardar tracks
                if (toolName === 'search_spotify' || toolName === 'get_recommendations') {
                  if (resultData.tracks && resultData.tracks.length > 0) {
                    const newTracks = resultData.tracks.filter((nt: any) => 
                      !allTracksData.some((et: any) => et.id === nt.id)
                    );
                    console.log('[ACCUMULATE]', toolName, '- Adding', newTracks.length, 'new tracks. Total now:', allTracksData.length + newTracks.length);
                    allTracksData = [...allTracksData, ...newTracks];
                  }
                }

                // Si es create_playlist, guardar los datos
                if (toolName === 'create_playlist') {
                  if (resultData.success) {
                    const trackIds = toolArgs.track_ids;
                    const newTracksData = allTracksData.filter((t: any) => trackIds.includes(t.id));
                    
                    // Si hay playlist existente, MANTENER tracks antiguos y añadir nuevos
                    let combinedTracks = [];
                    if (currentPlaylist && currentPlaylist.tracks && currentPlaylist.tracks.length > 0) {
                      console.log('[CREATE-PLAYLIST] Hay playlist existente con', currentPlaylist.tracks.length, 'canciones. Manteniendo y añadiendo', newTracksData.length, 'nuevas.');
                      // Mantener tracks antiguos y añadir solo los nuevos que no estén duplicados
                      const existingIds = new Set(currentPlaylist.tracks.map((t: any) => t.id));
                      const uniqueNewTracks = newTracksData.filter((t: any) => !existingIds.has(t.id));
                      combinedTracks = [...currentPlaylist.tracks, ...uniqueNewTracks];
                    } else {
                      console.log('[CREATE-PLAYLIST] Nueva playlist con', newTracksData.length, 'canciones.');
                      combinedTracks = newTracksData;
                    }
                    
                    console.log('[CREATE-PLAYLIST] Total tracks en playlist final:', combinedTracks.length);
                    console.log('[CREATE-PLAYLIST] First 3 tracks:', combinedTracks.slice(0, 3).map((t: any) => t.name + ' - ' + t.artist));
                    
                    finalPlaylist = {
                      name: toolArgs.name || currentPlaylist?.name || 'Nueva Playlist',
                      description: toolArgs.description || message,
                      tracks: combinedTracks
                    };
                  }
                }
              }

              // Continuar el bucle para que OpenAI procese los resultados
              continue;
            } 
            
            // Si el asistente responde con texto final (sin tool calls)
            if (assistantMessage.content) {
              agentThoughts.push(assistantMessage.content);
              console.log('[PLEIA2] Final response:', assistantMessage.content);
              sendMessage('final_response', assistantMessage.content);
              break; // Terminar el bucle
            }
            
            // Si no hay contenido ni tool calls, algo salió mal
            break;
          }

          // Enviar playlist final si existe
          if (finalPlaylist && finalPlaylist !== currentPlaylist) {
            sendMessage('playlist_update', finalPlaylist);
          }

          // Guardar en Supabase (sin bloquear) - En desarrollo, usamos email como user_id
          let convId = conversationId;
          if (!convId) {
            const userId = session.user.email || 'anonymous';
            const { data: conv } = await supabase
              .from('conversations')
              .insert({ user_id: userId, initial_prompt: message })
              .select()
              .single();
            convId = conv?.id;
          }

          if (convId) {
            await supabase.from('messages').insert({
              conversation_id: convId,
              role: 'user',
              content: message,
            });

            for (const thought of agentThoughts) {
              await supabase.from('messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: thought,
              });
            }
          }

          // Enviar mensaje de finalización
          sendMessage('done', { conversationId: convId });
          controller.close();

        } catch (error: any) {
          console.error('[PLEIA2] Stream error:', error);
          sendMessage('error', { message: error.message || 'Error interno' });
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[PLEIA2] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

