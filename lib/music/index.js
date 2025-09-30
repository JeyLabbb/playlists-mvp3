/**
 * Music helper library with canonical seeds, scoring, and audio features
 */

// Canonical seeds by activity
export const CANONICAL_SEEDS = {
  estudiar: {
    artistas: ["Nujabes", "J Dilla", "Bonobo", "Tycho", "Emancipator"],
    canciones: ["Luv(sic) Part 3", "Donuts", "Kong", "A Walk", "Soon It Will Be Cold Enough"],
    generos: ["lofi", "ambient", "jazz", "chill"]
  },
  correr: {
    artistas: ["The Weeknd", "Dua Lipa", "Calvin Harris", "Martin Garrix", "Avicii"],
    canciones: ["Blinding Lights", "Levitating", "One Kiss", "Animals", "Wake Me Up"],
    generos: ["pop", "dance", "electronic", "edm"]
  },
  fiesta: {
    artistas: ["Bad Bunny", "J Balvin", "Maluma", "Ozuna", "Karol G"],
    canciones: ["Dakiti", "Mi Gente", "Hawái", "Caramelo", "Tusa"],
    generos: ["reggaeton", "latin", "pop", "dance"]
  },
  cena: {
    artistas: ["Norah Jones", "John Mayer", "Adele", "Ed Sheeran", "Billie Eilish"],
    canciones: ["Don't Know Why", "Gravity", "Hello", "Perfect", "Lovely"],
    generos: ["pop", "acoustic", "soul", "indie"]
  },
  focus: {
    artistas: ["Ludovico Einaudi", "Max Richter", "Ólafur Arnalds", "Nils Frahm", "Hania Rani"],
    canciones: ["Nuvole Bianche", "On The Nature of Daylight", "Near Light", "Says", "Esja"],
    generos: ["classical", "ambient", "piano", "minimal"]
  }
};

// Word to audio features mapping
export const WORD_TO_FEATURES = {
  // Energy mappings
  "suave": { energy: { min: 0.2, max: 0.4, target: 0.3 } },
  "chill": { energy: { min: 0.2, max: 0.4, target: 0.3 } },
  "relajado": { energy: { min: 0.2, max: 0.4, target: 0.3 } },
  "épico": { energy: { min: 0.7, max: 0.9, target: 0.8 } },
  "energético": { energy: { min: 0.7, max: 0.9, target: 0.8 } },
  "power": { energy: { min: 0.7, max: 0.9, target: 0.8 } },
  "intenso": { energy: { min: 0.6, max: 0.9, target: 0.75 } },
  
  // Valence mappings
  "oscuro": { valence: { min: 0.1, max: 0.4, target: 0.25 } },
  "melancólico": { valence: { min: 0.1, max: 0.4, target: 0.25 } },
  "triste": { valence: { min: 0.1, max: 0.4, target: 0.25 } },
  "alegre": { valence: { min: 0.6, max: 0.9, target: 0.75 } },
  "feliz": { valence: { min: 0.6, max: 0.9, target: 0.75 } },
  "positivo": { valence: { min: 0.6, max: 0.9, target: 0.75 } },
  
  // Acousticness mappings
  "acústico": { acousticness: { min: 0.7, max: 1.0, target: 0.85 } },
  "instrumental": { acousticness: { min: 0.7, max: 1.0, target: 0.85 } },
  "orgánico": { acousticness: { min: 0.6, max: 0.9, target: 0.75 } },
  "electrónico": { acousticness: { min: 0.1, max: 0.4, target: 0.25 } },
  "sintético": { acousticness: { min: 0.1, max: 0.3, target: 0.2 } },
  
  // Danceability mappings
  "bailable": { danceability: { min: 0.7, max: 0.9, target: 0.8 } },
  "dance": { danceability: { min: 0.7, max: 0.9, target: 0.8 } },
  "baile": { danceability: { min: 0.7, max: 0.9, target: 0.8 } },
  "fiesta": { danceability: { min: 0.7, max: 0.9, target: 0.8 } },
  "party": { danceability: { min: 0.7, max: 0.9, target: 0.8 } }
};

// Tempo mappings
export const TEMPO_MAPPINGS = {
  "lento": { min: 60, max: 80, target: 70 },
  "moderado": { min: 80, max: 120, target: 100 },
  "rápido": { min: 120, max: 160, target: 140 },
  "muy rápido": { min: 160, max: 200, target: 180 },
  "ultra rápido": { min: 180, max: 220, target: 200 }
};

/**
 * Calculate similarity score between track features and target features
 */
export function calculateFeatureScore(trackFeatures, targetFeatures, weights = {}) {
  const defaultWeights = {
    tempo: 0.3,
    energy: 0.25,
    valence: 0.2,
    acousticness: 0.15,
    danceability: 0.1
  };
  
  const w = { ...defaultWeights, ...weights };
  
  let score = 0;
  let totalWeight = 0;
  
  // Tempo score (normalized to 0-1)
  if (trackFeatures.tempo && targetFeatures.tempo_bpm) {
    const tempoDiff = Math.abs(trackFeatures.tempo - targetFeatures.tempo_bpm.target);
    const tempoScore = Math.max(0, 1 - (tempoDiff / 150)); // 150 BPM tolerance (more lenient)
    score += tempoScore * w.tempo;
    totalWeight += w.tempo;
  }
  
  // Energy score
  if (trackFeatures.energy !== undefined && targetFeatures.energy) {
    const energyScore = calculateRangeScore(
      trackFeatures.energy, 
      targetFeatures.energy.min, 
      targetFeatures.energy.max, 
      targetFeatures.energy.target
    );
    score += energyScore * w.energy;
    totalWeight += w.energy;
  }
  
  // Valence score
  if (trackFeatures.valence !== undefined && targetFeatures.valence) {
    const valenceScore = calculateRangeScore(
      trackFeatures.valence, 
      targetFeatures.valence.min, 
      targetFeatures.valence.max, 
      targetFeatures.valence.target
    );
    score += valenceScore * w.valence;
    totalWeight += w.valence;
  }
  
  // Acousticness score
  if (trackFeatures.acousticness !== undefined && targetFeatures.acousticness) {
    const acousticnessScore = calculateRangeScore(
      trackFeatures.acousticness, 
      targetFeatures.acousticness.min, 
      targetFeatures.acousticness.max, 
      targetFeatures.acousticness.target
    );
    score += acousticnessScore * w.acousticness;
    totalWeight += w.acousticness;
  }
  
  // Danceability score
  if (trackFeatures.danceability !== undefined && targetFeatures.danceability) {
    const danceabilityScore = calculateRangeScore(
      trackFeatures.danceability, 
      targetFeatures.danceability.min, 
      targetFeatures.danceability.max, 
      targetFeatures.danceability.target
    );
    score += danceabilityScore * w.danceability;
    totalWeight += w.danceability;
  }
  
  const finalScore = totalWeight > 0 ? score / totalWeight : 0;
  console.log(`[SCORING] Final score: ${finalScore.toFixed(3)}, totalWeight: ${totalWeight}`);
  return finalScore;
}

/**
 * Calculate score for a feature within a range
 */
function calculateRangeScore(value, min, max, target) {
  // More lenient scoring - don't completely exclude tracks outside range
  const range = max - min;
  const distance = Math.abs(value - target);
  const normalizedDistance = distance / range;
  
  // If within range, use normal scoring
  if (value >= min && value <= max) {
    const score = Math.max(0, 1 - normalizedDistance);
    console.log(`[RANGE_SCORE] ${value} in range [${min}, ${max}], target: ${target}, score: ${score.toFixed(3)}`);
    return score;
  }
  
  // If outside range, give partial score based on distance
  const outsideDistance = Math.min(
    Math.abs(value - min) / range,
    Math.abs(value - max) / range
  );
  
  const score = Math.max(0, 0.3 - outsideDistance * 0.2); // Minimum 0.1 score for close tracks
  console.log(`[RANGE_SCORE] ${value} outside range [${min}, ${max}], target: ${target}, score: ${score.toFixed(3)}`);
  return score;
}

/**
 * Apply energy curve to tracks (intro -> body -> outro)
 */
export function applyEnergyCurve(tracks, curveType = "standard") {
  if (!tracks.length) return tracks;
  
  const sortedTracks = [...tracks];
  const totalTracks = sortedTracks.length;
  
  switch (curveType) {
    case "running":
      // Stable high energy for running
      return sortedTracks.sort((a, b) => (b.energy || 0) - (a.energy || 0));
      
    case "studying":
      // Gentle curve with low energy
      return sortedTracks.sort((a, b) => (a.energy || 0) - (b.energy || 0));
      
    case "party":
      // High energy throughout
      return sortedTracks.sort((a, b) => (b.energy || 0) - (a.energy || 0));
      
    default:
      // Standard curve: intro (low) -> body (medium-high) -> outro (low)
      const introSize = Math.ceil(totalTracks * 0.2);
      const outroSize = Math.ceil(totalTracks * 0.2);
      const bodySize = totalTracks - introSize - outroSize;
      
      // Sort by energy
      sortedTracks.sort((a, b) => (b.energy || 0) - (a.energy || 0));
      
      const result = [];
      
      // Intro: lowest energy tracks
      result.push(...sortedTracks.slice(-introSize).reverse());
      
      // Body: medium to high energy
      result.push(...sortedTracks.slice(introSize, introSize + bodySize));
      
      // Outro: medium to low energy
      result.push(...sortedTracks.slice(introSize + bodySize).reverse());
      
      return result;
  }
}

/**
 * Detect if track is instrumental
 */
export function isInstrumental(track, threshold = 0.7) {
  return (track.instrumentalness || 0) > threshold && (track.speechiness || 1) < 0.3;
}

/**
 * Detect language heuristically
 */
export function detectLanguage(track) {
  const title = (track.name || "").toLowerCase();
  const artist = (track.artists?.[0] || "").toLowerCase();
  
  // Spanish indicators
  const spanishWords = ["el", "la", "de", "que", "y", "en", "un", "es", "se", "no", "te", "lo", "le", "da", "su", "por", "son", "con", "para", "al", "del", "los", "las", "una", "más", "pero", "sus", "muy", "sin", "sobre", "también", "me", "hasta", "desde", "está", "mi", "porque", "qué", "sólo", "han", "yo", "hay", "vez", "puede", "todos", "así", "nos", "ni", "parte", "tiene", "él", "uno", "donde", "bien", "tiempo", "mismo", "ese", "ahora", "cada", "e", "vida", "lugar", "después", "lejos", "aquí", "otro", "entre", "cosa", "dijo", "nada", "casa", "año", "vez", "día", "hombre", "mujer", "niño", "agua", "trabajo", "mundo", "gobierno", "país", "mundo", "vida", "persona", "año", "día", "vez", "casa", "agua", "trabajo", "mundo"];
  
  const text = `${title} ${artist}`;
  const spanishCount = spanishWords.filter(word => text.includes(word)).length;
  
  if (spanishCount >= 2) return "es";
  
  // English indicators
  const englishWords = ["the", "and", "of", "to", "a", "in", "is", "it", "you", "that", "he", "was", "for", "on", "are", "as", "with", "his", "they", "i", "at", "be", "this", "have", "from", "or", "one", "had", "by", "word", "but", "not", "what", "all", "were", "we", "when", "your", "can", "said", "there", "each", "which", "she", "do", "how", "their", "if", "will", "up", "other", "about", "out", "many", "then", "them", "these", "so", "some", "her", "would", "make", "like", "into", "him", "time", "has", "two", "more", "go", "no", "way", "could", "my", "than", "first", "been", "call", "who", "its", "now", "find", "long", "down", "day", "did", "get", "come", "made", "may", "part"];
  
  const englishCount = englishWords.filter(word => text.includes(word)).length;
  
  if (englishCount >= 2) return "en";
  
  return "unknown";
}

/**
 * Filter tracks by language
 */
export function filterByLanguage(tracks, targetLanguage) {
  if (!targetLanguage || targetLanguage === "all") return tracks;
  
  return tracks.filter(track => {
    const detectedLang = detectLanguage(track);
    return detectedLang === targetLanguage || detectedLang === "unknown";
  });
}

/**
 * Filter tracks by instrumental requirement
 */
export function filterByInstrumental(tracks, requireInstrumental) {
  if (!requireInstrumental) return tracks;
  
  return tracks.filter(track => isInstrumental(track));
}

/**
 * Filter out live/remix/edit versions
 */
export function filterLiveRemix(tracks, allowLiveRemix = true) {
  if (allowLiveRemix) return tracks;
  
  return tracks.filter(track => {
    const name = (track.name || "").toLowerCase();
    return !name.includes("live") && 
           !name.includes("remix") && 
           !name.includes("edit") && 
           !name.includes("version") && 
           !name.includes("remaster");
  });
}

/**
 * Calculate BPM difference between consecutive tracks
 */
export function calculateBPMDifference(track1, track2) {
  const bpm1 = track1.tempo || 0;
  const bpm2 = track2.tempo || 0;
  return Math.abs(bpm1 - bpm2);
}

/**
 * Reorder tracks to minimize BPM jumps
 */
export function minimizeBPMJumps(tracks, maxJump = 12) {
  if (tracks.length <= 1) return tracks;
  
  const sorted = [...tracks];
  const result = [sorted.shift()]; // Start with first track
  
  while (sorted.length > 0) {
    const lastTrack = result[result.length - 1];
    let bestIndex = 0;
    let bestBPMDiff = calculateBPMDifference(lastTrack, sorted[0]);
    
    // Find track with smallest BPM difference
    for (let i = 1; i < sorted.length; i++) {
      const bpmDiff = calculateBPMDifference(lastTrack, sorted[i]);
      if (bpmDiff < bestBPMDiff) {
        bestBPMDiff = bpmDiff;
        bestIndex = i;
      }
    }
    
    // If BPM jump is too large, try to find a better match
    if (bestBPMDiff > maxJump) {
      // Look for tracks with similar BPM
      const targetBPM = lastTrack.tempo || 120;
      const similarTracks = sorted.filter(track => 
        Math.abs((track.tempo || 120) - targetBPM) <= maxJump
      );
      
      if (similarTracks.length > 0) {
        bestIndex = sorted.findIndex(track => track.id === similarTracks[0].id);
      }
    }
    
    result.push(sorted.splice(bestIndex, 1)[0]);
  }
  
  return result;
}

/**
 * Get canonical seeds for activity
 */
export function getCanonicalSeeds(activity) {
  return CANONICAL_SEEDS[activity] || CANONICAL_SEEDS.estudiar;
}

/**
 * Expand seeds with synonyms and related terms
 */
export function expandSeeds(seeds) {
  const expanded = {
    artistas: [...(seeds.artistas || [])],
    canciones: [...(seeds.canciones || [])],
    generos: [...(seeds.generos || [])]
  };
  
  // Genre synonyms
  const genreSynonyms = {
    "pop": ["pop music", "mainstream", "chart"],
    "rock": ["rock music", "alternative rock", "indie rock"],
    "electronic": ["electronic music", "edm", "synth"],
    "hip-hop": ["hip hop", "rap", "urban"],
    "jazz": ["jazz music", "bebop", "swing"],
    "lofi": ["lo-fi", "low fi", "chill beats"],
    "reggaeton": ["reggaeton music", "latin trap", "urban latin"],
    "indie": ["indie music", "alternative", "underground"]
  };
  
  // Add synonyms for genres
  seeds.generos?.forEach(genre => {
    const synonyms = genreSynonyms[genre.toLowerCase()];
    if (synonyms) {
      expanded.generos.push(...synonyms);
    }
  });
  
  // Remove duplicates
  expanded.artistas = [...new Set(expanded.artistas)];
  expanded.canciones = [...new Set(expanded.canciones)];
  expanded.generos = [...new Set(expanded.generos)];
  
  return expanded;
}
