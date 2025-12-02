/**
 * PLEIA Agent Tools Definition
 * 
 * Este archivo define todas las herramientas disponibles para el agente de generación de playlists.
 * El LLM conocerá estas herramientas y podrá combinarlas para crear playlists complejas.
 */

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  items?: { type: string }; // Para arrays
  enum?: string[]; // Valores permitidos
}

export interface AgentTool {
  name: string;
  description: string;
  when_to_use: string;
  examples: string[];
  parameters: Record<string, ToolParameter>;
}

export const AGENT_TOOLS: AgentTool[] = [
  // ═══════════════════════════════════════════════════════════════
  // HERRAMIENTA 1: Buscar tracks de un artista específico
  // ═══════════════════════════════════════════════════════════════
  {
    name: "get_artist_tracks",
    description: "Obtiene tracks de un artista específico, incluyendo su discografía y opcionalmente colaboraciones.",
    when_to_use: "Cuando el usuario pide canciones DE un artista específico, por nombre. Ej: 'canciones de Bad Bunny', 'playlist de Quevedo'.",
    examples: [
      "Para 'canciones de Rosalía' → get_artist_tracks(artist='Rosalía', limit=20)",
      "Para 'solo temas de Quevedo, nada más' → get_artist_tracks(artist='Quevedo', limit=50, include_collaborations=false)",
      "Para 'todo lo de Bad Bunny incluyendo feats' → get_artist_tracks(artist='Bad Bunny', limit=30, include_collaborations=true)"
    ],
    parameters: {
      artist: {
        type: 'string',
        description: 'Nombre exacto del artista',
        required: true
      },
      limit: {
        type: 'number',
        description: 'Máximo de tracks a obtener (cap por artista)',
        default: 15
      },
      include_collaborations: {
        type: 'boolean',
        description: 'Si incluir tracks donde el artista colabora con otros',
        default: true
      },
      only_popular: {
        type: 'boolean',
        description: 'Si solo traer los tracks más populares (top tracks)',
        default: false
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // HERRAMIENTA 2: Buscar colaboraciones específicas
  // ═══════════════════════════════════════════════════════════════
  {
    name: "get_collaborations",
    description: "Obtiene SOLO tracks donde un artista colabora con otros artistas específicos. Filtra por colaboraciones exactas.",
    when_to_use: "Cuando el usuario especifica condiciones de colaboración. Ej: 'Juseph solo si colabora con Quevedo', 'temas de X con Y'.",
    examples: [
      "Para 'Juseph solo si colabora con Quevedo o La Pantera' → get_collaborations(main_artist='Juseph', must_collaborate_with=['Quevedo', 'La Pantera'])",
      "Para 'canciones donde Bad Bunny y J Balvin estén juntos' → get_collaborations(main_artist='Bad Bunny', must_collaborate_with=['J Balvin'])",
      "Para 'feats de Rosalía con artistas españoles' → get_collaborations(main_artist='Rosalía', must_collaborate_with=['C. Tangana', 'Rauw Alejandro', 'J Balvin'])"
    ],
    parameters: {
      main_artist: {
        type: 'string',
        description: 'Artista principal cuyas colaboraciones buscar',
        required: true
      },
      must_collaborate_with: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista de artistas con los que DEBE colaborar (al menos uno)',
        required: true
      },
      limit: {
        type: 'number',
        description: 'Máximo de colaboraciones a obtener',
        default: 10
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // HERRAMIENTA 3: Artistas similares / Radio
  // ═══════════════════════════════════════════════════════════════
  {
    name: "get_similar_style",
    description: "Obtiene tracks de artistas SIMILARES a uno o varios artistas semilla. Usa el algoritmo de radio de Spotify.",
    when_to_use: "Cuando el usuario dice 'tipo X', 'estilo de X', 'parecido a X', 'como X pero no X'. También para expandir con variedad.",
    examples: [
      "Para 'música tipo Swans y Giles Corey' → get_similar_style(seed_artists=['Swans', 'Giles Corey'], limit=30)",
      "Para 'estilo de The Weeknd' → get_similar_style(seed_artists=['The Weeknd'], limit=20)",
      "Para 'parecido a Radiohead pero más experimental' → get_similar_style(seed_artists=['Radiohead'], style_modifier='experimental', limit=25)"
    ],
    parameters: {
      seed_artists: {
        type: 'array',
        items: { type: 'string' },
        description: 'Artistas semilla para encontrar similares',
        required: true
      },
      limit: {
        type: 'number',
        description: 'Máximo de tracks similares',
        default: 20
      },
      include_seed_artists: {
        type: 'boolean',
        description: 'Si incluir también tracks de los artistas semilla',
        default: false
      },
      style_modifier: {
        type: 'string',
        description: 'Modificador de estilo (experimental, oscuro, alegre, etc.)',
        required: false
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // HERRAMIENTA 4: Generación creativa por el LLM
  // ═══════════════════════════════════════════════════════════════
  {
    name: "generate_creative_tracks",
    description: "El LLM genera una lista de tracks reales que encajan con criterios abstractos, emocionales o creativos.",
    when_to_use: "Para prompts abstractos, emocionales, temáticos, referencias culturales. Ej: 'música triste', 'inspirado en David Lynch', 'para un día lluvioso'.",
    examples: [
      "Para 'música triste y melancólica nicho' → generate_creative_tracks(mood='triste, melancólico', genre='post-rock, slowcore, ambient', count=40)",
      "Para 'inspirado en David Lynch' → generate_creative_tracks(theme='David Lynch, cinematográfico, surrealista, oscuro', genre='dark ambient, dream pop, noir', count=35)",
      "Para 'música para estudiar concentrado' → generate_creative_tracks(mood='concentración, calma', genre='lo-fi, ambient, classical minimal', count=50)"
    ],
    parameters: {
      mood: {
        type: 'string',
        description: 'Estados emocionales/atmósfera deseada',
        required: false
      },
      theme: {
        type: 'string',
        description: 'Tema, referencia cultural, película, concepto abstracto',
        required: false
      },
      genre: {
        type: 'string',
        description: 'Géneros musicales relevantes',
        required: false
      },
      era: {
        type: 'string',
        description: 'Época temporal (80s, 90s, 2020s, etc.)',
        required: false
      },
      count: {
        type: 'number',
        description: 'Cantidad de tracks a generar',
        default: 30
      },
      artists_to_include: {
        type: 'array',
        items: { type: 'string' },
        description: 'Artistas que definitivamente deben aparecer',
        required: false
      },
      artists_to_exclude: {
        type: 'array',
        items: { type: 'string' },
        description: 'Artistas a evitar',
        required: false
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // HERRAMIENTA 5: Buscar en playlists existentes
  // ═══════════════════════════════════════════════════════════════
  {
    name: "search_playlists",
    description: "Busca y extrae tracks de playlists existentes en Spotify que coincidan con una query.",
    when_to_use: "Para festivales, eventos específicos, compilaciones conocidas, tendencias/virales.",
    examples: [
      "Para 'canciones del Primavera Sound 2024' → search_playlists(query='Primavera Sound 2024', limit_playlists=5, tracks_per_playlist=20)",
      "Para 'virales de TikTok 2024' → search_playlists(query='TikTok viral 2024', limit_playlists=3, tracks_per_playlist=30)",
      "Para 'indie español actual' → search_playlists(query='indie español 2024', limit_playlists=4, tracks_per_playlist=15)"
    ],
    parameters: {
      query: {
        type: 'string',
        description: 'Término de búsqueda para playlists',
        required: true
      },
      limit_playlists: {
        type: 'number',
        description: 'Máximo de playlists a buscar',
        default: 5
      },
      tracks_per_playlist: {
        type: 'number',
        description: 'Tracks a extraer de cada playlist',
        default: 15
      },
      min_consensus: {
        type: 'number',
        description: 'Mínimo de playlists donde debe aparecer un track (para consenso)',
        default: 1
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // HERRAMIENTA 6: Filtrado y ajuste de caps
  // ═══════════════════════════════════════════════════════════════
  {
    name: "adjust_distribution",
    description: "Ajusta la distribución final de tracks: caps por artista, deduplicación, orden, variedad.",
    when_to_use: "SIEMPRE usar al final para ajustar la distribución. Especialmente cuando el usuario pide variedad o límites específicos.",
    examples: [
      "Para 'que no haya más de 3 canciones de cada artista' → adjust_distribution(max_per_artist=3)",
      "Para 'variado, que no se repitan artistas seguidos' → adjust_distribution(shuffle=true, avoid_consecutive_same_artist=true)",
      "Para 'priorizar los artistas principales' → adjust_distribution(priority_artists=['Quevedo', 'Bad Bunny'], priority_cap=10, others_cap=3)"
    ],
    parameters: {
      max_per_artist: {
        type: 'number',
        description: 'Máximo global de tracks por artista',
        required: false
      },
      priority_artists: {
        type: 'array',
        items: { type: 'string' },
        description: 'Artistas con cap más alto',
        required: false
      },
      priority_cap: {
        type: 'number',
        description: 'Cap para artistas prioritarios',
        default: 10
      },
      others_cap: {
        type: 'number',
        description: 'Cap para artistas no prioritarios',
        default: 3
      },
      shuffle: {
        type: 'boolean',
        description: 'Mezclar el orden final',
        default: true
      },
      avoid_consecutive_same_artist: {
        type: 'boolean',
        description: 'Evitar que el mismo artista aparezca dos veces seguidas',
        default: true
      },
      total_target: {
        type: 'number',
        description: 'Total de tracks objetivo final',
        required: true
      }
    }
  }
];

// ═══════════════════════════════════════════════════════════════
// Generar el prompt del sistema para el LLM
// ═══════════════════════════════════════════════════════════════

export function generateAgentSystemPrompt(): string {
  const toolDescriptions = AGENT_TOOLS.map(tool => {
    const paramsDesc = Object.entries(tool.parameters)
      .map(([name, param]) => {
        const required = param.required ? ' (REQUERIDO)' : ` (opcional, default: ${param.default ?? 'null'})`;
        return `    - ${name}: ${param.type}${required} - ${param.description}`;
      })
      .join('\n');
    
    return `
### ${tool.name}
**Descripción**: ${tool.description}
**Cuándo usar**: ${tool.when_to_use}
**Ejemplos**:
${tool.examples.map(ex => `  - ${ex}`).join('\n')}
**Parámetros**:
${paramsDesc}
`;
  }).join('\n');

  return `Eres PLEIA Agent, un agente inteligente que genera playlists personalizadas. Tu trabajo es:

1. ANALIZAR el prompt del usuario
2. CREAR un plan de ejecución usando las herramientas disponibles
3. EXPLICAR tu razonamiento de forma natural

═══════════════════════════════════════════════════════════════
HERRAMIENTAS DISPONIBLES (máximo 5-6 por request)
═══════════════════════════════════════════════════════════════
${toolDescriptions}

═══════════════════════════════════════════════════════════════
REGLAS IMPORTANTES
═══════════════════════════════════════════════════════════════

1. **SIEMPRE genera un plan de ejecución** con las herramientas necesarias
2. **SIEMPRE incluye adjust_distribution** al final para ajustar caps y variedad
3. **Máximo 5-6 herramientas** por request (combínalas inteligentemente)
4. **Los caps deben sumar aproximadamente el total pedido** (considera que habrá duplicados)
5. **Para prompts con artistas específicos**: usa get_artist_tracks y/o get_collaborations
6. **Para prompts creativos/abstractos**: usa generate_creative_tracks
7. **Para "tipo X" o "estilo de X"**: usa get_similar_style
8. **Para festivales/virales**: usa search_playlists

═══════════════════════════════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════════════════════════════

Responde ÚNICAMENTE con una llamada a la función emit_plan con este formato JSON:

emit_plan({
  "thinking": [
    "Paso 1: Analizo el prompt...",
    "Paso 2: Voy a buscar tracks de X...",
    "Paso 3: También necesito colaboraciones de Y con Z...",
    "Paso 4: Ajusto la distribución para variedad..."
  ],
  "execution_plan": [
    {
      "tool": "nombre_herramienta",
      "params": { ... },
      "reason": "Breve explicación de por qué uso esta herramienta"
    },
    ...
  ],
  "total_target": 50
})

El campo "thinking" son los pensamientos que se mostrarán al usuario mientras genera.
El campo "execution_plan" son las herramientas a ejecutar en orden.
El campo "total_target" es el número total de tracks solicitado.

═══════════════════════════════════════════════════════════════
EJEMPLOS COMPLETOS
═══════════════════════════════════════════════════════════════

**Prompt**: "playlist de artistas canarios, solo de la pantera, lucho rk, Quevedo y Juseph, Juseph solo si es en colaboración con los artistas ya mencionados"

emit_plan({
  "thinking": [
    "Voy a buscar canciones de La Pantera, Lucho RK y Quevedo...",
    "Para Juseph, el usuario especifica que solo quiere colaboraciones con los otros artistas mencionados...",
    "Voy a ajustar los límites para que haya variedad entre los cuatro artistas..."
  ],
  "execution_plan": [
    {
      "tool": "get_artist_tracks",
      "params": { "artist": "La Pantera", "limit": 15, "include_collaborations": true },
      "reason": "Busco tracks de La Pantera incluyendo colaboraciones"
    },
    {
      "tool": "get_artist_tracks",
      "params": { "artist": "Lucho RK", "limit": 15, "include_collaborations": true },
      "reason": "Busco tracks de Lucho RK"
    },
    {
      "tool": "get_artist_tracks",
      "params": { "artist": "Quevedo", "limit": 15, "include_collaborations": true },
      "reason": "Busco tracks de Quevedo"
    },
    {
      "tool": "get_collaborations",
      "params": { "main_artist": "Juseph", "must_collaborate_with": ["La Pantera", "Lucho RK", "Quevedo"], "limit": 10 },
      "reason": "Solo colaboraciones de Juseph con los artistas mencionados"
    },
    {
      "tool": "adjust_distribution",
      "params": { "max_per_artist": 12, "shuffle": true, "avoid_consecutive_same_artist": true, "total_target": 50 },
      "reason": "Equilibro la distribución para variedad"
    }
  ],
  "total_target": 50
})

**Prompt**: "Playlist inspirada en David Lynch, Elephant Man, triste, nicho, tipo Swans, Giles Corey"

emit_plan({
  "thinking": [
    "El usuario quiere música inspirada en el universo de David Lynch y la película Elephant Man...",
    "Menciona Swans y Giles Corey como referencia de estilo - música oscura, experimental, melancólica...",
    "Voy a combinar generación creativa con artistas similares a Swans y Giles Corey..."
  ],
  "execution_plan": [
    {
      "tool": "generate_creative_tracks",
      "params": { 
        "theme": "David Lynch, Elephant Man, cinematográfico, surrealista, melancólico",
        "mood": "triste, oscuro, introspectivo, nicho",
        "genre": "post-rock, doom, slowcore, dark ambient, experimental",
        "count": 30,
        "artists_to_include": ["Swans", "Giles Corey", "Have a Nice Life"]
      },
      "reason": "Genero tracks que capturen la atmósfera Lynch + referencias"
    },
    {
      "tool": "get_similar_style",
      "params": { "seed_artists": ["Swans", "Giles Corey"], "limit": 25, "include_seed_artists": true },
      "reason": "Busco artistas similares a las referencias mencionadas"
    },
    {
      "tool": "adjust_distribution",
      "params": { "max_per_artist": 4, "shuffle": true, "avoid_consecutive_same_artist": true, "total_target": 50 },
      "reason": "Variedad en la distribución final"
    }
  ],
  "total_target": 50
})
`;
}

// Tipos para el plan de ejecución
export interface ToolCall {
  tool: string;
  params: Record<string, any>;
  reason: string;
}

export interface ExecutionPlan {
  thinking: string[];
  execution_plan: ToolCall[];
  total_target: number;
}

