import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getContextsForPrompt } from '../../../lib/music/scenes';

const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { prompt, target_tracks } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log(`[INTENT] Processing prompt: "${prompt}"`);
    
    // Mobile detection for debugging
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);
    console.log(`[INTENT] Mobile detected: ${isMobile}, User-Agent: ${userAgent.substring(0, 100)}...`);

    const targetSize = Math.max(1, Math.min(500, Number(target_tracks) || 50));
    
    // LLM will detect mode and decide everything based on prompt analysis

    // Get contexts brújula for the prompt
    const contexts = getContextsForPrompt(prompt);
    if (contexts) {
      console.log(`[CONTEXT] compass_used=true name=${contexts.key} keep_outside=${contexts.key !== 'underground_es'}`);
    }

    // Detect mode and canonize for VIRAL/FESTIVAL
    const mode = detectMode(prompt);
    let canonizedData = null;
    
    // Detect if prompt is a single artist name
    const isSingleArtist = detectSingleArtist(prompt);
    if (isSingleArtist) {
      console.log(`[INTENT] SINGLE ARTIST detected: "${prompt}" - delegating to Spotify`);
    }
    
    if (mode === 'VIRAL' || mode === 'FESTIVAL') {
      canonizedData = await canonizePrompt(prompt);
      console.log(`[INTENT] Mode: ${mode}, Canonized:`, canonizedData);
    }

    // Retry logic for OpenAI
    const maxAttempts = 3;
    let attempts = 0;

    while (attempts < maxAttempts) {
      let completion;
      let modelUsed = MODEL;

      try {
        console.log(`[INTENT] Attempting with model:`, MODEL);
        // Build comprehensive user message - LLM decides everything
        let userMessage = `Prompt: "${prompt}"\nTamaño solicitado: ${targetSize} tracks\n\n`;
        
        // Add context information if available
        if (contexts) {
          userMessage += `CONTEXTOS BRÚJULA DISPONIBLES:\n${contexts.compass.join(', ')}\n\n`;
        }
        
        userMessage += `Analiza este prompt y determina el modo correcto. Genera ${Math.ceil(targetSize * 1.4)} canciones que encajen perfectamente con la petición. Usa solo canciones reales con título y artista específicos. Respeta TODAS las restricciones mencionadas (ej. instrumental, género, etc.).\n\nNUNCA uses comillas curvas; usa comillas dobles normales; no pongas comas finales.`;

        completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: `Eres un experto en interpretar prompts musicales. Analiza el prompt y determina el modo correcto basándote en el contexto completo.

MODOS DISPONIBLES Y CUÁNDO USARLOS:

1. NORMAL: 
   - Playlist general, mezcla de artistas
   - USA ESTE para "estilo de cantante" o "como X artista"
   - Marca ese cantante como priority_artists
   - LLM busca cantantes similares en el mismo nicho
   - Spotify rellena con radios de canciones

2. VIRAL:
   - Canciones virales, trending, populares actuales
   - Palabras clave: tiktok, viral, virales, top, charts, tendencia, 2024, 2025
   - DELEGA COMPLETAMENTE A SPOTIFY
   - NO generes tracks con LLM
   - Pasa términos de búsqueda para que Spotify busque en playlists populares
   - Spotify maneja toda la generación

3. FESTIVAL:
   - Música de festivales, electrónica, fiesta
   - Palabras clave: festival, coachella, ultra, tomorrowland, edc
   - DELEGA COMPLETAMENTE A SPOTIFY
   - NO generes tracks con LLM
   - Pasa información canonizada (evento, año, stopwords) para que Spotify busque por consenso
   - Spotify maneja toda la generación

4. ARTIST_STYLE:
   - Solo para casos muy específicos de comparación directa
   - NO usar para "estilo de cantante" (usar NORMAL)

MODOS ESPECIALES PARA CONTEXTOS:

UNDERGROUND_STRICT (cuando hay contextos underground_es):
- INTERPRETA el prompt completo para entender la intención
- RESTRICTIVE: "solo X artista" → filtered_artists con solo ese artista específico
- INCLUSIVE: "con X artista" → priority_artists con ese artista + todos los demás
- NORMAL: Filtrar por estilo según el prompt, quitar artistas que no encajen
- FILTROS AVANZADOS: Si interpretas que Spotify puede filtrar por oyentes mensuales (menos/más de X), marca en filtered_artists
- DELEGA TODO A SPOTIFY: Pasa la lista filtrada para que Spotify busque directamente

CONTEXTOS NORMALES:
- RESTRICTIVE: "solo X artista" → restricted_artists con ese artista
- INCLUSIVE: "con X artista" → priority_artists con ese artista
- NORMAL: Usar todos los artistas del contexto

DETECCIÓN DE MODOS:
- Analiza el prompt completo para entender la intención
- NO dependas de palabras exactas, interpreta el contexto
- Para "estilo de cantante": USA MODO NORMAL con ese cantante como priority_artists
- Para artista específico (solo nombre): delega completamente a Spotify
- Para exclusiones: detecta "sin X" y marca en exclusions

DELEGACIÓN A SPOTIFY:
- VIRAL y FESTIVAL: DELEGA TODO, NO generes tracks
- UNDERGROUND_STRICT: INTERPRETA prompt, filtra lista, DELEGA TODO a Spotify
- Spotify puede filtrar por oyentes mensuales si es necesario
- Pasa información clara para que Spotify sepa qué buscar

Devuelve exclusivamente una llamada a la función emit_intent con argumentos válidos. No incluyas markdown, texto ni explicaciones.` },
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
                    }
                  },
                  artists: {
                    type: "array",
                    items: { type: "string" }
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
                      artists: { type: "array", items: { type: "string" } },
                      terms: { type: "array", items: { type: "string" } }
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

        const result = completion.choices[0]?.message;
        
        if (!result || !result.tool_calls || result.tool_calls.length === 0) {
          throw new Error("No tool calls in OpenAI response");
        }

        const toolCall = result.tool_calls[0];
        if (!toolCall || toolCall.function.name !== 'emit_intent') {
          throw new Error("No valid tool call in OpenAI response");
        }

        // Parse tool call arguments directly (guaranteed valid JSON)
        let intent = JSON.parse(toolCall.function.arguments);
        console.log(`[INTENT] parsed_ok=true (tool_call)`);
        
        // Enhanced validation + defaults
        if (!Array.isArray(intent.tracks)) intent.tracks = [];
        if (!Array.isArray(intent.artists)) intent.artists = [];
        if (!intent.exclusions) intent.exclusions = { banned_artists: [], banned_terms: [] };
        if (!intent.mode) intent.mode = "normal";
        if (typeof intent.llmShare !== 'number') intent.llmShare = 0.7;
        intent.tamano_playlist = targetSize;

        // Manejar filtered_artists para UNDERGROUND_STRICT
        const isUndergroundStrict = /underground/i.test(prompt || '');
        if (isUndergroundStrict && intent.filtered_artists && Array.isArray(intent.filtered_artists)) {
          console.log(`[UNDERGROUND_STRICT] LLM filtered artists: ${intent.filtered_artists.length} from ${contexts.compass.length} original`);
          console.log(`[UNDERGROUND_STRICT] Filtered artists:`, intent.filtered_artists.slice(0, 10).join(', '), '...');
          
          // Validar que todos los artistas filtrados estén en la lista original
          const originalSet = new Set(contexts.compass.map(normalizeArtistName));
          const validFiltered = intent.filtered_artists.filter(artist => 
            originalSet.has(normalizeArtistName(artist))
          );
          
          if (validFiltered.length !== intent.filtered_artists.length) {
            console.warn(`[UNDERGROUND_STRICT] Some filtered artists were not in original list, using valid ones only`);
          }
          
          // Usar la lista filtrada como la lista de artistas permitidos
          intent.filtered_artists = validFiltered;
        }
        
        // Manejar priority_artists para modo INCLUSIVE (underground y contextos normales)
        if (intent.priority_artists && Array.isArray(intent.priority_artists)) {
          const contextName = isUndergroundStrict ? 'UNDERGROUND_STRICT' : 'CONTEXT';
          console.log(`[${contextName}] LLM priority artists: ${intent.priority_artists.length}`);
          console.log(`[${contextName}] Priority artists:`, intent.priority_artists.join(', '));
          
          // Validar que todos los artistas prioritarios estén en la lista original
          const originalSet = new Set(contexts.compass.map(normalizeArtistName));
          const validPriority = intent.priority_artists.filter(artist => 
            originalSet.has(normalizeArtistName(artist))
          );
          
          if (validPriority.length !== intent.priority_artists.length) {
            console.warn(`[${contextName}] Some priority artists were not in original list, using valid ones only`);
          }
          
          intent.priority_artists = validPriority;
        }

        // Add contexts information
        if (contexts) {
          intent.contexts = contexts;
        }

        // Add canonized data if available
        if (canonizedData) {
          intent.canonized = canonizedData;
        }

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

        return NextResponse.json(intent);

      } catch (error) {
        attempts++;
        console.error(`[INTENT] OpenAI attempt ${attempts} failed - Mobile: ${isMobile}, Error: ${error.message}`);
        
        if (attempts >= maxAttempts) {
          console.error(`[INTENT] All attempts failed - Mobile: ${isMobile}, Final error: ${error.message}`);
          return NextResponse.json(
            { error: "OpenAI service unavailable. Please try again later." },
            { status: 503 }
          );
        }
      }
    }
  } catch (error) {
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