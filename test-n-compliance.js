#!/usr/bin/env node

/**
 * Tests para verificar cumplimiento de N siempre con recolección amplia
 * Verifica: N=30, N=100, N=200 en géneros amplios → se cumple o termina en N-5
 */

const testCases = [
  {
    name: "N=30 - Género amplio (jazz)",
    prompt: "jazz music",
    target_tracks: 30,
    expected: {
      minTracks: 25, // N-5 si escasez extrema
      maxTracks: 30, // No más de N
      collectionLog: true, // Debe tener collection_log
      note: "optional" // Puede tener note si hay escasez
    }
  },
  {
    name: "N=100 - Género amplio (rock)",
    prompt: "rock clásico de los 80",
    target_tracks: 100,
    expected: {
      minTracks: 95, // N-5 si escasez extrema
      maxTracks: 100, // No más de N
      collectionLog: true, // Debe tener collection_log
      note: "optional" // Puede tener note si hay escasez
    }
  },
  {
    name: "N=200 - Género amplio (pop)",
    prompt: "pop music hits",
    target_tracks: 200,
    expected: {
      minTracks: 195, // N-5 si escasez extrema
      maxTracks: 200, // No más de N
      collectionLog: true, // Debe tener collection_log
      note: "optional" // Puede tener note si hay escasez
    }
  },
  {
    name: "N=50 - Género específico (jazz-techno)",
    prompt: "jazz-techno fusion",
    target_tracks: 50,
    expected: {
      minTracks: 45, // N-5 si escasez extrema
      maxTracks: 50, // No más de N
      collectionLog: true, // Debe tener collection_log
      note: "optional" // Puede tener note si hay escasez
    }
  }
];

async function testNCompliance(prompt, target_tracks) {
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

function validateNCompliance(testCase, result) {
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
  const targetTracks = testCase.target_tracks;

  // Check track count compliance
  if (totalTracks < expected.minTracks) {
    errors.push(`Too few tracks: ${totalTracks} (expected ≥${expected.minTracks})`);
  }

  if (totalTracks > expected.maxTracks) {
    errors.push(`Too many tracks: ${totalTracks} (expected ≤${expected.maxTracks})`);
  }

  // Check collection log
  if (expected.collectionLog && !data.metadata?.collection_log) {
    warnings.push("Missing collection_log in metadata");
  }

  // Check note for scarcity
  if (data.metadata?.note) {
    const note = data.metadata.note;
    if (note.includes('Scarcity detected') || note.includes('Collection failed')) {
      console.log(`[N-COMPLIANCE] Scarcity note: ${note}`);
    }
  }

  // Check collection log details
  if (data.metadata?.collection_log) {
    const log = data.metadata.collection_log;
    const logSteps = ['collected', 'after_features', 'after_filters', 'after_caps', 'after_relaxation', 'final'];
    
    for (const step of logSteps) {
      if (typeof log[step] !== 'number') {
        warnings.push(`Missing or invalid ${step} in collection log`);
      }
    }
    
    // Check if collection was wide enough
    if (log.collected < 100) {
      warnings.push(`Low initial collection: ${log.collected} tracks (expected ≥100)`);
    }
    
    // Check if relaxation was applied
    if (log.after_relaxation > log.after_caps) {
      console.log(`[N-COMPLIANCE] Relaxation applied: ${log.after_caps} → ${log.after_relaxation} tracks`);
    }
  }

  // Check for generic tracks (should be minimal with wide collection)
  const genericTitles = ["Study", "Chill", "Workout", "Focus", "Ambient", "Mix", "Playlist"];
  const genericCount = data.tracks.filter(track => 
    genericTitles.some(generic => 
      track.name.toLowerCase().includes(generic.toLowerCase())
    )
  ).length;
  
  const genericPercentage = (genericCount / totalTracks) * 100;
  if (genericPercentage > 10) {
    warnings.push(`High generic content: ${genericPercentage.toFixed(1)}% (expected <10%)`);
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
  const maxAllowedTracks = Math.ceil(targetTracks * maxAllowedPercentage);
  if (maxTracksPerArtist > maxAllowedTracks) {
    warnings.push(`Artist monopoly: ${maxTracksPerArtist} tracks from one artist (max allowed: ${maxAllowedTracks})`);
  }

  // Check for recent tracks (popularity > 30)
  const recentTracks = data.tracks.filter(track => track.popularity > 30);
  const recentPercentage = (recentTracks.length / totalTracks) * 100;
  if (recentPercentage < 50) {
    warnings.push(`Low recent content: ${recentPercentage.toFixed(1)}% (expected ≥50%)`);
  }

  const stats = {
    totalTracks,
    targetTracks,
    compliance: totalTracks >= expected.minTracks && totalTracks <= expected.maxTracks,
    uniqueArtists,
    maxTracksPerArtist,
    genericPercentage: genericPercentage.toFixed(1),
    recentPercentage: recentPercentage.toFixed(1),
    collectionLog: data.metadata?.collection_log || null,
    note: data.metadata?.note || null,
    topArtists: Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => `${artist}: ${count}`)
  };

  return { errors, warnings, stats };
}

async function runNComplianceTests() {
  console.log("🎵 EJECUTANDO TESTS DE CUMPLIMIENTO DE N SIEMPRE...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    console.log(`   Target: ${testCase.target_tracks} tracks`);

    const result = await testNCompliance(testCase.prompt, testCase.target_tracks);

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error}`);
      failed++;
      continue;
    }

    const validation = validateNCompliance(testCase, result);
    
    if (validation.errors.length === 0) {
      console.log(`   ✅ PASSED`);
      console.log(`   📊 Tracks: ${validation.stats.totalTracks}/${validation.stats.targetTracks} (compliance: ${validation.stats.compliance})`);
      console.log(`   🎵 Artists: ${validation.stats.uniqueArtists}, Max per artist: ${validation.stats.maxTracksPerArtist}`);
      console.log(`   📈 Generic: ${validation.stats.genericPercentage}%, Recent: ${validation.stats.recentPercentage}%`);
      
      if (validation.stats.collectionLog) {
        const log = validation.stats.collectionLog;
        console.log(`   🔍 Collection: ${log.collected} → ${log.after_features} → ${log.after_filters} → ${log.after_caps} → ${log.after_relaxation} → ${log.final}`);
      }
      
      if (validation.stats.note) {
        console.log(`   📝 Note: ${validation.stats.note}`);
      }
      
      console.log(`   🏆 Top artists: ${validation.stats.topArtists.slice(0, 3).join(', ')}`);
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
    console.log("🎉 TODOS LOS TESTS DE CUMPLIMIENTO DE N PASARON!");
  } else {
    console.log("⚠️  ALGUNOS TESTS FALLARON - REVISAR IMPLEMENTACIÓN");
  }
}

// Run tests
runNComplianceTests().catch(console.error);
