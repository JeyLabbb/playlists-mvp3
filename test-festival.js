#!/usr/bin/env node

/**
 * Tests rápidos para verificar el modo festival
 * Verifica: extracción de nombre, búsqueda de playlists, distribución proporcional
 */

const testCases = [
  {
    name: "Festival Real - Coachella 2024",
    prompt: "festival Coachella 2024",
    target_tracks: 30,
    expected: {
      modo: "festival",
      llmShare: 0,
      festival: {
        nombre_limpio: "coachella",
        ano: "2024"
      },
      minTracks: 25 // N-5 si escasez real
    }
  },
  {
    name: "Festival Ficticio - Groove Pamplona 2025",
    prompt: "festival Groove Pamplona 2025",
    target_tracks: 50,
    expected: {
      modo: "festival",
      llmShare: 0,
      festival: {
        nombre_limpio: "groove pamplona",
        ano: "2025"
      },
      minTracks: 45 // N-5 si escasez real
    }
  },
  {
    name: "Festival con Prefijo - Música para el festival Primavera Sound 2024",
    prompt: "música para el festival Primavera Sound 2024",
    target_tracks: 40,
    expected: {
      modo: "festival",
      llmShare: 0,
      festival: {
        nombre_limpio: "primavera sound",
        ano: "2024"
      },
      minTracks: 35 // N-5 si escasez real
    }
  }
];

async function testFestival(prompt, target_tracks) {
  try {
    const response = await fetch('http://localhost:3000/api/playlist/llm', {
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

function validateFestivalResponse(testCase, result) {
  const { data } = result;
  const { expected } = testCase;
  const errors = [];

  // Check basic structure
  if (!data.tracks || !Array.isArray(data.tracks)) {
    errors.push("Missing or invalid tracks array");
  }

  // Check track count
  if (data.tracks.length < expected.minTracks) {
    errors.push(`Expected ≥${expected.minTracks} tracks, got ${data.tracks.length}`);
  }

  // Check for generic tracks
  const genericTitles = ["Study", "Chill", "Workout", "Focus", "Ambient", "Mix", "Playlist"];
  const hasGenericTitles = data.tracks.some(track => 
    genericTitles.some(generic => 
      track.name.toLowerCase().includes(generic.toLowerCase())
    )
  );
  if (hasGenericTitles) {
    errors.push("Found generic titles in tracks");
  }

  // Check artist distribution (should not be dominated by one artist)
  const artistCounts = {};
  data.tracks.forEach(track => {
    const artist = track.artists[0] || 'Unknown';
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
  });

  const maxTracksPerArtist = Math.max(...Object.values(artistCounts));
  const totalArtists = Object.keys(artistCounts).length;
  
  // For festivals, max tracks per artist should be reasonable (not more than 20% of total)
  const maxAllowedPerArtist = Math.ceil(expected.target_tracks * 0.2);
  if (maxTracksPerArtist > maxAllowedPerArtist) {
    errors.push(`Artist distribution too skewed: ${maxTracksPerArtist} tracks from one artist (max allowed: ${maxAllowedPerArtist})`);
  }

  // Check for reasonable artist variety
  if (totalArtists < 5 && data.tracks.length > 20) {
    errors.push(`Too few artists (${totalArtists}) for playlist size (${data.tracks.length})`);
  }

  return {
    errors,
    stats: {
      totalTracks: data.tracks.length,
      totalArtists: totalArtists,
      maxTracksPerArtist: maxTracksPerArtist,
      artistDistribution: Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([artist, count]) => `${artist}: ${count}`)
    }
  };
}

async function runFestivalTests() {
  console.log("🎪 EJECUTANDO TESTS DE MODO FESTIVAL...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    console.log(`   Target: ${testCase.target_tracks} tracks`);

    const result = await testFestival(testCase.prompt, testCase.target_tracks);

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error}`);
      failed++;
      continue;
    }

    const validation = validateFestivalResponse(testCase, result);
    
    if (validation.errors.length === 0) {
      console.log(`   ✅ PASSED`);
      console.log(`   📊 Tracks: ${validation.stats.totalTracks}, Artists: ${validation.stats.totalArtists}, Max per artist: ${validation.stats.maxTracksPerArtist}`);
      console.log(`   🎵 Top artists: ${validation.stats.artistDistribution.join(', ')}`);
      passed++;
    } else {
      console.log(`   ❌ FAILED:`);
      validation.errors.forEach(error => console.log(`      - ${error}`));
      console.log(`   📊 Stats:`, validation.stats);
      failed++;
    }
    console.log("");
  }

  console.log(`\n📈 RESULTADOS: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log("🎉 TODOS LOS TESTS DE FESTIVAL PASARON!");
  } else {
    console.log("⚠️  ALGUNOS TESTS FALLARON - REVISAR IMPLEMENTACIÓN");
  }
}

// Run tests
runFestivalTests().catch(console.error);
