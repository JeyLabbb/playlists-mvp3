#!/usr/bin/env node

/**
 * Tests para verificar caps dinámicos y variedad por artista
 * Verifica: N=100 con A grande → no más de 1-2 por artista; N=50 con A pequeño → puede subir a 3-4
 */

const testCases = [
  {
    name: "N=100 con muchos artistas (festival grande)",
    prompt: "festival Coachella 2024",
    target_tracks: 100,
    expected: {
      modo: "festival",
      maxTracksPerArtist: 2, // Máximo 2 por artista para festivales grandes
      artistVariety: ">30", // Mínimo 30 artistas diferentes
      distribution: "balanced" // Distribución equilibrada
    }
  },
  {
    name: "N=50 con pocos artistas (festival pequeño)",
    prompt: "festival Groove Pamplona 2025",
    target_tracks: 50,
    expected: {
      modo: "festival",
      maxTracksPerArtist: 4, // Puede subir a 3-4 para festivales pequeños
      artistVariety: ">10", // Mínimo 10 artistas diferentes
      distribution: "balanced" // Distribución equilibrada
    }
  },
  {
    name: "N=60 normal con artistas variados",
    prompt: "rock clásico de los 80",
    target_tracks: 60,
    expected: {
      modo: "normal",
      maxTracksPerArtist: 5, // Puede subir más en modo normal
      artistVariety: ">15", // Mínimo 15 artistas diferentes
      distribution: "balanced" // Distribución equilibrada
    }
  }
];

async function testArtistVariety(prompt, target_tracks) {
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

function validateArtistDistribution(testCase, result) {
  const { data } = result;
  const { expected } = testCase;
  const errors = [];
  const warnings = [];

  // Check basic structure
  if (!data.tracks || !Array.isArray(data.tracks)) {
    errors.push("Missing or invalid tracks array");
    return { errors, warnings, stats: null };
  }

  // Calculate artist distribution
  const artistCounts = {};
  data.tracks.forEach(track => {
    const artistName = track.artists[0] || 'Unknown';
    artistCounts[artistName] = (artistCounts[artistName] || 0) + 1;
  });

  const totalTracks = data.tracks.length;
  const uniqueArtists = Object.keys(artistCounts).length;
  const counts = Object.values(artistCounts);
  const maxTracksPerArtist = Math.max(...counts);
  const minTracksPerArtist = Math.min(...counts);

  // Calculate distribution metrics
  const mean = totalTracks / uniqueArtists;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / uniqueArtists;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = standardDeviation / mean;

  // Check track count
  if (totalTracks < target_tracks - 5) {
    errors.push(`Too few tracks: ${totalTracks} (expected ≥${target_tracks - 5})`);
  }

  // Check artist variety
  const minArtists = parseInt(expected.artistVariety.replace('>', ''));
  if (uniqueArtists < minArtists) {
    errors.push(`Too few artists: ${uniqueArtists} (expected ≥${minArtists})`);
  }

  // Check max tracks per artist
  if (maxTracksPerArtist > expected.maxTracksPerArtist) {
    errors.push(`Too many tracks per artist: ${maxTracksPerArtist} (expected ≤${expected.maxTracksPerArtist})`);
  }

  // Check for artist monopolies (no single artist should have >25% of tracks)
  const maxAllowedPercentage = 0.25;
  const maxAllowedTracks = Math.ceil(totalTracks * maxAllowedPercentage);
  if (maxTracksPerArtist > maxAllowedTracks) {
    errors.push(`Artist monopoly detected: ${maxTracksPerArtist} tracks from one artist (max allowed: ${maxAllowedTracks})`);
  }

  // Check distribution balance
  if (coefficientOfVariation > 0.5) {
    warnings.push(`High distribution variance: ${coefficientOfVariation.toFixed(3)} (expected <0.5)`);
  }

  // Check for clusters (consecutive tracks from same artist)
  let clusterCount = 0;
  let currentArtist = null;
  let currentClusterSize = 0;
  
  data.tracks.forEach(track => {
    const artistName = track.artists[0] || 'Unknown';
    if (artistName === currentArtist) {
      currentClusterSize++;
      if (currentClusterSize > 2) { // More than 2 consecutive tracks from same artist
        clusterCount++;
      }
    } else {
      currentArtist = artistName;
      currentClusterSize = 1;
    }
  });

  if (clusterCount > 0) {
    warnings.push(`Found ${clusterCount} artist clusters (consecutive tracks from same artist)`);
  }

  // Calculate distribution score
  const diversityScore = uniqueArtists / totalTracks;
  const dominancePenalty = maxTracksPerArtist / totalTracks;
  const distributionScore = diversityScore - dominancePenalty;

  const stats = {
    totalTracks,
    uniqueArtists,
    maxTracksPerArtist,
    minTracksPerArtist,
    mean,
    standardDeviation,
    coefficientOfVariation,
    diversityScore: diversityScore.toFixed(3),
    dominancePenalty: dominancePenalty.toFixed(3),
    distributionScore: distributionScore.toFixed(3),
    clusterCount,
    topArtists: Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist, count]) => `${artist}: ${count}`)
  };

  return { errors, warnings, stats };
}

async function runArtistVarietyTests() {
  console.log("🎵 EJECUTANDO TESTS DE VARIEDAD POR ARTISTA...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    console.log(`   Target: ${testCase.target_tracks} tracks`);

    const result = await testArtistVariety(testCase.prompt, testCase.target_tracks);

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error}`);
      failed++;
      continue;
    }

    const validation = validateArtistDistribution(testCase, result);
    
    if (validation.errors.length === 0) {
      console.log(`   ✅ PASSED`);
      console.log(`   📊 Tracks: ${validation.stats.totalTracks}, Artists: ${validation.stats.uniqueArtists}`);
      console.log(`   🎵 Max per artist: ${validation.stats.maxTracksPerArtist}, Distribution score: ${validation.stats.distributionScore}`);
      console.log(`   📈 Diversity: ${validation.stats.diversityScore}, Dominance: ${validation.stats.dominancePenalty}`);
      if (validation.stats.clusterCount > 0) {
        console.log(`   ⚠️  Clusters: ${validation.stats.clusterCount}`);
      }
      console.log(`   🏆 Top artists: ${validation.stats.topArtists.slice(0, 5).join(', ')}`);
      passed++;
    } else {
      console.log(`   ❌ FAILED:`);
      validation.errors.forEach(error => console.log(`      - ${error}`));
      if (validation.warnings.length > 0) {
        console.log(`   ⚠️  WARNINGS:`);
        validation.warnings.forEach(warning => console.log(`      - ${warning}`));
      }
      console.log(`   📊 Stats:`, validation.stats);
      failed++;
    }
    console.log("");
  }

  console.log(`\n📈 RESULTADOS: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log("🎉 TODOS LOS TESTS DE VARIEDAD POR ARTISTA PASARON!");
  } else {
    console.log("⚠️  ALGUNOS TESTS FALLARON - REVISAR IMPLEMENTACIÓN");
  }
}

// Run tests
runArtistVarietyTests().catch(console.error);
