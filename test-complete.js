#!/usr/bin/env node

/**
 * Test completo del sistema JeyLabbb
 * Prueba todos los modos y funcionalidades
 */

const testCases = [
  {
    name: "🎵 Modo Normal - Jazz Music",
    prompt: "jazz music",
    target_tracks: 30,
    expected: {
      modo: "normal",
      llmShare: ">0.5",
      minTracks: 25,
      maxTracks: 30
    }
  },
  {
    name: "🎪 Modo Festival - Coachella 2024",
    prompt: "festival Coachella 2024",
    target_tracks: 50,
    expected: {
      modo: "festival",
      llmShare: 0,
      minTracks: 45,
      maxTracks: 50
    }
  },
  {
    name: "🔥 Modo Recientes - Reggaeton 2024",
    prompt: "reggaeton reciente 2024",
    target_tracks: 40,
    expected: {
      modo: "recientes",
      llmShare: 0,
      minTracks: 35,
      maxTracks: 40
    }
  },
  {
    name: "🎨 Modo Mixto - Jazz Techno",
    prompt: "jazz-techno fusion",
    target_tracks: 25,
    expected: {
      modo: "normal",
      llmShare: ">0.4",
      minTracks: 20,
      maxTracks: 25
    }
  }
];

async function testPlaylist(prompt, target_tracks) {
  try {
    const response = await fetch('http://localhost:3000/api/playlist/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, target_tracks })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function validatePlaylist(testCase, result) {
  const { data } = result;
  const { expected } = testCase;
  const errors = [];
  const warnings = [];

  // Check basic structure
  if (!data.tracks || !Array.isArray(data.tracks)) {
    errors.push("Missing or invalid tracks array");
    return { errors, warnings, stats: null };
  }

  const totalTracks = data.tracks.length;
  const llmTracks = data.metadata?.llm_tracks || 0;
  const spotifyTracks = data.metadata?.spotify_tracks || 0;
  const llmShare = data.metadata?.llm_tracks / totalTracks || 0;

  // Check track count
  if (totalTracks < expected.minTracks) {
    errors.push(`Too few tracks: ${totalTracks} (expected ≥${expected.minTracks})`);
  }
  if (totalTracks > expected.maxTracks) {
    errors.push(`Too many tracks: ${totalTracks} (expected ≤${expected.maxTracks})`);
  }

  // Check mode
  if (data.metadata?.intent?.modo !== expected.modo) {
    errors.push(`Wrong mode: ${data.metadata?.intent?.modo} (expected ${expected.modo})`);
  }

  // Check LLM share
  if (expected.llmShare === 0) {
    if (llmShare > 0.1) {
      errors.push(`LLM share too high: ${(llmShare * 100).toFixed(1)}% (expected 0%)`);
    }
  } else if (typeof expected.llmShare === 'string' && expected.llmShare.startsWith('>')) {
    const minShare = parseFloat(expected.llmShare.replace('>', ''));
    if (llmShare < minShare) {
      errors.push(`LLM share too low: ${(llmShare * 100).toFixed(1)}% (expected ≥${minShare * 100}%)`);
    }
  }

  // Check for generic titles
  const genericTitles = ['Study', 'Chill', 'Workout', 'Focus', 'Ambient', 'Mix', 'Playlist'];
  const hasGenericTitles = data.tracks.some(track => 
    genericTitles.some(generic => 
      track.name?.toLowerCase().includes(generic.toLowerCase())
    )
  );
  if (hasGenericTitles) {
    warnings.push("Found generic titles in tracks");
  }

  // Check artist distribution
  const artistCounts = {};
  data.tracks.forEach(track => {
    const artistName = track.artists[0] || 'Unknown';
    artistCounts[artistName] = (artistCounts[artistName] || 0) + 1;
  });

  const uniqueArtists = Object.keys(artistCounts).length;
  const maxTracksPerArtist = Math.max(...Object.values(artistCounts));
  
  // Check for reasonable distribution
  const maxAllowedPercentage = 0.25; // Max 25% from one artist
  const maxAllowedTracks = Math.ceil(totalTracks * maxAllowedPercentage);
  if (maxTracksPerArtist > maxAllowedTracks) {
    warnings.push(`Artist monopoly: ${maxTracksPerArtist} tracks from one artist (max allowed: ${maxAllowedTracks})`);
  }

  const stats = {
    totalTracks,
    llmTracks,
    spotifyTracks,
    llmShare: (llmShare * 100).toFixed(1) + '%',
    uniqueArtists,
    maxTracksPerArtist,
    runId: data.metadata?.run_id || 'N/A',
    collectionLog: data.metadata?.collection_log || null,
    note: data.metadata?.note || null
  };

  return { errors, warnings, stats };
}

async function runCompleteTests() {
  console.log("🎵 EJECUTANDO TESTS COMPLETOS DEL SISTEMA JEYLABBB...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    console.log(`   Target: ${testCase.target_tracks} tracks`);

    const result = await testPlaylist(testCase.prompt, testCase.target_tracks);

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error}`);
      failed++;
      continue;
    }

    const validation = validatePlaylist(testCase, result);
    
    if (validation.errors.length === 0) {
      console.log(`   ✅ PASSED`);
      console.log(`   📊 Tracks: ${validation.stats.totalTracks} (LLM: ${validation.stats.llmTracks}, Spotify: ${validation.stats.spotifyTracks})`);
      console.log(`   🎵 LLM Share: ${validation.stats.llmShare}, Artists: ${validation.stats.uniqueArtists}`);
      console.log(`   🆔 Run ID: ${validation.stats.runId}`);
      
      if (validation.stats.collectionLog) {
        const log = validation.stats.collectionLog;
        console.log(`   🔍 Collection: ${log.collected} → ${log.final} tracks`);
      }
      
      if (validation.stats.note) {
        console.log(`   📝 Note: ${validation.stats.note}`);
      }
      
      if (validation.warnings.length > 0) {
        console.log(`   ⚠️  Warnings:`);
        validation.warnings.forEach(warning => console.log(`      - ${warning}`));
      }
      
      passed++;
    } else {
      console.log(`   ❌ FAILED:`);
      validation.errors.forEach(error => console.log(`      - ${error}`));
      if (validation.warnings.length > 0) {
        console.log(`   ⚠️  Warnings:`);
        validation.warnings.forEach(warning => console.log(`      - ${warning}`));
      }
      console.log(`   📊 Stats:`, validation.stats);
      failed++;
    }
    console.log("");
  }

  console.log(`\n📈 RESULTADOS FINALES: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log("🎉 ¡TODOS LOS TESTS PASARON! EL SISTEMA ESTÁ FUNCIONANDO PERFECTAMENTE");
  } else {
    console.log("⚠️  ALGUNOS TESTS FALLARON - REVISAR CONFIGURACIÓN");
  }

  // Test debug endpoint
  console.log("\n🔍 PROBANDO ENDPOINT DE DEBUG...");
  try {
    const debugResponse = await fetch('http://localhost:3000/api/debug/last?format=json');
    const debugData = await debugResponse.json();
    
    if (debugData.runId) {
      console.log("✅ Debug endpoint funcionando");
      console.log(`   Último Run ID: ${debugData.runId}`);
      console.log(`   Timestamp: ${debugData.timestamp}`);
      console.log(`   Modo: ${debugData.modo}`);
      console.log(`   Tracks finales: ${debugData.finalTracksCount}`);
    } else {
      console.log("⚠️  No hay datos de debug disponibles");
    }
  } catch (error) {
    console.log(`❌ Error en debug endpoint: ${error.message}`);
  }
}

// Run tests
runCompleteTests().catch(console.error);
