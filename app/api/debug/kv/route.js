import { NextResponse } from 'next/server';

// Check if Vercel KV is available
function hasKV() {
  return !!(process.env.UPSTASH_REDIS_KV_REST_API_URL && process.env.UPSTASH_REDIS_KV_REST_API_TOKEN);
}

// Test KV connection
async function testKVConnection() {
  if (!hasKV()) {
    return {
      ok: false,
      error: 'KV environment variables not set',
      missing: {
        UPSTASH_REDIS_KV_REST_API_URL: !process.env.UPSTASH_REDIS_KV_REST_API_URL,
        UPSTASH_REDIS_KV_REST_API_TOKEN: !process.env.UPSTASH_REDIS_KV_REST_API_TOKEN
      }
    };
  }

  try {
    const kv = await import('@vercel/kv');
    
    // Test basic KV connection with a simple get operation
    const testKey = 'kv-test-connection';
    await kv.kv.get(testKey);

    // Try to get some trending playlists to verify data access
    const trendingKeys = await kv.kv.keys('trending:*');
    const trendingCount = trendingKeys.length;

    return {
      ok: true,
      message: 'KV connection successful',
      trendingPlaylists: trendingCount,
      env: {
        hasUrl: !!process.env.UPSTASH_REDIS_KV_REST_API_URL,
        hasToken: !!process.env.UPSTASH_REDIS_KV_REST_API_TOKEN,
        urlLength: process.env.UPSTASH_REDIS_KV_REST_API_URL?.length || 0,
        tokenLength: process.env.UPSTASH_REDIS_KV_REST_API_TOKEN?.length || 0
      }
    };

  } catch (error) {
    return {
      ok: false,
      error: `KV connection error: ${error.message}`,
      details: error.toString()
    };
  }
}

// GET: Check KV status
export async function GET() {
  try {
    const kvStatus = await testKVConnection();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...kvStatus
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Failed to check KV status',
      details: error.message
    }, { status: 500 });
  }
}

// POST: Seed trending playlists (for testing)
export async function POST(request) {
  try {
    const kvStatus = await testKVConnection();
    
    if (!kvStatus.ok) {
      return NextResponse.json({
        error: 'Cannot seed data - KV not available',
        kvStatus
      }, { status: 400 });
    }

    // Sample trending playlists to seed
    const samplePlaylists = [
      {
        prompt: "reggaeton underground español 2024",
        clicks: 156,
        views: 1243,
        creator: "jeylabbb",
        privacy: "public",
        createdAt: new Date().toISOString(),
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS",
        trackCount: 50
      },
      {
        prompt: "música para estudiar sin distracciones",
        clicks: 89,
        views: 567,
        creator: "musiclover",
        privacy: "public",
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8jpyvTAre41",
        trackCount: 50
      },
      {
        prompt: "hits latinos para el verano 2024",
        clicks: 234,
        views: 1890,
        creator: "summervibes",
        privacy: "public",
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8h3q2QqJj2N",
        trackCount: 50
      },
      {
        prompt: "chill beats para trabajar desde casa",
        clicks: 67,
        views: 423,
        creator: "wfh_music",
        privacy: "public",
        createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        trackCount: 50
      },
      {
        prompt: "rock español clásico de los 90s",
        clicks: 145,
        views: 987,
        creator: "rockfan",
        privacy: "public",
        createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX9QY2w5G5W9m",
        trackCount: 50
      }
    ];

    // Store each playlist in KV
    const results = [];
    const kv = await import('@vercel/kv');
    
    for (let i = 0; i < samplePlaylists.length; i++) {
      const playlist = samplePlaylists[i];
      const key = `trending:${Date.now()}-${i}`;
      
      try {
        await kv.kv.set(key, playlist);
        results.push({ key, success: true, playlist: playlist.prompt });
      } catch (error) {
        results.push({ key, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      message: `Seeded ${successCount}/${samplePlaylists.length} trending playlists`,
      results,
      totalPlaylists: samplePlaylists.length,
      successful: successCount
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to seed trending playlists',
      details: error.message
    }, { status: 500 });
  }
}