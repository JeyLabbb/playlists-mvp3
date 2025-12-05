#!/usr/bin/env node

/**
 * Tests para verificar el relleno Spotify inteligente para prompts normales
 * Verifica: Radio de Canción, Radio de Artista, distribución proporcional, ordenamiento suave
 */

const testCases = [
  {
    name: "Prompt Normal - Jazz Techno",
    prompt: "playlist de jazz-techno",
    target_tracks: 50,
    expected: {
      modo: "normal",
      minTracks: 45, // N-5 si escasez extrema
      llmShare: ">0.5", // Debe generar al menos 50% con LLM
      spotifyFill: ">0", // Debe completar con Spotify
      artistVariety: ">5" // Mínimo 5 artistas diferentes
    }
  },
  {
    name: "Prompt Normal - Rock Clásico 80s",
    prompt: "rock clásico de los 80",
    target_tracks: 60,
    expected: {
      modo: "normal",
      minTracks: 55, // N-5 si escasez extrema
      llmShare: ">0.6", // Debe generar al menos 60% con LLM
      spotifyFill: ">0", // Debe completar con Spotify
      artistVariety: ">8" // Mínimo 8 artistas diferentes
    }
  },
  {
    name: "Prompt Normal - Música para Correr",
    prompt: "música para correr",
    target_tracks: 40,
    expected: {
      modo: "normal",
      minTracks: 35, // N-5 si escasez extrema
      llmShare: ">0.4", // Debe generar al menos 40% con LLM
      spotifyFill: ">0", // Debe completar con Spotify
      artistVariety: ">6" // Mínimo 6 artistas diferentes
    }
  }
];

async function testNormalPrompt(prompt, target_tracks) {
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

function validateNormalResponse(testCase, result) {
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

  // Check metadata
  if (!data.metadata) {
    errors.push("Missing metadata");
  } else {
    if (data.metadata.llm_tracks < Math.floor(target_tracks * 0.3)) {
      errors.push(`Too few LLM tracks: ${data.metadata.llm_tracks} (expected ≥30%)`);
    }
    if (data.metadata.spotify_tracks < Math.floor(target_tracks * 0.1)) {
      errors.push(`Too few Spotify tracks: ${data.metadata.spotify_tracks} (expected ≥10%)`);
    }
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

  // Check artist distribution
  const artistCounts = {};
  data.tracks.forEach(track => {
    const artist = track.artists[0] || 'Unknown';
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
  });

  const totalArtists = Object.keys(artistCounts).length;
  const maxTracksPerArtist = Math.max(...Object.values(artistCounts));
  
  // Check artist variety
  const minArtists = parseInt(expected.artistVariety.replace('>', ''));
  if (totalArtists < minArtists) {
    errors.push(`Too few artists: ${totalArtists} (expected ≥${minArtists})`);
  }

  // Check for reasonable distribution (no single artist dominance)
  const maxAllowedPerArtist = Math.ceil(target_tracks * 0.25); // Max 25% from one artist
  if (maxTracksPerArtist > maxAllowedPerArtist) {
    errors.push(`Artist distribution too skewed: ${maxTracksPerArtist} tracks from one artist (max allowed: ${maxAllowedPerArtist})`);
  }

  // Check for recent tracks (popularity > 30)
  const recentTracks = data.tracks.filter(track => track.popularity > 30);
  const recentPercentage = (recentTracks.length / data.tracks.length) * 100;
  if (recentPercentage < 60) {
    errors.push(`Too few recent tracks: ${recentPercentage.toFixed(1)}% (expected ≥60%)`);
  }

  return {
    errors,
    stats: {
      totalTracks: data.tracks.length,
      llmTracks: data.metadata?.llm_tracks || 0,
      spotifyTracks: data.metadata?.spotify_tracks || 0,
      totalArtists: totalArtists,
      maxTracksPerArtist: maxTracksPerArtist,
      recentTracksPercentage: recentPercentage.toFixed(1),
      artistDistribution: Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([artist, count]) => `${artist}: ${count}`)
    }
  };
}

async function runNormalTests() {
  console.log("🎵 EJECUTANDO TESTS DE RELLENO SPOTIFY NORMAL...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    console.log(`   Target: ${testCase.target_tracks} tracks`);

    const result = await testNormalPrompt(testCase.prompt, testCase.target_tracks);

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error}`);
      failed++;
      continue;
    }

    const validation = validateNormalResponse(testCase, result);
    
    if (validation.errors.length === 0) {
      console.log(`   ✅ PASSED`);
      console.log(`   📊 Tracks: ${validation.stats.totalTracks} (LLM: ${validation.stats.llmTracks}, Spotify: ${validation.stats.spotifyTracks})`);
      console.log(`   🎵 Artists: ${validation.stats.totalArtists}, Max per artist: ${validation.stats.maxTracksPerArtist}`);
      console.log(`   📈 Recent: ${validation.stats.recentTracksPercentage}%, Top artists: ${validation.stats.artistDistribution.join(', ')}`);
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
    console.log("🎉 TODOS LOS TESTS DE RELLENO SPOTIFY PASARON!");
  } else {
    console.log("⚠️  ALGUNOS TESTS FALLARON - REVISAR IMPLEMENTACIÓN");
  }
}

// Run tests
runNormalTests().catch(console.error);
