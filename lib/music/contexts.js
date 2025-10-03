/**
 * Contextos brújula para diferentes escenas musicales
 * Se usan como semillas obligatorias cuando el prompt coincide con la escena
 */

/**
 * Normaliza nombres de artistas para comparación (trim + case-insensitive)
 */
export function normalizeArtistName(name) {
  return name.trim().toLowerCase();
}

/**
 * Valida que los nombres de artistas no se modifiquen más allá de trim/case
 */
function validateArtistNames(artists, contextName) {
  const originalNames = artists.map(name => name.trim());
  const normalizedNames = artists.map(name => name.trim().toLowerCase());
  
  // Verificar que no hay cambios más allá de trim/case
  for (let i = 0; i < artists.length; i++) {
    const original = artists[i];
    const trimmed = original.trim();
    const lowercased = original.toLowerCase();
    
    // Solo permitir cambios de trim y case
    if (original !== trimmed && original !== lowercased) {
      console.error(`[CONTEXT_VALIDATION] Error in ${contextName}: Name "${original}" was modified beyond trim/case`);
      return false;
    }
  }
  
  // Verificar duplicados (case-insensitive + trim)
  const seen = new Set();
  for (const name of normalizedNames) {
    if (seen.has(name)) {
      console.error(`[CONTEXT_VALIDATION] Error in ${contextName}: Duplicate artist name found: "${name}"`);
      return false;
    }
    seen.add(name);
  }
  
  console.log(`[CONTEXT_VALIDATION] ${contextName}: ${artists.length} artists validated successfully`);
  return true;
}

export const MUSICAL_CONTEXTS = {
  underground_es: {
    name: "Underground Español",
    keywords: ["underground", "español", "española", "indie", "alternativo", "independiente"],
    compass: [
      "Yung Beef", "Kaydy Cain", "La Zowi", "Sticky M.A.", "Cruz Cafuné", "Choclock", "Abhir Hathi", "ABHIR",
      "Soto Asa", "Israel B", "Cecilio G", "Dellafuente", "Maka", "Hoke", "Louis Amoeba",
      "Ill Pekeño", "Ergo Pro", "Dano", "Recycled J", "Love Yi", "Pimp Flaco", "Kinder Malo",
      "Albany", "Bea Pelea", "superreservao", "Selecta", "Skyhook", "Lowlight", "Elio Toffana",
      "mvrk", "C Marí", "Biberon", "Mda", "Bon Calso", "Semon", "Guxo",
      "Métrika", "Vampi", "ThatKid", "GlorySixVain", "Tarchi", "UGLY", "Saramalacara",
      "LaBlackie", "Orslok", "Carzé", "Icy Vedo", "El Bugg", "r8venge", "Metrika",
      "l0rna", "Azuleja", "Mushkaa", "AMORE", "Claudio Montana", "ladiferencia2006", "D.Valentino",
      "Xiyo", "Fernandezz", "Slad Mobb", "Bby Demon", "JayDime", "Gloosito", "West Srk",
      "Baby Pantera", "RALY", "TK MAMI", "El Virtual", "alequi", "Ben Yart", "Fran Laoren",
      "Vreno Yg", "Teo Lucadamo", "Alu", "Enry-K", "LEITI", "8belial", "yyy891",
      "Yeidos", "Diego 900", "L'haine", "John Pollon", "Slappy Av", "Yung Nick",
      "Nevo Angel", "Lil Mess", "Dirty Suc", "Barry B", "Ralphie Choo", "rusowsky",
      "Raul Clyde", "Juseph", "La Pantera", "Juicy Bae", "Gatti"
    ]
  },
  
  reggaeton_es: {
    name: "Reggaeton Español",
    keywords: ["reggaeton", "urbano", "latin", "trap", "español"],
    compass: [
      "Bad Bunny", "J Balvin", "Maluma", "Ozuna", "Karol G", "Daddy Yankee", "Wisin & Yandel",
      "Don Omar", "Nicky Jam", "Anuel AA", "Myke Towers", "Rauw Alejandro", "Jhayco",
      "Feid", "Sech", "Manuel Turizo", "Camilo", "Sebastian Yatra", "Morat"
    ]
  },
  
  pop_urbano_es: {
    name: "Pop Urbano Español",
    keywords: ["pop urbano", "pop español", "urban pop", "español"],
    compass: [
      "Rosalía", "C. Tangana", "Aitana", "Lola Indigo", "Natalia Lacunza", "Amaia",
      "Alba Reche", "Ana Guerra", "Blas Cantó", "Pablo López", "Pablo Alborán",
      "Alejandro Sanz", "David Bisbal", "Enrique Iglesias", "Alejandro Fernández"
    ]
  },
  
  indie_es: {
    name: "Indie Español",
    keywords: ["indie", "independiente", "alternativo", "español"],
    compass: [
      "Vetusta Morla", "Love of Lesbian", "Fito & Fitipaldis", "El Canto del Loco",
      "La Oreja de Van Gogh", "Maldita Nerea", "El Sueño de Morfeo", "Efecto Pasillo",
      "El Kanka", "Rozalén", "Rulo y la Contrabanda", "Los Planetas", "Los Punsetes"
    ]
  },
  
  electronic_es: {
    name: "Electronic Español",
    keywords: ["electronic", "electrónico", "edm", "techno", "house", "español"],
    compass: [
      "Sergio Dalma", "Mónica Naranjo", "Alejandro Sanz", "David Bisbal",
      "Enrique Iglesias", "Pablo Alborán", "Rosalía", "C. Tangana"
    ]
  }
};

/**
 * Detecta el contexto musical basado en el prompt
 * En modo UNDERGROUND_STRICT, solo detecta underground_es
 */
export function detectMusicalContext(prompt) {
  const promptLower = prompt.toLowerCase();
  
  // Modo UNDERGROUND_STRICT: solo detectar underground_es
  if (/underground/i.test(prompt)) {
    const undergroundContext = MUSICAL_CONTEXTS.underground_es;
    const matchCount = undergroundContext.keywords.filter(keyword => 
      promptLower.includes(keyword)
    ).length;
    
    if (matchCount >= 1) {
      console.log(`[CONTEXT] compass_used=true name=underground_es keep_outside=true`);
      return {
        key: 'underground_es',
        name: undergroundContext.name,
        compass: undergroundContext.compass
      };
    }
    
    return null;
  }
  
  // Modo normal: detectar todos los contextos
  for (const [key, context] of Object.entries(MUSICAL_CONTEXTS)) {
    const matchCount = context.keywords.filter(keyword => 
      promptLower.includes(keyword)
    ).length;
    
    if (matchCount >= 1) {
      console.log(`[CONTEXT] compass_used=true name=${key} keep_outside=${key !== 'underground_es'}`);
      return {
        key,
        name: context.name,
        compass: context.compass
      };
    }
  }
  
  return null;
}

/**
 * Obtiene los contextos brújula para un prompt
 * Siempre devuelve contextos cuando se detectan
 */
export function getContextsForPrompt(prompt) {
  const detectedContext = detectMusicalContext(prompt);
  
  if (detectedContext) {
    return {
      key: detectedContext.key,
      name: detectedContext.name,
      compass: detectedContext.compass
    };
  }
  
  return null;
}

// Validar nombres de artistas al cargar el módulo - solo underground_es por defecto
if (!validateArtistNames(MUSICAL_CONTEXTS.underground_es.compass, 'underground_es')) {
  console.error(`[CONTEXT_VALIDATION] Failed to validate context: underground_es`);
}
