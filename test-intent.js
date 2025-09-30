#!/usr/bin/env node

/**
 * Tests rápidos para verificar el endpoint /api/intent
 * Verifica: JSON válido, 70% de tracks, modo correcto, festival info
 */

const testCases = [
  {
    name: "Prompt Normal - Jazz Techno",
    prompt: "playlist de jazz-techno",
    target_tracks: 50,
    expected: {
      modo: "normal",
      minTracks: 35, // 70% de 50
      llmShare: ">0"
    }
  },
  {
    name: "Festival con Año",
    prompt: "festival Coachella 2024",
    target_tracks: 30,
    expected: {
      modo: "festival",
      minTracks: 0,
      llmShare: 0,
      festival: {
        nombre_limpio: "coachella",
        ano: "2024"
      }
    }
  },
  {
    name: "Música Reciente",
    prompt: "música viral de TikTok 2025",
    target_tracks: 40,
    expected: {
      modo: "recientes",
      minTracks: 0,
      llmShare: 0
    }
  },
  {
    name: "Género Clásico",
    prompt: "rock clásico de los 80",
    target_tracks: 60,
    expected: {
      modo: "normal",
      minTracks: 42, // 70% de 60
      llmShare: ">0.6"
    }
  }
];

async function testIntent(prompt, target_tracks) {
  try {
    const response = await fetch('http://localhost:3000/api/intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, target_tracks })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function validateResponse(testCase, result) {
  const { data } = result;
  const { expected } = testCase;
  const errors = [];

  // Check JSON structure
  if (!data.modo) errors.push("Missing 'modo' field");
  if (!Array.isArray(data.tracks_llm)) errors.push("'tracks_llm' must be array");
  if (!Array.isArray(data.artists_llm)) errors.push("'artists_llm' must be array");
  if (!data.criterios) errors.push("Missing 'criterios' field");
  if (!data.to_fill_strategy) errors.push("Missing 'to_fill_strategy' field");

  // Check mode
  if (expected.modo && data.modo !== expected.modo) {
    errors.push(`Expected modo '${expected.modo}', got '${data.modo}'`);
  }

  // Check 70% rule for normal mode
  if (expected.minTracks > 0 && data.tracks_llm.length < expected.minTracks) {
    errors.push(`Expected ≥${expected.minTracks} tracks, got ${data.tracks_llm.length}`);
  }

  // Check llmShare
  if (expected.llmShare === 0 && data.llmShare !== 0) {
    errors.push(`Expected llmShare = 0, got ${data.llmShare}`);
  }
  if (expected.llmShare === ">0" && data.llmShare <= 0) {
    errors.push(`Expected llmShare > 0, got ${data.llmShare}`);
  }
  if (expected.llmShare === ">0.6" && data.llmShare <= 0.6) {
    errors.push(`Expected llmShare > 0.6, got ${data.llmShare}`);
  }

  // Check festival info
  if (expected.festival) {
    if (!data.festival) {
      errors.push("Expected festival info missing");
    } else {
      if (expected.festival.nombre_limpio && !data.festival.nombre_limpio) {
        errors.push("Missing festival.nombre_limpio");
      }
      if (expected.festival.ano && !data.festival.ano) {
        errors.push("Missing festival.ano");
      }
    }
  }

  // Check for generic titles
  const genericTitles = ["Study", "Chill", "Workout", "Focus", "Ambient", "Mix", "Playlist"];
  const hasGenericTitles = data.tracks_llm.some(track => 
    genericTitles.some(generic => 
      track.title.toLowerCase().includes(generic.toLowerCase())
    )
  );
  if (hasGenericTitles) {
    errors.push("Found generic titles in tracks_llm");
  }

  return errors;
}

async function runTests() {
  console.log("🧪 EJECUTANDO TESTS DE INTENT...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    console.log(`   Target: ${testCase.target_tracks} tracks`);

    const result = await testIntent(testCase.prompt, testCase.target_tracks);

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error}`);
      failed++;
      continue;
    }

    const errors = validateResponse(testCase, result);
    
    if (errors.length === 0) {
      console.log(`   ✅ PASSED`);
      console.log(`   📊 Modo: ${result.data.modo}, LLM Share: ${result.data.llmShare}, Tracks: ${result.data.tracks_llm.length}`);
      if (result.data.festival) {
        console.log(`   🎪 Festival: ${result.data.festival.nombre_limpio} ${result.data.festival.ano}`);
      }
      passed++;
    } else {
      console.log(`   ❌ FAILED:`);
      errors.forEach(error => console.log(`      - ${error}`));
      console.log(`   📊 Response:`, JSON.stringify(result.data, null, 2));
      failed++;
    }
    console.log("");
  }

  console.log(`\n📈 RESULTADOS: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log("🎉 TODOS LOS TESTS PASARON!");
  } else {
    console.log("⚠️  ALGUNOS TESTS FALLARON - REVISAR IMPLEMENTACIÓN");
  }
}

// Run tests
runTests().catch(console.error);
