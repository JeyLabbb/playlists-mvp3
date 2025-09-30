/**
 * Canonical seeds and genre mappings for robust playlist generation
 */

// Canonical seeds by activity and genre
export const CANONICAL_SEEDS = {
  estudiar: {
    artistas: ["Nujabes", "J Dilla", "Bonobo", "Tycho", "Emancipator", "Ludovico Einaudi", "Max Richter", "Ólafur Arnalds"],
    canciones: ["Luv(sic) Part 3", "Donuts", "Kong", "A Walk", "Soon It Will Be Cold Enough", "Nuvole Bianche", "On The Nature of Daylight"],
    generos: ["lofi", "ambient", "jazz", "chill", "classical", "piano", "minimal"]
  },
  correr: {
    artistas: ["The Weeknd", "Dua Lipa", "Calvin Harris", "Martin Garrix", "Avicii", "David Guetta", "Swedish House Mafia", "Skrillex"],
    canciones: ["Blinding Lights", "Levitating", "One Kiss", "Animals", "Wake Me Up", "Titanium", "Don't You Worry Child", "Bangarang"],
    generos: ["pop", "dance", "electronic", "edm", "house", "progressive", "big room"]
  },
  fiesta: {
    artistas: ["Bad Bunny", "J Balvin", "Maluma", "Ozuna", "Karol G", "Daddy Yankee", "Wisin & Yandel", "Don Omar"],
    canciones: ["Dakiti", "Mi Gente", "Hawái", "Caramelo", "Tusa", "Gasolina", "Despacito", "Con Calma"],
    generos: ["reggaeton", "latin", "pop", "dance", "trap", "urbano", "bachata"]
  },
  cena: {
    artistas: ["Norah Jones", "John Mayer", "Adele", "Ed Sheeran", "Billie Eilish", "Alicia Keys", "John Legend", "Sam Smith"],
    canciones: ["Don't Know Why", "Gravity", "Hello", "Perfect", "Lovely", "Fallin'", "All of Me", "Stay With Me"],
    generos: ["pop", "acoustic", "soul", "indie", "folk", "r&b", "blues"]
  },
  focus: {
    artistas: ["Ludovico Einaudi", "Max Richter", "Ólafur Arnalds", "Nils Frahm", "Hania Rani", "Yiruma", "Ludovico Einaudi", "Erik Satie"],
    canciones: ["Nuvole Bianche", "On The Nature of Daylight", "Near Light", "Says", "Esja", "River Flows in You", "Gymnopédie No.1"],
    generos: ["classical", "ambient", "piano", "minimal", "neoclassical", "contemporary"]
  }
};

// Genre to Spotify seed_genres mapping
export const GENRE_MAPPINGS = {
  "reggaeton": ["latin", "reggaeton"],
  "latin": ["latin", "reggaeton", "trap"],
  "pop": ["pop", "dance"],
  "electronic": ["electronic", "dance", "edm"],
  "dance": ["dance", "electronic", "house"],
  "lofi": ["lofi", "chill", "ambient"],
  "ambient": ["ambient", "chill", "classical"],
  "jazz": ["jazz", "blues", "soul"],
  "rock": ["rock", "alternative", "indie"],
  "hip-hop": ["hip-hop", "rap", "trap"],
  "classical": ["classical", "orchestral", "piano"],
  "k-pop": ["k-pop", "pop"],
  "synthwave": ["synthwave", "electronic", "new-wave"],
  "indie": ["indie", "alternative", "folk"],
  "r&b": ["r&b", "soul", "blues"],
  "country": ["country", "folk", "acoustic"],
  "blues": ["blues", "soul", "jazz"],
  "folk": ["folk", "acoustic", "indie"],
  "soul": ["soul", "r&b", "blues"],
  "trap": ["trap", "hip-hop", "electronic"]
};

// Activity-based genre preferences
export const ACTIVITY_GENRES = {
  estudiar: ["lofi", "ambient", "classical", "jazz", "chill"],
  correr: ["pop", "dance", "electronic", "edm", "house"],
  fiesta: ["reggaeton", "latin", "pop", "dance", "trap"],
  cena: ["pop", "acoustic", "soul", "indie", "folk"],
  focus: ["classical", "ambient", "piano", "minimal", "neoclassical"]
};

// Mood to audio features mapping
export const MOOD_FEATURES = {
  "oscuro": { valence: { min: 0.1, max: 0.4, target: 0.25 } },
  "melancólico": { valence: { min: 0.1, max: 0.4, target: 0.25 } },
  "triste": { valence: { min: 0.1, max: 0.4, target: 0.25 } },
  "alegre": { valence: { min: 0.6, max: 0.9, target: 0.75 } },
  "feliz": { valence: { min: 0.6, max: 0.9, target: 0.75 } },
  "energético": { energy: { min: 0.7, max: 0.9, target: 0.8 } },
  "suave": { energy: { min: 0.2, max: 0.4, target: 0.3 } },
  "chill": { energy: { min: 0.2, max: 0.4, target: 0.3 } },
  "relajado": { energy: { min: 0.2, max: 0.4, target: 0.3 } },
  "épico": { energy: { min: 0.7, max: 0.9, target: 0.8 } },
  "intenso": { energy: { min: 0.6, max: 0.9, target: 0.75 } }
};

/**
 * Get canonical seeds for an activity
 */
export function getCanonicalSeeds(actividad) {
  return CANONICAL_SEEDS[actividad] || CANONICAL_SEEDS.estudiar;
}

/**
 * Map genre to Spotify seed genres
 */
export function mapGenreToSpotify(genre) {
  const normalized = genre.toLowerCase().trim();
  return GENRE_MAPPINGS[normalized] || [normalized];
}

/**
 * Get activity-based genres
 */
export function getActivityGenres(actividad) {
  return ACTIVITY_GENRES[actividad] || ACTIVITY_GENRES.estudiar;
}

/**
 * Expand seeds with canonical data
 */
export function expandSeeds(seeds, actividad) {
  const canonical = getCanonicalSeeds(actividad);
  
  return {
    artistas: [...(seeds.artistas || []), ...canonical.artistas.slice(0, 3)],
    canciones: [...(seeds.canciones || []), ...canonical.canciones.slice(0, 2)],
    generos: [...(seeds.generos || []), ...canonical.generos.slice(0, 2)]
  };
}
