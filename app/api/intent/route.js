// web/app/api/intent/route.js
// Universal intent generation with GPT-4.1 and exact track count

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getContextsForPrompt, normalizeArtistName, MUSICAL_CONTEXTS } from "../../../lib/music/contexts";

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Universal prompt for all music requests
const UNIVERSAL_SYSTEM_PROMPT = `Eres un motor de interpretación de peticiones musicales.  
Tu tarea es transformar cualquier prompt de usuario en una intención musical clara y bien estructurada.  
Sigue estas reglas SIEMPRE:

1. **Interpretación del prompt**
   - Extrae el objetivo: género, estilo, actividad, emoción, época, etc.
   - Si se menciona "instrumental / sin voz / solo música", excluye canciones con letra.
   - Si se menciona "sin X / excluye X / excepto X", excluye a esos artistas o términos.
   - Si se pide "del estilo de X", incluye canciones similares a X, pero no solo de X.
   - Si se pide "del estilo de X sin X", aplica las dos reglas anteriores juntas.
   - Si se pide algo de festivales, virales o actualidad → **no inventes** canciones: prepara la query para que Spotify busque playlists relevantes (nombre del festival, año, virales, trending).

2. **BRÚJULA ESTRICTA (OBLIGATORIA)**
   EJECUTA MODO "BRÚJULA ESTRICTA" CUANDO contexts.compass exista.

   REGLAS DE CALIDAD (BRÚJULA):
   1) Usa artistas dentro del COMPASS y su círculo cercano (colabos directas, crew, sellos, productores) de los últimos 5-7 años. Si dudas, descarta.
   2) Máx. 3 pistas por artista (2 si el target < 40). Evita abusar de 1 nombre.
   3) Nombres ambiguos → desambiguación obligatoria:
      - Si el artista no es inequívoco, intenta "<ARTISTA> + (alias/crew/sello/ciudad)".
      - Si sigue ambiguo, prueba "<ARTISTA> + (álbum/canción clave)".
      - Si no lo confirmas, NO LO INCLUYAS.
   4) Coherencia de escena:
      - Al menos 80% de los temas deben ser: COMPASS, colabos directas o artistas a 1 salto (vecinos claros).
      - 0% de pop/comercial fuera de escena, salvo que el prompt lo pida explícitamente.
   5) Revisión final:
      - Quita 100% nombres fuera de escena.
      - Si faltan temas, rellena con vecinos de COMPASS (no mainstream random).
      - Devuelve EXACTAMENTE el número pedido.

   - Dedup por artista y aplica cap (3).
   - Score = (está en COMPASS)*3 + (colabo con COMPASS)*2 + (sello/crew común)*2 + (ciudad/escena)*1.
   - Mantén solo score ≥2; si no llegas, rellena con vecinos de mayor score.

3. **Precisión**
   - No inventes títulos inexistentes.  
   - Devuelve canciones y artistas reales, conocidos en Spotify.  
   - Evita repeticiones.

4. **Cantidad**
   - Si el usuario pide N canciones, siempre entrega exactamente N (o avisa si no es posible).  
   - Ajusta proporcionalmente entre LLM (tus propuestas) y Spotify (complemento).

5. **Formato JSON**
   - Devuelve SIEMPRE un JSON válido, sin texto extra ni comentarios.  
   - Estructura:
     \`\`\`json
     {
       "tracks": [
         {"name": "...", "artist": "..."},
         ...
       ],
       "artists": ["...", "..."],
       "exclusions": {
         "banned_artists": ["..."],
         "banned_terms": ["..."]
       },
       "mode": "normal | viral | festival | artist-style"
     }
     \`\`\`

6. **Consistencia**
   - Cada canción debe tener \`name\` y \`artist\` rellenados.  
   - Respeta exclusiones y condiciones de forma estricta.  
   - Si no hay suficiente material, rellena con lo más cercano al estilo pedido.

En resumen: interpreta el prompt como si fueras un DJ experto + ingeniero de datos. No inventes, no falles el JSON, y aplica las restricciones de forma automática.

DEVUELVE EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO (RFC 8259) SIN TEXTO ADICIONAL. SIN COMILLAS TIPOGRÁFICAS, SIN COMENTARIOS, SIN MARCAS DE CÓDIGO.`;

// Simplified schema for universal prompt
const UNIVERSAL_SCHEMA = {
  type: "object",
  properties: {
    tracks: {
      type: "array",
      items: {
      type: "object",
      properties: { 
          name: { type: "string" },
          artist: { type: "string" }
        },
        required: ["name", "artist"]
      }
    },
    artists: {
      type: "array",
      items: { type: "string" }
    },
    exclusions: {
      type: "object",
      properties: { 
        banned_artists: {
          type: "array",
          items: { type: "string" }
        },
        banned_terms: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    mode: {
      type: "string",
      enum: ["normal", "viral", "festival", "artist-style"]
    },
    llmShare: {
      type: "number",
      minimum: 0.0,
      maximum: 1.0
    },
    tamano_playlist: { type: "number" },
    spotifyStrategy: {
      type: "string",
      enum: ["genre_focused", "artist_focused", "festival_focused", "activity_focused", "spotify_only"]
    },
    spotifyHint: { type: "string" },
    targetFeatures: {
      type: "object",
      properties: {
        tempo: { type: "number" },
        energy: { type: "number" },
        valence: { type: "number" },
        acousticness: { type: "number" },
        danceability: { type: "number" }
      }
    }
  },
  required: ["tracks", "artists", "exclusions", "mode"]
};

// Tool-calling eliminates the need for robust JSON parsing

// Tool-calling eliminates the need for JSON sanitization and extraction

export async function POST(req) {
  try {
    // Log request details for mobile debugging
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    console.log(`[INTENT] Request received - Mobile: ${isMobile}, User-Agent: ${userAgent.substring(0, 100)}`);
    
    const { prompt, target_tracks } = await req.json();
    
    console.log(`[INTENT] Parsed request - Prompt: "${prompt?.substring(0, 50)}...", Target: ${target_tracks}`);
    
    if (!prompt || typeof prompt !== 'string') {
      console.error(`[INTENT] Invalid prompt - Type: ${typeof prompt}, Value: ${prompt}`);
      return NextResponse.json(
        { error: "Prompt is required and must be a string" },
        { status: 422 }
      );
    }

    const targetSize = Math.max(1, Math.min(500, Number(target_tracks) || 50));
    
    // Detect mode and canonize for VIRAL/FESTIVAL
    const mode = detectMode(prompt);
    let canonizedData = null;
    
    // Detect if prompt is a single artist name
    const isSingleArtist = detectSingleArtist(prompt);
    if (isSingleArtist) {
      console.log(`[INTENT] SINGLE ARTIST detected: "${prompt}" - delegating to Spotify`);
    }
    
    // Detect artist style mode and extract reference artist
    let referenceArtist = null;
    if (mode === 'ARTIST_STYLE') {
      referenceArtist = extractReferenceArtist(prompt);
      console.log(`[INTENT] ARTIST_STYLE detected: "${prompt}" - reference artist: "${referenceArtist}"`);
    }
    
    if (mode === 'VIRAL' || mode === 'FESTIVAL') {
      canonizedData = await canonizePrompt(prompt);
      console.log(`[INTENT] Mode: ${mode}, Canonized:`, canonizedData);
    }

    // Get contexts brújula for the prompt
    const contexts = getContextsForPrompt(prompt);
    if (contexts) {
      console.log(`[CONTEXT] compass_used=true name=${contexts.key} keep_outside=${contexts.key !== 'underground_es'}`);
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is required for playlist generation" },
        { status: 500 }
      );
    }

    if (!MODEL) { 
      console.error('[INTENT] No model resolved'); 
      return NextResponse.json({ error: 'LLM model not configured' }, { status: 502 }); 
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        // Use the configured model directly
        let completion;
        let modelUsed = MODEL;

        try {
          console.log(`[INTENT] Attempting with model:`, MODEL);
          // Build user message with contexts
          let userMessage;
          
          // Detectar modo UNDERGROUND_STRICT
          const isUndergroundStrict = /underground/i.test(prompt);
          
          if (isUndergroundStrict && contexts && contexts.key === 'underground_es') {
            // Modo UNDERGROUND_STRICT - 100% restrictivo
            console.log(`[UNDERGROUND_STRICT] activated for prompt: "${prompt}"`);
            
            // Normalización con diacríticos
            const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
            const ALLOWED = new Set(contexts.compass.map(norm));
            
            console.log(`[UNDERGROUND_STRICT] allowed=${ALLOWED.size} keep_outside=true`);
            
            // Detectar si es modo restrictivo o inclusivo
            // PRIORIDAD: INCLUSIVE tiene precedencia sobre RESTRICTIVE
            const isInclusive = /\b(que tenga|incluir|con canciones de|que incluya|alguna canción de|que contenga|que tenga alguna|que incluya alguna|con alguna|que tenga canciones|que contenga canciones|que incluya canciones|con canciones|que tenga temas|que contenga temas|que incluya temas|con temas|que tenga música|que contenga música|que incluya música|con música|que tenga tracks|que contenga tracks|que incluya tracks|con tracks|que tenga temas de|que contenga temas de|que incluya temas de|con temas de|que tenga música de|que contenga música de|que incluya música de|con música de|que tenga tracks de|que contenga tracks de|que incluya tracks de|con tracks de|con|que tenga|que contenga|que incluya|incluir|con alguna|con canciones|con temas|con música|con tracks)\b/i.test(prompt);
            
            // Solo es restrictivo si NO es inclusivo y contiene palabras restrictivas específicas
            const isRestrictive = !isInclusive && /\b(solo|únicamente|exclusivamente|nada más|sólo|únicamente|exclusivamente|tan solo|solamente|nada más que|nada más de|solo de|únicamente de|exclusivamente de|tan solo de|solamente de|nada más que de|con solo|con únicamente|con exclusivamente|con nada más|con tan solo|con solamente)\b/i.test(prompt);
            
            const isExclusion = /\b(sin|sin canciones de|sin temas de|sin música de|sin tracks de|sin nada de|sin ningún|sin ninguna|sin ningún tema de|sin ninguna canción de|sin ningún track de|sin ninguna música de|sin ningún artista|sin ninguna artista|sin ningún cantante|sin ninguna cantante|sin ningún grupo|sin ninguna grupo|sin ningún grupo de|sin ninguna grupo de|sin ningún cantante de|sin ninguna cantante de|sin ningún artista de|sin ninguna artista de)\b/i.test(prompt);
            
            // Detectar si es restricción por artista específico (sin límite de canciones)
            const isArtistSpecific = isRestrictive && contexts.compass.some(artist => 
              new RegExp(`\\b${artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(prompt)
            );
            
            console.log(`[UNDERGROUND_STRICT] Mode detection: restrictive=${isRestrictive} inclusive=${isInclusive} artistSpecific=${isArtistSpecific}`);
            
            if (isRestrictive && isArtistSpecific) {
              // MODO RESTRICTIVO POR ARTISTA ESPECÍFICO (sin límite de canciones)
              userMessage = `UNDERGROUND_STRICT MODE - ARTIST SPECIFIC RESTRICTIVE

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks

ARTISTAS DISPONIBLES:
${contexts.compass.join(', ')}

INSTRUCCIONES RESTRICTIVAS POR ARTISTA:
1. El usuario quiere SOLO los artistas específicos mencionados en el prompt
2. IDENTIFICA qué artistas específicos menciona el usuario
3. DEVUELVE SOLO esos artistas específicos (sin añadir otros)
4. Si menciona "solo Yung Beef y Kaydy Cain", devuelve solo Yung Beef y Kaydy Cain
5. NO uses ningún otro artista diferente a los mencionados
6. IMPORTANTE: Para llegar a ${targetSize} tracks, cada artista puede tener hasta ${Math.ceil(targetSize/2)} canciones

RESPUESTA REQUERIDA:
Devuelve un JSON con "filtered_artists" conteniendo SOLO los artistas específicos mencionados.`;
            } else if (isRestrictive) {
              // MODO RESTRICTIVO: Solo los artistas mencionados
              userMessage = `UNDERGROUND_STRICT MODE - RESTRICTIVE

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks

ARTISTAS DISPONIBLES:
${contexts.compass.join(', ')}

INSTRUCCIONES RESTRICTIVAS:
1. El usuario quiere SOLO artistas específicos mencionados en el prompt
2. IDENTIFICA qué artistas específicos menciona el usuario
3. DEVUELVE SOLO esos artistas específicos (sin añadir otros)
4. Si menciona "Yung Beef y Kaydy Cain", devuelve solo esos dos
5. Si menciona "trap", devuelve solo los artistas trap de la lista

RESPUESTA REQUERIDA:
Devuelve un JSON con "filtered_artists" conteniendo SOLO los artistas específicos mencionados.`;
            } else if (isInclusive) {
              // MODO INCLUSIVO: Todos los artistas + prioridad especial
              userMessage = `UNDERGROUND_STRICT MODE - INCLUSIVE

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks

ARTISTAS DISPONIBLES:
${contexts.compass.join(', ')}

INSTRUCCIONES INCLUSIVAS:
1. El usuario quiere que INCLUYA artistas específicos (sin restringir otros)
2. IDENTIFICA qué artistas específicos menciona el usuario
3. DEVUELVE TODOS los artistas de la lista
4. AÑADE un campo "priority_artists" con los artistas mencionados específicamente
5. Estos artistas tendrán prioridad especial (más canciones - hasta 5 por artista)

RESPUESTA REQUERIDA:
Devuelve un JSON con:
- "filtered_artists": TODOS los artistas de la lista
- "priority_artists": Los artistas específicamente mencionados por el usuario`;
            } else {
              // MODO NORMAL: Filtrar por estilo
              userMessage = `UNDERGROUND_STRICT MODE - NORMAL FILTERING

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks

ARTISTAS DISPONIBLES (FILTRA SEGÚN EL PROMPT):
${contexts.compass.join(', ')}

INSTRUCCIONES:
1. ANALIZA el prompt del usuario para entender qué tipo de música quiere
2. ELIMINA de la lista anterior los artistas que NO encajen con el prompt
3. DEVUELVE SOLO los nombres de artistas que SÍ encajen (sin añadir ninguno nuevo)
4. Si el prompt es muy específico (ej. "trap", "reggaeton", "indie"), elimina los que no sean de ese estilo
5. Si el prompt es general ("underground español"), mantén la mayoría de artistas

RESPUESTA REQUERIDA:
Devuelve un JSON con el campo "filtered_artists" que contenga SOLO los nombres de artistas de la lista que encajen con el prompt. NO añadas artistas nuevos.`;
            }
            
            console.log(`[UNDERGROUND_STRICT] FINAL PROMPT LENGTH: ${userMessage.length} chars`);
            console.log(`[UNDERGROUND_STRICT] TOTAL ARTISTS IN PROMPT: ${contexts.compass.length}`);
            console.log(`[UNDERGROUND_STRICT] LAST 10 ARTISTS:`, contexts.compass.slice(-10).join(', '));
            console.log(`[UNDERGROUND_STRICT] PROMPT TO LLM (first 1000 chars):`, userMessage.substring(0, 1000) + '...');
          } else if (contexts && contexts.compass) {
            // Detectar modos para contextos normales también
            const isRestrictive = /\b(solo|únicamente|exclusivamente|nada más|sólo|únicamente|exclusivamente|tan solo|solamente|nada más que|nada más de|solo de|únicamente de|exclusivamente de|tan solo de|solamente de|nada más que de|con|con solo|con únicamente|con exclusivamente|con nada más|con tan solo|con solamente)\b/i.test(prompt);
            const isInclusive = /\b(que tenga|incluir|con canciones de|que incluya|alguna canción de|que contenga|que tenga alguna|que incluya alguna|con alguna|que tenga canciones|que contenga canciones|que incluya canciones|con canciones|que tenga temas|que contenga temas|que incluya temas|con temas|que tenga música|que contenga música|que incluya música|con música|que tenga tracks|que contenga tracks|que incluya tracks|con tracks|que tenga temas de|que contenga temas de|que incluya temas de|con temas de|que tenga música de|que contenga música de|que incluya música de|con música de|que tenga tracks de|que contenga tracks de|que incluya tracks de|con tracks de|con|que tenga|que contenga|que incluya|incluir|con alguna|con canciones|con temas|con música|con tracks)\b/i.test(prompt);
            const isExclusion = /\b(sin|sin canciones de|sin temas de|sin música de|sin tracks de|sin nada de|sin ningún|sin ninguna|sin ningún tema de|sin ninguna canción de|sin ningún track de|sin ninguna música de|sin ningún artista|sin ninguna artista|sin ningún cantante|sin ninguna cantante|sin ningún grupo|sin ninguna grupo|sin ningún grupo de|sin ninguna grupo de|sin ningún cantante de|sin ninguna cantante de|sin ningún artista de|sin ninguna artista de)\b/i.test(prompt);
            
            // Detectar si es restricción por artista específico (sin límite de canciones)
            const isArtistSpecific = isRestrictive && contexts.compass.some(artist => 
              new RegExp(`\\b${artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(prompt)
            );
            
            console.log(`[CONTEXT] Mode detection: restrictive=${isRestrictive} inclusive=${isInclusive} artistSpecific=${isArtistSpecific}`);
            
            if (isRestrictive && isArtistSpecific) {
              // MODO RESTRICTIVO POR ARTISTA ESPECÍFICO (sin límite de canciones)
              userMessage = `CONTEXT MODE - ARTIST SPECIFIC RESTRICTIVE

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks

ARTISTAS DISPONIBLES:
${contexts.compass.join(', ')}

INSTRUCCIONES RESTRICTIVAS POR ARTISTA:
1. El usuario quiere SOLO un artista específico mencionado en el prompt
2. IDENTIFICA qué artista específico menciona el usuario
3. GENERA canciones SOLO de ese artista específico (SIN LÍMITE de canciones)
4. Si menciona "solo Bad Bunny", genera ${targetSize} canciones SOLO de Bad Bunny
5. NO uses ningún otro artista diferente al mencionado

RESPUESTA REQUERIDA:
Devuelve un JSON con:
- "tracks": Array de ${targetSize} canciones SOLO del artista específico mencionado
- "artists": Array con SOLO el artista específico mencionado
- "restricted_artists": Array con el artista específico mencionado (para que Spotify sepa las restricciones)`;
            } else if (isRestrictive) {
              // MODO RESTRICTIVO POR CARACTERÍSTICAS (con límite de canciones)
              userMessage = `CONTEXT MODE - CHARACTERISTIC RESTRICTIVE

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks

ARTISTAS DISPONIBLES:
${contexts.compass.join(', ')}

INSTRUCCIONES RESTRICTIVAS POR CARACTERÍSTICAS:
1. El usuario quiere SOLO canciones con características específicas (ej. instrumental, solo chicas, etc.)
2. IDENTIFICA qué características específicas menciona el usuario
3. GENERA canciones SOLO con esas características (máx 3 por artista)
4. Si menciona "solo instrumental", genera solo canciones instrumentales
5. Si menciona "solo chicas", genera solo canciones de artistas femeninas

RESPUESTA REQUERIDA:
Devuelve un JSON con:
- "tracks": Array de canciones SOLO con las características específicas mencionadas
- "artists": Array con los artistas que cumplan las características
- "restricted_artists": Array con los artistas específicos mencionados (si los hay)`;
            } else if (isInclusive) {
              // MODO INCLUSIVO para contextos normales
              userMessage = `CONTEXT MODE - INCLUSIVE

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks

ARTISTAS DISPONIBLES:
${contexts.compass.join(', ')}

INSTRUCCIONES INCLUSIVAS:
1. El usuario quiere que INCLUYA artistas específicos (sin restringir otros)
2. IDENTIFICA qué artistas específicos menciona el usuario
3. GENERA canciones de TODOS los artistas de la lista
4. AÑADE un campo "priority_artists" con los artistas mencionados específicamente
5. Estos artistas tendrán prioridad especial (más canciones)

RESPUESTA REQUERIDA:
Devuelve un JSON con:
- "tracks": Array de canciones de todos los artistas
- "artists": Array con todos los artistas
- "priority_artists": Los artistas específicamente mencionados por el usuario`;
            } else {
              // MODO NORMAL para contextos
              userMessage = `Prompt: "${prompt}"\nTamaño solicitado: ${targetSize} tracks\n\nGenera ${Math.ceil(targetSize * 1.4)} canciones que encajen perfectamente con la petición. Usa solo canciones reales con título y artista específicos. Respeta TODAS las restricciones mencionadas (ej. instrumental, género, etc.).\n\nNUNCA uses comillas curvas; usa comillas dobles normales; no pongas comas finales.`;
              
              userMessage += `\n\nCONTEXTOS BRÚJULA (OBLIGATORIOS):\nUsa estos artistas como SEMILLAS OBLIGATORIAS y expande solo con sus colaboradores directos, artistas del mismo sello/crew, o vecinos estilísticos inequívocos:\n${contexts.compass.join(', ')}\n\nREGLAS DE CALIDAD ESTRICTAS:\n- Máx. 3 pistas por artista (2 si target < 40). NO spamees un solo nombre.\n- Solo artistas de los últimos 5-7 años dentro del COMPASS o su círculo cercano.\n- Desambiguación obligatoria: si un nombre es ambiguo, confirma con alias/crew/sello/ciudad.\n- Al menos 80% de temas deben ser COMPASS, colabos directas o vecinos claros.\n- 0% pop/comercial fuera de escena salvo que se pida explícitamente.\n- Si dudas sobre un artista, DESCÁRTALO.\n- Devuelve EXACTAMENTE ${targetSize} pistas válidas.`;
            }
          } else if (isSingleArtist) {
            // MODO ARTISTA ESPECÍFICO - delegar completamente a Spotify
            userMessage = `SINGLE ARTIST MODE - DELEGATE TO SPOTIFY

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks

INSTRUCCIONES ESPECIALES:
1. El usuario quiere ÚNICAMENTE canciones de "${prompt}"
2. NO generes canciones con LLM - delega completamente a Spotify
3. Envía el artista "${prompt}" a Spotify para búsqueda directa
4. Permite hasta 999 canciones de este artista
5. Spotify buscará directamente las mejores canciones de este artista

RESPUESTA REQUERIDA:
Devuelve un JSON con:
- "mode": "ARTIST_STYLE"
- "tracks": Array vacío (delegar a Spotify)
- "artists": ["${prompt}"] (solo este artista)
- "filtered_artists": ["${prompt}"] (artista específico)
- "priority_artists": ["${prompt}"] (artista prioritario)`;
          } else if (mode === 'ARTIST_STYLE' && referenceArtist) {
            // MODO ESTILO DE ARTISTA - buscar artista de referencia y similares
            userMessage = `ARTIST STYLE MODE - FIND SIMILAR ARTISTS

PROMPT: "${prompt}"
TARGET: ${targetSize} tracks
REFERENCE ARTIST: "${referenceArtist}"

INSTRUCCIONES ESPECIALES:
1. El usuario quiere canciones del estilo de "${referenceArtist}"
2. Busca "${referenceArtist}" como artista prioritario (priority_artists)
3. Encuentra artistas similares en el mismo nicho/estilo
4. Genera canciones de "${referenceArtist}" y artistas similares
5. Spotify también rellenará con radios de canciones similares

RESPUESTA REQUERIDA:
Devuelve un JSON con:
- "mode": "ARTIST_STYLE"
- "tracks": Array de canciones del estilo de "${referenceArtist}"
- "artists": Array con "${referenceArtist}" y artistas similares
- "priority_artists": ["${referenceArtist}"] (artista de referencia prioritario)
- "filtered_artists": Array con "${referenceArtist}" y artistas similares`;
          } else {
            userMessage = `Prompt: "${prompt}"\nTamaño solicitado: ${targetSize} tracks\n\nGenera ${Math.ceil(targetSize * 1.4)} canciones que encajen perfectamente con la petición. Usa solo canciones reales con título y artista específicos. Respeta TODAS las restricciones mencionadas (ej. instrumental, género, etc.).\n\nNUNCA uses comillas curvas; usa comillas dobles normales; no pongas comas finales.`;
          }

          completion = await openai.chat.completions.create({
            model: MODEL,
          messages: [
              { role: "system", content: "Devuelve exclusivamente una llamada a la función emit_intent con argumentos válidos. No incluyas markdown, texto ni explicaciones." },
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
                        banned_artists: { type: "array", items: { type: "string" } },
                        banned_terms: { type: "array", items: { type: "string" } }
                      }
                    }
                  },
                  required: ["mode","llmShare","tracks","artists"]
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "emit_intent" } },
            temperature: 0.2,
              max_tokens: 3000
        });
        } catch (modelError) {
          console.warn(`[INTENT] Model ${MODEL} failed:`, modelError.message);
          throw modelError;
        }

        // Parse tool call response
        const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
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
        
        // Manejar restricted_artists para modo RESTRICTIVE (contextos normales)
        if (!isUndergroundStrict && intent.restricted_artists && Array.isArray(intent.restricted_artists)) {
          console.log(`[CONTEXT] LLM restricted artists: ${intent.restricted_artists.length}`);
          console.log(`[CONTEXT] Restricted artists:`, intent.restricted_artists.join(', '));
          
          // Validar que todos los artistas restringidos estén en la lista original
          const originalSet = new Set(contexts.compass.map(normalizeArtistName));
          const validRestricted = intent.restricted_artists.filter(artist => 
            originalSet.has(normalizeArtistName(artist))
          );
          
          if (validRestricted.length !== intent.restricted_artists.length) {
            console.warn(`[CONTEXT] Some restricted artists were not in original list, using valid ones only`);
          }
          
          intent.restricted_artists = validRestricted;
        }

        // CRITICAL: Ensure exact track count
        const currentTracks = intent.tracks.length;
        if (currentTracks < targetSize) {
          console.log(`[INTENT] Only ${currentTracks}/${targetSize} tracks, need to fill ${targetSize - currentTracks} more`);
          
          // If we have fewer tracks than needed, we'll let the main route handle filling
          // by adjusting the llmShare proportionally
          intent.llmShare = Math.min(intent.llmShare, currentTracks / targetSize);
          console.log(`[INTENT] Adjusted llmShare to ${intent.llmShare} based on available tracks`);
        } else if (currentTracks > targetSize) {
          // Trim excess tracks
          intent.tracks = intent.tracks.slice(0, targetSize);
          console.log(`[INTENT] Trimmed tracks to exact target: ${targetSize}`);
        }

        // Set default strategy and hint
        if (!intent.spotifyStrategy) {
          intent.spotifyStrategy = "genre_focused";
        }
        if (!intent.spotifyHint) {
          intent.spotifyHint = `Busca música que encaje con: ${prompt}`;
        }

        // Extract unique artists from tracks
        const uniqueArtists = new Set();
        intent.tracks.forEach(track => {
          if (track.artist) {
            uniqueArtists.add(track.artist);
          }
        });
        intent.artists = Array.from(uniqueArtists);

        // --- EXCLUSIONES DESDE EL PROMPT (ES/EN) ---
        function parseExclusions(text){
          const s = (text||'').toLowerCase();
          // patrones: sin X, excluye X, excepto X, without X, exclude X, except X
          const re = /(sin|excluye|excepto|without|exclude|except)\s+([^.;\n]+)/gi;
          const artists = new Set();
          const terms = new Set();
          let m;
          while ((m = re.exec(s))) {
            const list = m[2]
              .replace(/["""']/g,'')
              .split(/,| y | and /i)
              .map(t=>t.trim())
              .filter(Boolean);
            list.forEach(item=>{
              // heurística: si parece nombre propio/artista (tiene espacio o mayúsculas originales),
              // guárdalo como artista; si es genérico, como término.
              if (/^[a-z0-9 .,'áéíóúñü-]+$/i.test(item)) {
                // Asumimos artista por defecto; términos comunes a 'terms'
                if (item.split(' ').length >= 1) artists.add(item);
              } else {
                terms.add(item);
              }
            });
          }
          return {
            banned_artists: Array.from(artists),
            banned_terms: Array.from(terms),
          };
        }

        const _ex = parseExclusions(prompt);
        intent.exclusions = {
          banned_artists: _ex.banned_artists,
          banned_terms: _ex.banned_terms,
        };

        console.log(`[INTENT] Generated ${intent.tracks.length} tracks, ${intent.artists.length} artists using ${MODEL}`);

        return NextResponse.json({
          ...intent,
          tracks_llm: intent.tracks, // Backward compatibility
          artists_llm: intent.artists, // Backward compatibility
          source: 'openai',
          model: MODEL,
          mode: mode,
          canonized: canonizedData,
          contexts: contexts // Pasar contextos al pipeline de playlist
        });

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
 * Detect the mode of the prompt
 */
function detectMode(prompt) {
  const promptLower = prompt.toLowerCase();
  
  // Check for viral/current mode
  const viralKeywords = ['tiktok', 'viral', 'virales', 'top', 'charts', 'tendencia', 'tendencias', '2024', '2025'];
  if (viralKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'VIRAL';
  }
  
  // Check for festival mode
  const festivalKeywords = ['festival', 'festivales', 'coachella', 'ultra', 'tomorrowland', 'edc'];
  if (festivalKeywords.some(keyword => promptLower.includes(keyword))) {
    return 'FESTIVAL';
  }
  
  // Check for artist style mode (contains "como" or "like" but not exclusion)
  const artistStyleKeywords = ['como', 'like', 'estilo de', 'similar a', 'parecido a', 'tipo de'];
  const hasArtistStyleKeyword = artistStyleKeywords.some(keyword => promptLower.includes(keyword));
  const hasExclusionKeyword = promptLower.includes('sin');
  
  if (hasArtistStyleKeyword && !hasExclusionKeyword) {
    return 'ARTIST_STYLE';
  }
  
  return 'NORMAL';
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
 * Extract reference artist from artist style prompt
 */
function extractReferenceArtist(prompt) {
  const promptLower = prompt.toLowerCase();
  
  // Patterns to match artist names after style keywords
  const patterns = [
    /como\s+([^,.\n]+)/i,
    /like\s+([^,.\n]+)/i,
    /estilo\s+de\s+([^,.\n]+)/i,
    /similar\s+a\s+([^,.\n]+)/i,
    /parecido\s+a\s+([^,.\n]+)/i,
    /tipo\s+de\s+([^,.\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      const artist = match[1].trim();
      // Clean up common words that might be included
      const cleanedArtist = artist
        .replace(/\b(playlist|música|canciones|tracks|songs|mix|compilation)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanedArtist.length > 0) {
        return cleanedArtist;
      }
    }
  }
  
  return null;
}