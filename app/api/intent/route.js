import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getContextsForPrompt } from '../../../lib/music/contexts';

const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🚨 CRITICAL: Validate OpenAI API key on module load
if (!process.env.OPENAI_API_KEY) {
  console.error('[INTENT] ⚠️ OPENAI_API_KEY is not set! Intent generation will fail.');
} else {
  console.log('[INTENT] ✅ OPENAI_API_KEY is set (length:', process.env.OPENAI_API_KEY.length, ')');
}

export async function POST(request) {
  const startTime = Date.now();
  console.log(`[INTENT] ===== STARTING INTENT GENERATION =====`);
  console.log(`[INTENT] Timestamp: ${new Date().toISOString()}`);
  console.log(`[INTENT] Request method: ${request.method}`);
  console.log(`[INTENT] Request URL: ${request.url}`);
  console.log(`[INTENT] OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`[INTENT] OPENAI_API_KEY length: ${process.env.OPENAI_API_KEY?.length || 0}`);
  
  // 🚨 CRITICAL: Check OpenAI API key before processing
  if (!process.env.OPENAI_API_KEY) {
    console.error('[INTENT] ❌ OPENAI_API_KEY is missing!');
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }
  
  try {
    console.log(`[INTENT] Parsing request body...`);
    const requestBody = await request.json();
    console.log(`[INTENT] Request body parsed successfully:`, {
      hasPrompt: !!requestBody.prompt,
      hasTargetTracks: !!requestBody.target_tracks,
      promptLength: requestBody.prompt?.length || 0,
      targetTracksValue: requestBody.target_tracks
    });
    
    const { prompt, target_tracks } = requestBody;
    
    if (!prompt) {
      console.log(`[INTENT] ERROR: No prompt provided`);
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log(`[INTENT] ===== PROCESSING REQUEST =====`);
    console.log(`[INTENT] Processing prompt: "${prompt}"`);
    console.log(`[INTENT] Target tracks: ${target_tracks}`);
    console.log(`[INTENT] Prompt type: ${typeof prompt}`);
    console.log(`[INTENT] Target tracks type: ${typeof target_tracks}`);
    
    // Mobile detection for debugging
    console.log(`[INTENT] Detecting mobile device...`);
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);
    console.log(`[INTENT] Mobile detection result: ${isMobile}`);
    console.log(`[INTENT] User-Agent: ${userAgent.substring(0, 100)}...`);
    console.log(`[INTENT] User-Agent length: ${userAgent.length}`);

    console.log(`[INTENT] Calculating target size...`);
    const targetSize = Math.max(1, Math.min(500, Number(target_tracks) || 50));
    console.log(`[INTENT] Target size calculation: max(1, min(500, ${Number(target_tracks) || 50})) = ${targetSize}`);
    console.log(`[INTENT] Target size calculated: ${targetSize}`);
    
    // LLM will detect mode and decide everything based on prompt analysis

    // Get contexts brújula for the prompt
    console.log(`[INTENT] ===== CONTEXT DETECTION =====`);
    console.log(`[INTENT] Getting contexts for prompt...`);
    console.log(`[INTENT] Calling getContextsForPrompt with: "${prompt}"`);
    
    let contexts;
    try {
      contexts = getContextsForPrompt(prompt);
      console.log(`[INTENT] getContextsForPrompt completed successfully`);
    } catch (contextError) {
      console.log(`[INTENT] ERROR in getContextsForPrompt:`, contextError.message);
      contexts = null;
    }
    
    if (contexts) {
      console.log(`[CONTEXT] Context found!`);
      console.log(`[CONTEXT] compass_used=true name=${contexts.key} keep_outside=${contexts.key !== 'underground_es'}`);
      console.log(`[CONTEXT] Context details:`, {
        key: contexts.key,
        compassLength: contexts.compass?.length || 0,
        compassSample: contexts.compass?.slice(0, 5) || [],
        compassType: typeof contexts.compass,
        hasCompass: !!contexts.compass
      });
      console.log(`[CONTEXT] Full compass array:`, contexts.compass);
    } else {
      console.log(`[CONTEXT] No contexts found for prompt`);
      console.log(`[CONTEXT] contexts value:`, contexts);
    }

    // Detect mode and canonize for VIRAL/FESTIVAL
    console.log(`[INTENT] ===== MODE DETECTION =====`);
    console.log(`[INTENT] Detecting mode for prompt...`);
    console.log(`[INTENT] Calling detectMode with: "${prompt}"`);
    
    let mode;
    try {
      mode = detectMode(prompt);
      console.log(`[INTENT] detectMode completed successfully`);
    } catch (modeError) {
      console.log(`[INTENT] ERROR in detectMode:`, modeError.message);
      mode = 'NORMAL'; // fallback
    }
    
    console.log(`[INTENT] Detected mode: ${mode}`);
    console.log(`[INTENT] Mode type: ${typeof mode}`);
    
    let canonizedData = null;
    
    // Detect if prompt is a single artist name
    console.log(`[INTENT] ===== SINGLE ARTIST DETECTION =====`);
    console.log(`[INTENT] Checking if single artist...`);
    console.log(`[INTENT] Calling detectSingleArtist with: "${prompt}"`);
    
    let isSingleArtist;
    try {
      isSingleArtist = detectSingleArtist(prompt);
      console.log(`[INTENT] detectSingleArtist completed successfully`);
    } catch (singleArtistError) {
      console.log(`[INTENT] ERROR in detectSingleArtist:`, singleArtistError.message);
      isSingleArtist = false;
    }
    
    if (isSingleArtist) {
      console.log(`[INTENT] SINGLE ARTIST detected: "${prompt}" - delegating to Spotify`);
    } else {
      console.log(`[INTENT] Not a single artist prompt`);
    }
    console.log(`[INTENT] isSingleArtist result: ${isSingleArtist}`);
    
    if (mode === 'VIRAL' || mode === 'FESTIVAL') {
      console.log(`[INTENT] ===== CANONIZATION =====`);
      console.log(`[INTENT] Canonizing prompt for ${mode} mode...`);
      console.log(`[INTENT] Calling canonizePrompt with: "${prompt}"`);
      
      try {
        canonizedData = await canonizePrompt(prompt);
        console.log(`[INTENT] canonizePrompt completed successfully`);
        console.log(`[INTENT] Mode: ${mode}, Canonized:`, canonizedData);
      } catch (canonizeError) {
        console.log(`[INTENT] ERROR in canonizePrompt:`, canonizeError.message);
        canonizedData = null;
      }
    } else {
      console.log(`[INTENT] No canonization needed for ${mode} mode`);
    }

    // Retry logic for OpenAI
    console.log(`[INTENT] ===== OPENAI RETRY LOGIC =====`);
    const maxAttempts = 3;
    let attempts = 0;
    console.log(`[INTENT] Starting OpenAI retry logic, max attempts: ${maxAttempts}`);
    console.log(`[INTENT] Model to use: ${MODEL}`);
    console.log(`[INTENT] OpenAI API Key present: ${!!process.env.OPENAI_API_KEY}`);
    console.log(`[INTENT] OpenAI API Key length: ${process.env.OPENAI_API_KEY?.length || 0}`);

    while (attempts < maxAttempts) {
      let completion;
      let modelUsed = MODEL;
      attempts++;
      
      console.log(`[INTENT] ===== OPENAI ATTEMPT ${attempts}/${maxAttempts} =====`);
      console.log(`[INTENT] Attempt number: ${attempts}`);
      console.log(`[INTENT] Max attempts: ${maxAttempts}`);
      console.log(`[INTENT] Attempting with model:`, MODEL);
      console.log(`[INTENT] Model type: ${typeof MODEL}`);
      
      try {
        // Build comprehensive user message - LLM decides everything
        console.log(`[INTENT] ===== BUILDING USER MESSAGE =====`);
        console.log(`[INTENT] Building user message...`);
        console.log(`[INTENT] Base prompt: "${prompt}"`);
        console.log(`[INTENT] Target size: ${targetSize}`);
        
        let userMessage = `Prompt: "${prompt}"\nTamaño solicitado: ${targetSize} tracks\n\n`;
        console.log(`[INTENT] Base message created, length: ${userMessage.length}`);
        
        // Add context information if available
        if (contexts) {
          console.log(`[INTENT] Adding context information to message...`);
          console.log(`[INTENT] Context compass length: ${contexts.compass?.length || 0}`);
          console.log(`[INTENT] Context compass type: ${typeof contexts.compass}`);
          console.log(`[INTENT] Context compass is array: ${Array.isArray(contexts.compass)}`);
          
          if (Array.isArray(contexts.compass)) {
            userMessage += `CONTEXTOS BRÚJULA DISPONIBLES:\n${contexts.compass.join(', ')}\n\n`;
            console.log(`[INTENT] Context information added to message`);
          } else {
            console.log(`[INTENT] WARNING: Context compass is not an array, skipping context addition`);
          }
        } else {
          console.log(`[INTENT] No contexts available, skipping context addition`);
        }
        
        const tracksToGenerate = Math.ceil(targetSize * 1.4);
        console.log(`[INTENT] Tracks to generate: ${tracksToGenerate} (${targetSize} * 1.4)`);
        
        userMessage += `Analiza este prompt y determina el modo correcto. Genera ${tracksToGenerate} canciones que encajen perfectamente con la petición. Usa solo canciones reales con título y artista específicos. Respeta TODAS las restricciones mencionadas (ej. instrumental, género, etc.).\n\nNUNCA uses comillas curvas; usa comillas dobles normales; no pongas comas finales.`;
        
        console.log(`[INTENT] User message completed`);
        console.log(`[INTENT] User message length: ${userMessage.length} chars`);
        console.log(`[INTENT] User message preview:`, userMessage.substring(0, 200) + '...');
        console.log(`[INTENT] User message last 200 chars:`, '...' + userMessage.substring(userMessage.length - 200));

        console.log(`[INTENT] Calling OpenAI API...`);
        completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: `Eres la IA que interpreta prompts musicales y decide el modo de generación. Devuelves SOLO una llamada a emit_intent con JSON válido (nada de texto libre). Reglas:

MODOS
- NORMAL: Tú (LLM) generas ~70% de los temas (reales), y Spotify rellenará ~30% con radios de tus temas (prioriza recientes). Usa contextos brújula solo como sesgo, no como lista cerrada. Respeta exclusiones y cap por artista (3 por defecto; si el prompt muestra preferencia por un artista/género, sube cap a 5–10).
- VIRAL: Delegas TODO a Spotify. Caso "tiktok/viral/charts/… + año/mes": construye queries que SIEMPRE combinen nombre+añ o/edición (no separar). NO generes tracks.
- FESTIVAL: Delegas TODO a Spotify. SIEMPRE combina {nombreFestival}+{año/edición} en las queries; variantes que mantengan unidos nombre+año. NO generes tracks.
- ARTIST_STYLE ("como X", "estilo de X"): Delegas TODO a Spotify con "radio + artista exacto". NO generes tracks (tracks=[]).
- SINGLE_ARTIST (prompt es SOLO un artista): Delegas TODO a Spotify para traer catálogo y colaboraciones de ese artista. NO generes tracks (tracks=[]).
- UNDERGROUND_STRICT (si prompt incluye "underground" en España): Usa ÚNICAMENTE los artistas del whitelist 'underground_es' (match exacto tolerante a tildes/case). Máx 3 temas por artista. Subconjunto aleatorio de artistas del whitelist. Si un artista no aparece, se omite (no sustituyas por similares). Delegas la búsqueda a Spotify con la lista filtrada.

🚨 CRÍTICO: INTERPRETACIÓN DE PROMPTS POCO ESPECÍFICOS
Cuando el prompt es vago o contiene información irrelevante, debes distinguir qué es OBLIGATORIO vs qué es IRRELEVANTE:

INFORMACIÓN OBLIGATORIA (siempre respetar):
- Años/rangos de años: "años 70-2025", "de los 80", "del 2000" → OBLIGATORIO filtrar por año
- Actividades/contextos musicales: "para bailar", "para estudiar", "para correr", "para dedicar" → OBLIGATORIO buscar canciones que encajen con esa actividad/contexto
- Géneros explícitos: "reggaeton", "rock", "pop" → OBLIGATORIO respetar
- Exclusiones: "sin X", "sin canciones de Y" → OBLIGATORIO excluir

INFORMACIÓN IRRELEVANTE (ignorar completamente):
- Profesión: "es médico", "es profesor", "trabaja en..." → IRRELEVANTE para selección musical
- Edad (a menos que se mencione música de esa época): "tiene 55 años", "es joven" → IRRELEVANTE a menos que se pida música de esa época
- Características físicas del destinatario (a menos que se pida dedicar): "es guapa", "es rubia", "es bajita" → Solo relevante si se pide "dedicar" o "regalar"
- Ubicación geográfica (a menos que se pida música de ese lugar): "vive en Madrid", "es de Barcelona" → IRRELEVANTE

PROMPTS DE DEDICACIÓN/REGALO:
Si el prompt menciona "dedicar", "regalar", "para mi novia/novio/amigo", etc.:
- Busca canciones con LYRICS que mencionen características del destinatario (guapa, rubia, bajita, etc.)
- Busca TÍTULOS de canciones que resuman esas características
- MEZCLA diferentes estrategias: algunas por lyrics, otras por título, otras por temática general
- NO uses solo una estrategia (no todas por título, no todas por lyrics)
- Ten libertad creativa: piensa en diferentes formas de interpretar el prompt

EJEMPLOS:
- "canciones para bailar para una madre de 55 años que le gustan canciones nuevas pero también viejas, es médico, y quiere canciones de entre los años 70 y 2025"
  → OBLIGATORIO: "para bailar" (danceability alta), "años 70-2025" (filtrar por año)
  → IRRELEVANTE: "es médico", "55 años" (a menos que se pida música de los 70 específicamente)
  → Estrategia: Mezclar canciones bailables de diferentes épocas (70s, 80s, 90s, 2000s, 2010s, 2020s)

- "canciones para dedicarle a mi novia es muy guapa rubia bajita"
  → OBLIGATORIO: "dedicar" (buscar canciones románticas/dedicadas)
  → RELEVANTE: "guapa rubia bajita" (buscar en lyrics y títulos)
  → Estrategia: MEZCLAR canciones con lyrics que mencionen "guapa", "rubia", "bajita", títulos relevantes, y canciones románticas generales

REGLAS TRANSVERSALES
- Exclusiones: "sin X" → añade X a exclusions.banned_artists; jamás devuelvas ese artista.
- Nunca devuelvas "Track 1/2…". Siempre temas reales.
- Cap por artista por defecto 3; si el prompt prefiere un artista/género, cap 5–10.
- Devuelve arrays coherentes: si proporcionas 'tracks', cada item tiene {title, artist}. Si el modo delega (VIRAL/FESTIVAL/ARTIST_STYLE/SINGLE_ARTIST/UNDERGROUND_STRICT), entonces 'tracks' puede ser [] y debes pasar los campos guía (priority_artists, filtered_artists, queries).
- Campos guía para Spotify:
  - VIRAL/FESTIVAL: 'search_queries' con variantes que SIEMPRE unan nombre+añ o/edición (p.ej. "riverland 2025", "2025 riverland" pero nunca "riverland" solo).
  - ARTIST_STYLE: 'priority_artists: ["Nombre Exacto"]'.
  - SINGLE_ARTIST: 'restricted_artists: ["Nombre Exacto"]'.
  - UNDERGROUND_STRICT: 'filtered_artists: ["Artista1 exacto", ...]' (subconjunto aleatorio del whitelist).

VALIDACIONES FINALES OBLIGATORIAS
- Si ARTIST_STYLE o SINGLE_ARTIST → 'tracks' debe ser '[]'.
- Ningún artista en 'exclusions.banned_artists' puede aparecer en 'tracks'.
- Si UNDERGROUND_STRICT → todos los artistas en 'tracks' deben pertenecer al whitelist.

Devuelve SOLO:
emit_intent({
  "mode": "...",
  "llmShare": 0.7 | 0 | 1,
  "tracks": [...],
  "artists": [...],
  "priority_artists": [...],
  "filtered_artists": [...],
  "restricted_artists": [...],
  "search_queries": [...],
  "exclusions": { "banned_artists": [...], "banned_terms": [...] }
})` },
            { role: "user", content: userMessage }
          ],
          tools: [{
            type: "function",
            function: {
              name: "emit_intent",
              description: "Intent de playlist",
              parameters: {
                type: "object",
                properties: {
                  mode: { type: "string", enum: ["NORMAL","VIRAL","FESTIVAL","ARTIST_STYLE"] },
                  llmShare: { type: "number", minimum: 0, maximum: 1 },
                  tracks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        artist: { type: "string" }
                      },
                      required: ["title","artist"]
                    },
                    description: "Lista de tracks SIN artistas prohibidos en exclusions.banned_artists"
                  },
                  artists: {
                    type: "array",
                    items: { type: "string" }
                  },
                  search_queries: {
                    type: "array",
                    items: { type: "string" },
                    description: "Queries guía para VIRAL/FESTIVAL manteniendo nombre+año unidos"
                  },
                  filtered_artists: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista filtrada de artistas para modo UNDERGROUND_STRICT"
                  },
                  priority_artists: {
                    type: "array",
                    items: { type: "string" },
                    description: "Artistas con prioridad especial (más canciones) para modo INCLUSIVE"
                  },
                  restricted_artists: {
                    type: "array",
                    items: { type: "string" },
                    description: "Artistas específicos mencionados para modo RESTRICTIVE (para que Spotify sepa las restricciones)"
                  },
                  exclusions: {
                    type: "object",
                    properties: {
                      banned_artists: { type: "array", items: { type: "string" } },
                      banned_terms: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                required: ["mode", "tracks", "artists"]
              }
            }
          }],
          temperature: 0.3,
          max_tokens: 2000
        });

        console.log(`[INTENT] ===== OPENAI API RESPONSE =====`);
        console.log(`[INTENT] OpenAI API call completed successfully`);
        console.log(`[INTENT] Response received, processing...`);
        console.log(`[INTENT] Completion object type: ${typeof completion}`);
        console.log(`[INTENT] Completion has choices: ${!!completion.choices}`);
        console.log(`[INTENT] Choices length: ${completion.choices?.length || 0}`);
        
        let result = completion.choices[0]?.message;
        console.log(`[INTENT] Result from OpenAI:`, {
          hasMessage: !!result,
          hasToolCalls: !!(result?.tool_calls),
          toolCallsLength: result?.tool_calls?.length || 0,
          messageType: typeof result,
          messageKeys: result ? Object.keys(result) : []
        });
        
        console.log(`[INTENT] Full completion object:`, {
          id: completion.id,
          object: completion.object,
          created: completion.created,
          model: completion.model,
          choicesLength: completion.choices?.length || 0,
          usage: completion.usage
        });
        
        if (!result || !result.tool_calls || result.tool_calls.length === 0) {
          console.log(`[INTENT] No tool calls found, trying fallback parser...`);
          console.log(`[INTENT] Result:`, result);
          console.log(`[INTENT] Message content:`, result?.content);
          
          // FALLBACK: Try to parse emit_intent({...}) from message content
          if (result?.content && typeof result.content === 'string') {
            const match = result.content.match(/emit_intent\s*\((\{[\s\S]*?\})\)/);
            if (match && match[1]) {
              console.log(`[INTENT] Fallback: Found emit_intent in content, parsing...`);
              try {
                const parsedIntent = JSON.parse(match[1]);
                console.log(`[INTENT] Fallback: Successfully parsed intent from content`);
                // Create a fake tool call structure
                result = {
                  ...result,
                  tool_calls: [{
                    function: {
                      name: 'emit_intent',
                      arguments: match[1]
                    }
                  }]
                };
              } catch (parseError) {
                console.log(`[INTENT] Fallback: Failed to parse JSON from content:`, parseError.message);
                throw new Error("No tool calls in OpenAI response and fallback parsing failed");
              }
            } else {
              console.log(`[INTENT] Fallback: No emit_intent pattern found in content`);
              throw new Error("No tool calls in OpenAI response");
            }
          } else {
            console.log(`[INTENT] Fallback: No content to parse`);
            throw new Error("No tool calls in OpenAI response");
          }
        }

        console.log(`[INTENT] ===== TOOL CALL VALIDATION =====`);
        console.log(`[INTENT] Tool calls found: ${result.tool_calls.length}`);
        console.log(`[INTENT] First tool call:`, result.tool_calls[0]);
        
        const toolCall = result.tool_calls[0];
        console.log(`[INTENT] Tool call type: ${typeof toolCall}`);
        console.log(`[INTENT] Tool call function:`, toolCall?.function);
        console.log(`[INTENT] Tool call function name: ${toolCall?.function?.name}`);
        
        if (!toolCall || toolCall.function.name !== 'emit_intent') {
          console.log(`[INTENT] ERROR: No valid tool call in OpenAI response`);
          console.log(`[INTENT] Expected function name: emit_intent`);
          console.log(`[INTENT] Actual function name: ${toolCall?.function?.name}`);
          throw new Error("No valid tool call in OpenAI response");
        }
        
        console.log(`[INTENT] Tool call validation passed`);

        // Parse tool call arguments directly (guaranteed valid JSON)
        console.log(`[INTENT] ===== PARSING TOOL CALL ARGUMENTS =====`);
        console.log(`[INTENT] Parsing tool call arguments...`);
        console.log(`[INTENT] Tool call function arguments:`, toolCall.function.arguments);
        console.log(`[INTENT] Arguments type: ${typeof toolCall.function.arguments}`);
        console.log(`[INTENT] Arguments length: ${toolCall.function.arguments?.length || 0}`);
        
        let intent;
        try {
          intent = JSON.parse(toolCall.function.arguments);
          console.log(`[INTENT] JSON parsing completed successfully`);
        } catch (parseError) {
          console.log(`[INTENT] ERROR parsing JSON:`, parseError.message);
          console.log(`[INTENT] Raw arguments that failed to parse:`, toolCall.function.arguments);
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
        
        console.log(`[INTENT] parsed_ok=true (tool_call)`);
        console.log(`[INTENT] Intent type: ${typeof intent}`);
        console.log(`[INTENT] Intent keys:`, Object.keys(intent));
        console.log(`[INTENT] Raw intent from LLM:`, {
          mode: intent.mode,
          modeType: typeof intent.mode,
          tracksCount: intent.tracks?.length || 0,
          tracksType: typeof intent.tracks,
          tracksIsArray: Array.isArray(intent.tracks),
          artistsCount: intent.artists?.length || 0,
          artistsType: typeof intent.artists,
          artistsIsArray: Array.isArray(intent.artists),
          filteredArtistsCount: intent.filtered_artists?.length || 0,
          filteredArtistsType: typeof intent.filtered_artists,
          filteredArtistsIsArray: Array.isArray(intent.filtered_artists),
          priorityArtistsCount: intent.priority_artists?.length || 0,
          priorityArtistsType: typeof intent.priority_artists,
          priorityArtistsIsArray: Array.isArray(intent.priority_artists),
          hasExclusions: !!intent.exclusions,
          exclusionsType: typeof intent.exclusions
        });
        
        // Enhanced validation + defaults
        console.log(`[INTENT] ===== VALIDATION AND DEFAULTS =====`);
        console.log(`[INTENT] Applying validation and defaults...`);
        
        console.log(`[INTENT] Before validation - tracks:`, {
          type: typeof intent.tracks,
          isArray: Array.isArray(intent.tracks),
          length: intent.tracks?.length || 0
        });
        
        if (!Array.isArray(intent.tracks)) {
          console.log(`[INTENT] WARNING: tracks is not an array, setting to empty array`);
          intent.tracks = [];
        }
        
        console.log(`[INTENT] Before validation - artists:`, {
          type: typeof intent.artists,
          isArray: Array.isArray(intent.artists),
          length: intent.artists?.length || 0
        });
        
        if (!Array.isArray(intent.artists)) {
          console.log(`[INTENT] WARNING: artists is not an array, setting to empty array`);
          intent.artists = [];
        }
        
        console.log(`[INTENT] Before validation - exclusions:`, {
          type: typeof intent.exclusions,
          value: intent.exclusions
        });
        
        if (!intent.exclusions) {
          console.log(`[INTENT] Setting default exclusions`);
          intent.exclusions = { banned_artists: [], banned_terms: [] };
        }
        
        console.log(`[INTENT] Before validation - mode:`, {
          type: typeof intent.mode,
          value: intent.mode
        });
        
        if (!intent.mode) {
          console.log(`[INTENT] Setting default mode to "normal"`);
          intent.mode = "normal";
        }
        
        console.log(`[INTENT] Before validation - llmShare:`, {
          type: typeof intent.llmShare,
          value: intent.llmShare
        });
        
        if (typeof intent.llmShare !== 'number') {
          console.log(`[INTENT] Setting default llmShare to 0.7`);
          intent.llmShare = 0.7;
        }
        
        console.log(`[INTENT] Setting tamano_playlist to: ${targetSize}`);
        intent.tamano_playlist = targetSize;
        
        console.log(`[INTENT] Validation completed`);
        console.log(`[INTENT] After validation - intent:`, {
          mode: intent.mode,
          tracksLength: intent.tracks.length,
          artistsLength: intent.artists.length,
          exclusionsType: typeof intent.exclusions,
          llmShare: intent.llmShare,
          tamano_playlist: intent.tamano_playlist
        });

        // Manejar filtered_artists para UNDERGROUND_STRICT
        console.log(`[INTENT] ===== UNDERGROUND STRICT PROCESSING =====`);
        const isUndergroundStrict = /underground/i.test(prompt || '');
        console.log(`[INTENT] Checking for underground strict mode...`);
        console.log(`[INTENT] Prompt contains 'underground': ${isUndergroundStrict}`);
        console.log(`[INTENT] Has filtered_artists: ${!!intent.filtered_artists}`);
        console.log(`[INTENT] filtered_artists is array: ${Array.isArray(intent.filtered_artists)}`);
        
        if (isUndergroundStrict && intent.filtered_artists && Array.isArray(intent.filtered_artists)) {
          console.log(`[UNDERGROUND_STRICT] Processing filtered artists...`);
          console.log(`[UNDERGROUND_STRICT] LLM filtered artists: ${intent.filtered_artists.length} from ${contexts?.compass?.length || 0} original`);
          console.log(`[UNDERGROUND_STRICT] Filtered artists:`, intent.filtered_artists.slice(0, 10).join(', '), '...');
          
          // Validar que todos los artistas filtrados estén en la lista original
          console.log(`[UNDERGROUND_STRICT] Validating filtered artists against original list...`);
          console.log(`[UNDERGROUND_STRICT] Original compass length: ${contexts?.compass?.length || 0}`);
          
          const originalSet = new Set(contexts.compass.map(normalizeArtistName));
          console.log(`[UNDERGROUND_STRICT] Original set size: ${originalSet.size}`);
          
          const validFiltered = intent.filtered_artists.filter(artist => 
            originalSet.has(normalizeArtistName(artist))
          );
          
          console.log(`[UNDERGROUND_STRICT] Valid filtered artists: ${validFiltered.length}/${intent.filtered_artists.length}`);
          
          if (validFiltered.length !== intent.filtered_artists.length) {
            console.warn(`[UNDERGROUND_STRICT] Some filtered artists were not in original list, using valid ones only`);
            console.log(`[UNDERGROUND_STRICT] Invalid artists:`, intent.filtered_artists.filter(artist => 
              !originalSet.has(normalizeArtistName(artist))
            ));
          }
          
          // Usar la lista filtrada como la lista de artistas permitidos
          intent.filtered_artists = validFiltered;
          console.log(`[UNDERGROUND_STRICT] Final filtered artists count: ${intent.filtered_artists.length}`);
        }
        
        // Manejar priority_artists para modo INCLUSIVE (underground y contextos normales)
        console.log(`[INTENT] ===== PRIORITY ARTISTS PROCESSING =====`);
        console.log(`[INTENT] Checking for priority artists...`);
        console.log(`[INTENT] Has priority_artists: ${!!intent.priority_artists}`);
        console.log(`[INTENT] priority_artists is array: ${Array.isArray(intent.priority_artists)}`);
        console.log(`[INTENT] priority_artists length: ${intent.priority_artists?.length || 0}`);
        
        if (intent.priority_artists && Array.isArray(intent.priority_artists)) {
          const contextName = isUndergroundStrict ? 'UNDERGROUND_STRICT' : 'CONTEXT';
          console.log(`[${contextName}] Processing priority artists...`);
          console.log(`[${contextName}] LLM priority artists: ${intent.priority_artists.length}`);
          console.log(`[${contextName}] Priority artists:`, intent.priority_artists.join(', '));
          
          // Validar que todos los artistas prioritarios estén en la lista original
          console.log(`[${contextName}] Validating priority artists against original list...`);
          console.log(`[${contextName}] Contexts available: ${!!contexts}`);
          console.log(`[${contextName}] Original compass length: ${contexts?.compass?.length || 0}`);
          
          if (contexts && contexts.compass && Array.isArray(contexts.compass)) {
            const originalSet = new Set(contexts.compass.map(normalizeArtistName));
            console.log(`[${contextName}] Original set size: ${originalSet.size}`);
            
            const validPriority = intent.priority_artists.filter(artist => 
              originalSet.has(normalizeArtistName(artist))
            );
            
            console.log(`[${contextName}] Valid priority artists: ${validPriority.length}/${intent.priority_artists.length}`);
            
            if (validPriority.length !== intent.priority_artists.length) {
              console.warn(`[${contextName}] Some priority artists were not in original list, using valid ones only`);
              console.log(`[${contextName}] Invalid priority artists:`, intent.priority_artists.filter(artist => 
                !originalSet.has(normalizeArtistName(artist))
              ));
            }
            
            intent.priority_artists = validPriority;
            console.log(`[${contextName}] Final priority artists count: ${intent.priority_artists.length}`);
          } else {
            console.log(`[${contextName}] No contexts available, using all priority artists`);
            console.log(`[${contextName}] Final priority artists count: ${intent.priority_artists.length}`);
          }
        } else {
          console.log(`[INTENT] No priority artists found`);
        }

        // Add contexts information
        console.log(`[INTENT] ===== ADDING CONTEXT INFORMATION =====`);
        console.log(`[INTENT] Adding context information...`);
        console.log(`[INTENT] Has contexts: ${!!contexts}`);
        
        if (contexts) {
          intent.contexts = contexts;
          console.log(`[INTENT] Context information added:`, {
            key: contexts.key,
            compassLength: contexts.compass?.length || 0
          });
        } else {
          console.log(`[INTENT] No context information to add`);
        }

        // Add canonized data if available
        console.log(`[INTENT] ===== ADDING CANONIZED DATA =====`);
        console.log(`[INTENT] Adding canonized data...`);
        console.log(`[INTENT] Has canonized data: ${!!canonizedData}`);
        
        if (canonizedData) {
          intent.canonized = canonizedData;
          console.log(`[INTENT] Canonized data added:`, canonizedData);
        } else {
          console.log(`[INTENT] No canonized data to add`);
        }

        console.log(`[INTENT] ===== FINAL INTENT SUMMARY =====`);
        console.log(`[INTENT] Final intent:`, {
          mode: intent.mode,
          tracks: intent.tracks.length,
          artists: intent.artists.length,
          filtered_artists: intent.filtered_artists?.length || 0,
          priority_artists: intent.priority_artists?.length || 0,
          exclusions: intent.exclusions ? 'yes' : 'no',
          contexts: intent.contexts?.key || 'none',
          canonized: intent.canonized ? 'yes' : 'no'
        });
        console.log(`[INTENT] Sample tracks:`, intent.tracks.slice(0, 3).map(t => ({ title: t.title, artist: t.artist })));
        console.log(`[INTENT] Sample artists:`, intent.artists.slice(0, 5));
        console.log(`[INTENT] Full tracks array:`, intent.tracks);
        console.log(`[INTENT] Full artists array:`, intent.artists);
        console.log(`[INTENT] Full filtered_artists array:`, intent.filtered_artists);
        console.log(`[INTENT] Full priority_artists array:`, intent.priority_artists);
        console.log(`[INTENT] Full exclusions:`, intent.exclusions);
        console.log(`[INTENT] Full contexts:`, intent.contexts);
        console.log(`[INTENT] Full canonized:`, intent.canonized);
        
        // Assign tracks_llm for streaming endpoint
        intent.tracks_llm = intent.tracks || [];
        intent.artists_llm = intent.artists || [];
        intent.prompt = prompt; // Assign original prompt for mode detection
        
        // 🚨 CRITICAL: Filter out banned artists from tracks_llm
        if (intent.exclusions && intent.exclusions.banned_artists && intent.exclusions.banned_artists.length > 0) {
          const bannedArtists = intent.exclusions.banned_artists.map(a => a.toLowerCase());
          const originalCount = intent.tracks_llm.length;
          
          intent.tracks_llm = intent.tracks_llm.filter(track => {
            const artistLower = (track.artist || '').toLowerCase();
            const hasBannedArtist = bannedArtists.some(banned => artistLower.includes(banned));
            
            if (hasBannedArtist) {
              console.log(`[INTENT] 🚨 FILTERED OUT BANNED TRACK: "${track.title}" by "${track.artist}"`);
            }
            
            return !hasBannedArtist;
          });
          
          console.log(`[INTENT] 🚨 EXCLUSION FILTERING: ${originalCount} → ${intent.tracks_llm.length} tracks (removed ${originalCount - intent.tracks_llm.length} banned tracks)`);
        }
        
        // 🚨 CRITICAL FIX: Force empty tracks for ARTIST_STYLE mode
        if (intent.mode === 'ARTIST_STYLE') {
          console.log(`[INTENT] 🚨 ARTIST_STYLE mode detected - FORCING tracks to empty array`);
          console.log(`[INTENT] Before fix: ${intent.tracks_llm?.length || 0} tracks`);
          intent.tracks_llm = [];
          console.log(`[INTENT] After fix: ${intent.tracks_llm.length} tracks (should be 0)`);
        }
        
        console.log(`[INTENT] Assigned tracks_llm: ${intent.tracks_llm.length} tracks`);
        console.log(`[INTENT] Assigned artists_llm: ${intent.artists_llm.length} artists`);
        console.log(`[INTENT] Assigned prompt: "${intent.prompt}"`);
        
        // CRITICAL FIX: Detect and fix generic artists when specific artist is mentioned
        console.log(`[INTENT] ===== CHECKING FOR GENERIC ARTISTS FIX =====`);
        const genericArtists = ['pop', 'rock', 'electronic', 'hip hop', 'indie', 'alternative', 'dance', 'r&b'];
        const hasGenericArtists = intent.artists_llm.some(artist => genericArtists.includes(artist.toLowerCase()));
        
        if (hasGenericArtists) {
          console.log(`[INTENT] WARNING: Detected generic artists in artists_llm:`, intent.artists_llm);
          
          // Extract artist name from prompt for "estilo de X" patterns
          const estiloMatch = prompt.match(/estilo\s+de\s+([^,\s]+)/i);
          const comoMatch = prompt.match(/como\s+([^,\s]+)/i);
          const musicaMatch = prompt.match(/música\s+de\s+([^,\s]+)/i);
          
          const extractedArtist = estiloMatch?.[1] || comoMatch?.[1] || musicaMatch?.[1];
          
          if (extractedArtist) {
            console.log(`[INTENT] FIXING: Extracted artist "${extractedArtist}" from prompt`);
            
            // Replace generic artists with the specific artist
            intent.artists_llm = [extractedArtist];
            intent.priority_artists = [extractedArtist];
            
            console.log(`[INTENT] FIXED: Replaced generic artists with:`, intent.artists_llm);
            console.log(`[INTENT] FIXED: Set priority_artists to:`, intent.priority_artists);
          }
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`[INTENT] ===== INTENT GENERATION COMPLETED =====`);
        console.log(`[INTENT] Total duration: ${duration}ms`);
        console.log(`[INTENT] Success on attempt: ${attempts}/${maxAttempts}`);

        return NextResponse.json(intent);

      } catch (error) {
        console.log(`[INTENT] ===== ERROR IN ATTEMPT ${attempts} =====`);
        console.log(`[INTENT] Error occurred in attempt ${attempts}`);
        console.log(`[INTENT] Error type: ${typeof error}`);
        console.log(`[INTENT] Error message: ${error.message}`);
        console.log(`[INTENT] Error stack: ${error.stack}`);
        console.log(`[INTENT] Mobile: ${isMobile}`);
        console.log(`[INTENT] Attempt: ${attempts}/${maxAttempts}`);
        
        attempts++;
        console.error(`[INTENT] OpenAI attempt ${attempts} failed - Mobile: ${isMobile}, Error: ${error.message}`);
        
        if (attempts >= maxAttempts) {
          console.log(`[INTENT] ===== ALL ATTEMPTS FAILED =====`);
          console.log(`[INTENT] All ${maxAttempts} attempts failed`);
          console.log(`[INTENT] Final error: ${error.message}`);
          console.log(`[INTENT] Mobile: ${isMobile}`);
          console.log(`[INTENT] Returning 503 error to client`);
          
          console.error(`[INTENT] All attempts failed - Mobile: ${isMobile}, Final error: ${error.message}`);
          return NextResponse.json(
            { error: "OpenAI service unavailable. Please try again later." },
            { status: 503 }
          );
        } else {
          console.log(`[INTENT] Retrying... attempt ${attempts + 1}/${maxAttempts}`);
        }
      }
    }
  } catch (error) {
    console.log(`[INTENT] ===== CRITICAL ERROR =====`);
    console.log(`[INTENT] Critical error occurred outside retry loop`);
    console.log(`[INTENT] Error type: ${typeof error}`);
    console.log(`[INTENT] Error message: ${error.message}`);
    console.log(`[INTENT] Error stack: ${error.stack}`);
    console.log(`[INTENT] Mobile: ${isMobile}`);
    console.log(`[INTENT] Returning 503 error to client`);
    
    console.error(`[INTENT] Intent parsing error - Mobile: ${isMobile}, Error: ${error.message}`);
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 }
    );
  }
}

/**
 * Detect mode from prompt
 */
function detectMode(prompt) {
  const promptLower = prompt.toLowerCase();
  
  // Check for viral/current mode
  const viralKeywords = ['tiktok', 'viral', 'virales', 'top', 'charts', 'tendencia', 'tendencias', '2024', '2025'];
  if (viralKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'VIRAL';
  }
  
  // Check for festival mode
  const festivalKeywords = ['festival', 'primavera', 'sonar', 'riverland', 'madcool', 'groove', 'coachella', 'glastonbury', 'lollapalooza', 'tomorrowland', 'download'];
  if (festivalKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'FESTIVAL';
  }
  
  return 'NORMAL';
}

/**
 * Canonize prompt for VIRAL/FESTIVAL modes
 */
async function canonizePrompt(prompt) {
  const canonizationPrompt = `Analiza este prompt y extrae la información esencial para búsqueda de playlists:

PROMPT: "${prompt}"

Extrae:
1. baseQuery: Solo el nombre del evento/festival/lista (ej: "groove pamplona"), sin verbos ni palabras extra
2. year: El año si aparece explícito, null si no
3. stopwords: Palabras que deben ignorarse (ej: "calentamiento", "warm up", "preparty", "after", "afterparty")

Responde SOLO con JSON:
{ "baseQuery": "nombre limpio", "year": 2025 | null, "stopwords": ["palabra1", "palabra2"] }`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Eres un experto en extraer información esencial de prompts musicales. Responde SOLO con JSON válido." },
        { role: "user", content: canonizationPrompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content from canonization");
    }

    const canonized = JSON.parse(content);
    
    // Validate structure
    if (!canonized.baseQuery || typeof canonized.baseQuery !== 'string') {
      throw new Error("Invalid baseQuery in canonization");
    }
    
    return {
      baseQuery: canonized.baseQuery.trim(),
      year: canonized.year || null,
      stopwords: Array.isArray(canonized.stopwords) ? canonized.stopwords : []
    };
    
  } catch (error) {
    console.warn(`[INTENT] Canonization failed:`, error.message);
    
    // Fallback: simple extraction
    const yearMatch = prompt.match(/\b(20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;
    
    // Remove common stopwords and extract base
    const stopwords = ['calentamiento', 'warm up', 'preparty', 'after', 'afterparty', 'viral', 'virales', 'top', 'charts'];
    let baseQuery = prompt;
    for (const word of stopwords) {
      baseQuery = baseQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
    }
    if (year) {
      baseQuery = baseQuery.replace(new RegExp(`\\b${year}\\b`, 'g'), '').trim();
    }
    baseQuery = baseQuery.replace(/\s+/g, ' ').trim() || 'playlist';

  return {
      baseQuery,
      year,
      stopwords
    };
  }
}

/**
 * Detect if prompt is a single artist name
 */
function detectSingleArtist(prompt) {
  const promptTrimmed = prompt.trim();
  
  // Check if prompt is just a single word or short phrase (likely artist name)
  const words = promptTrimmed.split(/\s+/);
  
  // Single word or 2-3 words (common artist name patterns)
  if (words.length <= 3) {
    // Check if it doesn't contain common playlist keywords
    const playlistKeywords = ['playlist', 'música', 'canciones', 'tracks', 'songs', 'mix', 'compilation', 'album', 'discografía'];
    const hasPlaylistKeywords = playlistKeywords.some(keyword => 
      promptTrimmed.toLowerCase().includes(keyword)
    );
    
    if (!hasPlaylistKeywords) {
      return true; // Likely a single artist name
    }
  }
  
  return false;
}

/**
 * Normalize artist name for comparison
 */
function normalizeArtistName(name) {
  return name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
}