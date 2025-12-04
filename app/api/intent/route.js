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
  
  // 🚨 CRITICAL: Check OpenAI API key before processing
  if (!process.env.OPENAI_API_KEY) {
    console.error('[INTENT] ❌ OPENAI_API_KEY is missing!');
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }
  
  try {
    const requestBody = await request.json();
    const { prompt, target_tracks } = requestBody;
    
    if (!prompt) {
      console.error('[INTENT] ERROR: No prompt provided');
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const targetSize = Math.max(1, Math.min(500, Number(target_tracks) || 50));
    
    // LLM will detect mode and decide everything based on prompt analysis

    // Get contexts brújula for the prompt
    let contexts;
    try {
      contexts = getContextsForPrompt(prompt);
    } catch (contextError) {
      console.error(`[INTENT] ERROR in getContextsForPrompt:`, contextError.message);
      contexts = null;
    }

    // Detect mode and canonize for VIRAL/FESTIVAL
    let mode;
    try {
      mode = detectMode(prompt);
    } catch (modeError) {
      console.error(`[INTENT] ERROR in detectMode:`, modeError.message);
      mode = 'NORMAL'; // fallback
    }
    
    let canonizedData = null;
    
    // Detect if prompt is a single artist name
    let isSingleArtist;
    try {
      isSingleArtist = detectSingleArtist(prompt);
    } catch (singleArtistError) {
      console.error(`[INTENT] ERROR in detectSingleArtist:`, singleArtistError.message);
      isSingleArtist = false;
    }
    
    if (mode === 'VIRAL' || mode === 'FESTIVAL') {
      try {
        canonizedData = await canonizePrompt(prompt);
      } catch (canonizeError) {
        console.error(`[INTENT] ERROR in canonizePrompt:`, canonizeError.message);
        canonizedData = null;
      }
    }

    // Retry logic for OpenAI
    const maxAttempts = 3;
    let attempts = 0;

    while (attempts < maxAttempts) {
      let completion;
      let modelUsed = MODEL;
      attempts++;
      
      try {
        // Build comprehensive user message - LLM decides everything
        let userMessage = `Prompt: "${prompt}"\nTamaño solicitado: ${targetSize} tracks\n\n`;
        
        // Add context information if available
        if (contexts && Array.isArray(contexts.compass)) {
          userMessage += `CONTEXTOS BRÚJULA DISPONIBLES:\n${contexts.compass.join(', ')}\n\n`;
        }
        
        const tracksToGenerate = Math.ceil(targetSize * 1.4);
        userMessage += `Analiza este prompt y determina el modo correcto. Genera ${tracksToGenerate} canciones que encajen perfectamente con la petición. Usa solo canciones reales con título y artista específicos. Respeta TODAS las restricciones mencionadas (ej. instrumental, género, etc.).\n\nNUNCA uses comillas curvas; usa comillas dobles normales; no pongas comas finales.`;
        completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: `Eres la IA que interpreta prompts musicales y decide el modo de generación. Devuelves SOLO una llamada a emit_intent con JSON válido (nada de texto libre). SIEMPRE debes generar tracks relevantes - NUNCA dejes el array vacío excepto en modos delegados explícitos.

MODOS
- NORMAL: Modo por DEFECTO para prompts creativos/abstractos/emocionales. Tú (LLM) generas ~70% de los temas reales. Usa este modo para: películas, emociones, atmósferas, "tipo X" con múltiples artistas, conceptos abstractos.
- VIRAL: SOLO si pide explícitamente "tiktok/viral/charts/tendencias + año". Delega TODO a Spotify. NO generes tracks.
- FESTIVAL: SOLO si nombra explícitamente un festival. Delega TODO a Spotify. NO generes tracks.
- ARTIST_STYLE: SOLO para "como X"/"estilo de X" con UN artista específico. Usa priority_artists=[X]. NO generes tracks.
- SINGLE_ARTIST: SOLO cuando el prompt es ÚNICAMENTE un nombre de artista. NO generes tracks.
- UNDERGROUND_STRICT: Si incluye "underground" en España. Usa whitelist específico.

🚨 CRÍTICO: PROMPTS CREATIVOS/ABSTRACTOS = MODO NORMAL
Para CUALQUIER prompt que mencione: películas, directores, emociones (triste, oscuro, melancólico, épico), atmósferas, "tipo X" con ejemplos, conceptos (nicho, experimental, raro), USA MODO NORMAL y GENERA TRACKS:

EJEMPLOS CREATIVOS (siempre NORMAL con tracks):
- "inspirado en David Lynch, Elephant Man, triste, nicho, tipo Swans, Giles Corey"
  → Música oscura/melancólica/experimental: Swans, Giles Corey, Have a Nice Life, Mount Eerie, Low, Codeine, Red House Painters, Joy Division, The Cure, Grouper, Angelo Badalamenti, Dead Can Dance
  
- "música para un día lluvioso introspectivo"
  → Ambient, indie folk melancólico: Bon Iver, Sufjan Stevens, Sigur Rós, Nick Drake, Elliott Smith

- "algo experimental y raro"
  → Avant-garde, noise: Swans, Sonic Youth, Can, Aphex Twin, Mr. Bungle

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

        let result = completion.choices[0]?.message;
        
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

        const toolCall = result.tool_calls[0];
        
        if (!toolCall || toolCall.function.name !== 'emit_intent') {
          console.error(`[INTENT] ERROR: No valid tool call in OpenAI response. Expected: emit_intent, Got: ${toolCall?.function?.name}`);
          throw new Error("No valid tool call in OpenAI response");
        }

        // Parse tool call arguments directly (guaranteed valid JSON)
        let intent;
        try {
          intent = JSON.parse(toolCall.function.arguments);
        } catch (parseError) {
          console.error(`[INTENT] ERROR parsing JSON:`, parseError.message);
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
        
        // Enhanced validation + defaults
        if (!Array.isArray(intent.tracks)) {
          console.warn(`[INTENT] WARNING: tracks is not an array, setting to empty array`);
          intent.tracks = [];
        }
        
        if (!Array.isArray(intent.artists)) {
          console.warn(`[INTENT] WARNING: artists is not an array, setting to empty array`);
          intent.artists = [];
        }
        
        if (!intent.exclusions) {
          intent.exclusions = { banned_artists: [], banned_terms: [] };
        }
        
        if (!intent.mode) {
          intent.mode = "normal";
        }
        
        if (typeof intent.llmShare !== 'number') {
          intent.llmShare = 0.7;
        }
        
        intent.tamano_playlist = targetSize;

        // Manejar filtered_artists para UNDERGROUND_STRICT
        const isUndergroundStrict = /underground/i.test(prompt || '');
        
        if (isUndergroundStrict && intent.filtered_artists && Array.isArray(intent.filtered_artists)) {
          const originalSet = new Set(contexts.compass.map(normalizeArtistName));
          const validFiltered = intent.filtered_artists.filter(artist => 
            originalSet.has(normalizeArtistName(artist))
          );
          
          if (validFiltered.length !== intent.filtered_artists.length) {
            console.warn(`[UNDERGROUND_STRICT] Some filtered artists were not in original list, using valid ones only`);
          }
          
          intent.filtered_artists = validFiltered;
        }
        
        // Manejar priority_artists para modo INCLUSIVE (underground y contextos normales)
        if (intent.priority_artists && Array.isArray(intent.priority_artists)) {
          if (contexts && contexts.compass && Array.isArray(contexts.compass)) {
            const originalSet = new Set(contexts.compass.map(normalizeArtistName));
            const validPriority = intent.priority_artists.filter(artist => 
              originalSet.has(normalizeArtistName(artist))
            );
            
            if (validPriority.length !== intent.priority_artists.length) {
              console.warn(`[INTENT] Some priority artists were not in original list, using valid ones only`);
            }
            
            intent.priority_artists = validPriority;
          }
        } else {
          console.log(`[INTENT] No priority artists found`);
        }

        // Add contexts information
        if (contexts) {
          intent.contexts = contexts;
        }

        // Add canonized data if available
        if (canonizedData) {
          intent.canonized = canonizedData;
        }
        
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
            return !hasBannedArtist;
          });
          
          if (originalCount !== intent.tracks_llm.length) {
            console.warn(`[INTENT] Filtered ${originalCount - intent.tracks_llm.length} banned tracks`);
          }
        }
        
        // 🚨 CRITICAL FIX: Force empty tracks for ARTIST_STYLE mode
        if (intent.mode === 'ARTIST_STYLE') {
          intent.tracks_llm = [];
        }
        
        // CRITICAL FIX: Detect and fix generic artists when specific artist is mentioned
        const genericArtists = ['pop', 'rock', 'electronic', 'hip hop', 'indie', 'alternative', 'dance', 'r&b'];
        const hasGenericArtists = intent.artists_llm.some(artist => genericArtists.includes(artist.toLowerCase()));
        
        if (hasGenericArtists) {
          // Extract artist name from prompt for "estilo de X" patterns
          const estiloMatch = prompt.match(/estilo\s+de\s+([^,\s]+)/i);
          const comoMatch = prompt.match(/como\s+([^,\s]+)/i);
          const musicaMatch = prompt.match(/música\s+de\s+([^,\s]+)/i);
          
          const extractedArtist = estiloMatch?.[1] || comoMatch?.[1] || musicaMatch?.[1];
          
          if (extractedArtist) {
            intent.artists_llm = [extractedArtist];
            intent.priority_artists = [extractedArtist];
          }
        }

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
          console.error(`[INTENT] All ${maxAttempts} attempts failed: ${error.message}`);
          return NextResponse.json(
            { error: "OpenAI service unavailable. Please try again later." },
            { status: 503 }
          );
        }
      }
    }
  } catch (error) {
    console.error(`[INTENT] Critical error: ${error.message}`, error.stack);
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