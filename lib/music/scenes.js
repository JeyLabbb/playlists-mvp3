// FIXPACK: Biblioteca de escenas musicales para mapear prompts semánticos a features de audio
// Evita inyección directa de artistas de contextos cuando no son mencionados explícitamente

// FIXPACK: Escenas musicales predefinidas basadas en semántica, no en artistas específicos
export const MUSICAL_SCENES = [
  {
    name: 'nocturno_lluvia',
    keywords: ['nocturno', 'lluvia', 'rain', 'night', 'noche', 'oscuro', 'melancólico'],
    features: {
      tempo: { min: 60, max: 100 },
      energy: { min: 0.2, max: 0.6 },
      valence: { min: 0.1, max: 0.4 },
      acousticness: { min: 0.3, max: 0.9 },
      danceability: { min: 0.2, max: 0.6 },
      instrumentalness: { min: 0.3, max: 1.0 }
    },
    genres: ['ambient', 'downtempo', 'trip-hop', 'synthwave', 'lofi', 'chill']
  },
  {
    name: 'trabajo_oficina',
    keywords: ['trabajo', 'oficina', 'work', 'office', 'productivo', 'concentración'],
    features: {
      tempo: { min: 80, max: 120 },
      energy: { min: 0.3, max: 0.7 },
      valence: { min: 0.4, max: 0.8 },
      acousticness: { min: 0.2, max: 0.8 },
      danceability: { min: 0.3, max: 0.7 }
    },
    genres: ['instrumental', 'jazz', 'lofi', 'ambient', 'classical', 'electronic']
  },
  {
    name: 'fiesta_energética',
    keywords: ['fiesta', 'party', 'energético', 'bailable', 'dance', 'club'],
    features: {
      tempo: { min: 120, max: 140 },
      energy: { min: 0.7, max: 1.0 },
      valence: { min: 0.6, max: 1.0 },
      acousticness: { min: 0.0, max: 0.3 },
      danceability: { min: 0.7, max: 1.0 }
    },
    genres: ['electronic', 'house', 'techno', 'pop', 'dance', 'edm']
  },
  {
    name: 'relajación_meditación',
    keywords: ['relajación', 'meditación', 'relax', 'meditation', 'calma', 'tranquilo'],
    features: {
      tempo: { min: 40, max: 80 },
      energy: { min: 0.1, max: 0.4 },
      valence: { min: 0.2, max: 0.6 },
      acousticness: { min: 0.5, max: 1.0 },
      danceability: { min: 0.1, max: 0.4 }
    },
    genres: ['ambient', 'classical', 'new-age', 'meditation', 'nature', 'spa']
  },
  {
    name: 'ejercicio_cardio',
    keywords: ['ejercicio', 'cardio', 'running', 'correr', 'gym', 'fitness'],
    features: {
      tempo: { min: 120, max: 160 },
      energy: { min: 0.6, max: 1.0 },
      valence: { min: 0.5, max: 1.0 },
      acousticness: { min: 0.0, max: 0.4 },
      danceability: { min: 0.6, max: 1.0 }
    },
    genres: ['pop', 'rock', 'electronic', 'hip-hop', 'dance', 'fitness']
  }
];

// FIXPACK: Función para detectar escena musical basada en prompt
export function detectMusicalScene(prompt) {
  const promptLower = prompt.toLowerCase();
  
  for (const scene of MUSICAL_SCENES) {
    const matchCount = scene.keywords.filter(keyword => 
      promptLower.includes(keyword)
    ).length;
    
    if (matchCount >= 1) {
      return scene;
    }
  }
  
  return null;
}

// FIXPACK: Función para obtener features objetivo basadas en escena
export function getTargetFeaturesFromScene(scene) {
  const features = {};
  
  Object.entries(scene.features).forEach(([key, range]) => {
    if (key !== 'instrumentalness') {
      features[key] = (range.min + range.max) / 2;
    }
  });
  
  return features;
}

// FIXPACK: Función para filtrar tracks basándose en features de escena
export function filterTracksByScene(tracks, scene) {
  return tracks.filter(track => {
    if (!track.audio_features) return false;
    
    const features = track.audio_features;
    const sceneFeatures = scene.features;
    
    // Verificar cada feature
    for (const [key, range] of Object.entries(sceneFeatures)) {
      if (key === 'instrumentalness' && range.min !== undefined) {
        if (features.instrumentalness < range.min || features.instrumentalness > range.max) {
          return false;
        }
      } else if (key !== 'instrumentalness') {
        const value = features[key];
        if (value < range.min || value > range.max) {
          return false;
        }
      }
    }
    
    return true;
  });
}

// FIXPACK: Función para limpiar spotifyHint eliminando frases meta
export function cleanSpotifyHint(hint) {
  if (!hint) return '';
  
  // FIXPACK: Eliminar frases meta comunes
  const metaPhrases = [
    'instrucciones específicas',
    'selecciona tracks',
    'buscar tracks',
    'generar playlist',
    'crear playlist',
    'focus on',
    'select tracks',
    'generate playlist'
  ];
  
  let cleaned = hint;
  metaPhrases.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // FIXPACK: Limpiar espacios múltiples y caracteres especiales
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // FIXPACK: Si queda vacío, usar fallback genérico
  if (!cleaned) {
    return 'popular music';
  }
  
  return cleaned;
}
