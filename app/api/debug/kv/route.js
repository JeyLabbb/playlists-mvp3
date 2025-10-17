import { NextResponse } from 'next/server';

// Check if Vercel KV is available
function hasKV() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

// Test KV connection
async function testKVConnection() {
  if (!hasKV()) {
    return {
      ok: false,
      error: 'KV environment variables not set',
      missing: {
        KV_REST_API_URL: !process.env.KV_REST_API_URL,
        KV_REST_API_TOKEN: !process.env.KV_REST_API_TOKEN
      }
    };
  }

  try {
    // Test basic KV connection with a simple get operation
    const testKey = 'kv-test-connection';
    const response = await fetch(`${process.env.KV_REST_API_URL}/get/${testKey}`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `KV connection failed with status ${response.status}`,
        status: response.status
      };
    }

    // Try to get some trending playlists to verify data access
    const trendingResponse = await fetch(`${process.env.KV_REST_API_URL}/keys/trending:*`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    let trendingCount = 0;
    if (trendingResponse.ok) {
      const trendingData = await trendingResponse.json();
      trendingCount = Array.isArray(trendingData.result) ? trendingData.result.length : 0;
    }

    return {
      ok: true,
      message: 'KV connection successful',
      trendingPlaylists: trendingCount,
      env: {
        hasUrl: !!process.env.KV_REST_API_URL,
        hasToken: !!process.env.KV_REST_API_TOKEN,
        urlLength: process.env.KV_REST_API_URL?.length || 0,
        tokenLength: process.env.KV_REST_API_TOKEN?.length || 0
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
        spotifyUrl: "https://open.spotify.com/playlist/sample1"
      },
      {
        prompt: "música para estudiar sin distracciones",
        clicks: 89,
        views: 567,
        creator: "musiclover",
        privacy: "public",
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        spotifyUrl: "https://open.spotify.com/playlist/sample2"
      },
      {
        prompt: "hits latinos para el verano 2024",
        clicks: 234,
        views: 1890,
        creator: "summervibes",
        privacy: "public",
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        spotifyUrl: "https://open.spotify.com/playlist/sample3"
      },
      {
        prompt: "chill beats para trabajar desde casa",
        clicks: 67,
        views: 423,
        creator: "wfh_music",
        privacy: "public",
        createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        spotifyUrl: "https://open.spotify.com/playlist/sample4"
      },
      {
        prompt: "rock español clásico de los 90s",
        clicks: 145,
        views: 987,
        creator: "rockfan",
        privacy: "public",
        createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        spotifyUrl: "https://open.spotify.com/playlist/sample5"
      }
    ];

    // Store each playlist in KV
    const results = [];
    for (let i = 0; i < samplePlaylists.length; i++) {
      const playlist = samplePlaylists[i];
      const key = `trending:${Date.now()}-${i}`;
      
      try {
        const response = await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            value: JSON.stringify(playlist)
          })
        });

        if (response.ok) {
          results.push({ key, success: true, playlist: playlist.prompt });
        } else {
          results.push({ key, success: false, error: `Status ${response.status}` });
        }
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
