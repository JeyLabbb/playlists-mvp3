#!/usr/bin/env node

/**
 * Tests para verificar trazado, endpoints debug y UX de control
 * Verifica: /api/debug/last, /api/playlist/refine, /api/playlist/remove, /api/playlist/more
 */

const testCases = [
  {
    name: "Debug Last Run - JSON Format",
    endpoint: "/api/debug/last?format=json",
    method: "GET",
    expected: {
      hasRunId: true,
      hasTimestamp: true,
      hasCollectionLog: true,
      hasArtistDistribution: true
    }
  },
  {
    name: "Debug Last Run - Text Format",
    endpoint: "/api/debug/last?format=text",
    method: "GET",
    expected: {
      isText: true,
      hasRunId: true,
      hasCollectionLog: true
    }
  },
  {
    name: "Refine Playlist",
    endpoint: "/api/playlist/refine",
    method: "POST",
    body: {
      currentTracks: [
        { id: "1", name: "Test Track 1", artists: ["Test Artist 1"] },
        { id: "2", name: "Test Track 2", artists: ["Test Artist 2"] }
      ],
      refinements: {
        genres: ["jazz"],
        mood: "chill",
        energy: 0.5,
        tempo: 120,
        decade: "2020s"
      },
      targetTracks: 5,
      originalPrompt: "jazz music"
    },
    expected: {
      hasTracks: true,
      hasMetadata: true,
      tracksCount: ">=2"
    }
  },
  {
    name: "Remove Track",
    endpoint: "/api/playlist/remove",
    method: "POST",
    body: {
      currentTracks: [
        { id: "1", name: "Test Track 1", artists: ["Test Artist 1"] },
        { id: "2", name: "Test Track 2", artists: ["Test Artist 2"] }
      ],
      trackToRemove: { id: "1", name: "Test Track 1", artists: ["Test Artist 1"] },
      targetTracks: 2,
      originalPrompt: "jazz music",
      blacklist: []
    },
    expected: {
      hasTracks: true,
      hasBlacklist: true,
      tracksCount: ">=1"
    }
  },
  {
    name: "Add More Tracks",
    endpoint: "/api/playlist/more",
    method: "POST",
    body: {
      currentTracks: [
        { id: "1", name: "Test Track 1", artists: ["Test Artist 1"] }
      ],
      additionalTracks: 3,
      maxTracks: 10,
      originalPrompt: "jazz music",
      originalIntent: { modo: "normal", llmShare: 0.7 }
    },
    expected: {
      hasTracks: true,
      hasMetadata: true,
      tracksCount: ">=1"
    }
  }
];

async function testEndpoint(endpoint, method = "GET", body = null) {
  try {
    const url = `http://localhost:3000${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return { success: true, data: await response.json() };
    } else {
      return { success: true, data: await response.text() };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function validateDebugResponse(testCase, result) {
  const { data } = result;
  const { expected } = testCase;
  const errors = [];
  const warnings = [];

  if (expected.isText) {
    // Text format validation
    if (typeof data !== 'string') {
      errors.push("Expected text format, got JSON");
    } else {
      if (expected.hasRunId && !data.includes('Run ID:')) {
        errors.push("Missing Run ID in text output");
      }
      if (expected.hasCollectionLog && !data.includes('COLLECTION LOG')) {
        errors.push("Missing collection log in text output");
      }
    }
  } else {
    // JSON format validation
    if (typeof data !== 'object') {
      errors.push("Expected JSON format, got text");
    } else {
      if (expected.hasRunId && !data.runId) {
        errors.push("Missing runId in JSON response");
      }
      if (expected.hasTimestamp && !data.timestamp) {
        errors.push("Missing timestamp in JSON response");
      }
      if (expected.hasCollectionLog && !data.collectionLog) {
        errors.push("Missing collectionLog in JSON response");
      }
      if (expected.hasArtistDistribution && !data.artistDistribution) {
        errors.push("Missing artistDistribution in JSON response");
      }
    }
  }

  return { errors, warnings, stats: data };
}

function validatePlaylistResponse(testCase, result) {
  const { data } = result;
  const { expected } = testCase;
  const errors = [];
  const warnings = [];

  if (!data) {
    errors.push("No data received");
    return { errors, warnings, stats: null };
  }

  // Check tracks
  if (expected.hasTracks && (!data.tracks || !Array.isArray(data.tracks))) {
    errors.push("Missing or invalid tracks array");
  }

  // Check metadata
  if (expected.hasMetadata && !data.metadata) {
    errors.push("Missing metadata");
  }

  // Check tracks count
  if (expected.tracksCount && data.tracks) {
    const tracksCount = data.tracks.length;
    const expectedCount = expected.tracksCount;
    
    if (expectedCount.startsWith('>=')) {
      const minCount = parseInt(expectedCount.replace('>=', ''));
      if (tracksCount < minCount) {
        errors.push(`Too few tracks: ${tracksCount} (expected ≥${minCount})`);
      }
    } else if (expectedCount.startsWith('<=')) {
      const maxCount = parseInt(expectedCount.replace('<=', ''));
      if (tracksCount > maxCount) {
        errors.push(`Too many tracks: ${tracksCount} (expected ≤${maxCount})`);
      }
    }
  }

  // Check blacklist for remove endpoint
  if (expected.hasBlacklist && data.blacklist === undefined) {
    errors.push("Missing blacklist in response");
  }

  const stats = {
    tracksCount: data.tracks?.length || 0,
    hasMetadata: !!data.metadata,
    hasBlacklist: data.blacklist !== undefined,
    blacklistSize: data.blacklist?.length || 0
  };

  return { errors, warnings, stats };
}

async function runDebugAndControlTests() {
  console.log("🎵 EJECUTANDO TESTS DE TRAZADO Y CONTROLES UX...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   Endpoint: ${testCase.method} ${testCase.endpoint}`);

    const result = await testEndpoint(testCase.endpoint, testCase.method, testCase.body);

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error}`);
      failed++;
      continue;
    }

    let validation;
    if (testCase.endpoint.includes('/debug/')) {
      validation = validateDebugResponse(testCase, result);
    } else {
      validation = validatePlaylistResponse(testCase, result);
    }
    
    if (validation.errors.length === 0) {
      console.log(`   ✅ PASSED`);
      
      if (testCase.endpoint.includes('/debug/')) {
        if (typeof validation.stats === 'string') {
          console.log(`   📄 Text output length: ${validation.stats.length} characters`);
        } else {
          console.log(`   📊 Run ID: ${validation.stats.runId}`);
          console.log(`   ⏰ Timestamp: ${validation.stats.timestamp}`);
          console.log(`   📈 Collection log: ${validation.stats.collectionLog ? 'Present' : 'Missing'}`);
        }
      } else {
        console.log(`   🎵 Tracks: ${validation.stats.tracksCount}`);
        console.log(`   📊 Metadata: ${validation.stats.hasMetadata ? 'Present' : 'Missing'}`);
        if (validation.stats.hasBlacklist) {
          console.log(`   🚫 Blacklist: ${validation.stats.blacklistSize} tracks`);
        }
      }
      
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
    console.log("🎉 TODOS LOS TESTS DE TRAZADO Y CONTROLES PASARON!");
  } else {
    console.log("⚠️  ALGUNOS TESTS FALLARON - REVISAR IMPLEMENTACIÓN");
  }
}

// Run tests
runDebugAndControlTests().catch(console.error);
