import { NextResponse } from 'next/server';

// Check if Vercel KV is available
function hasKV() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

// Get all trending playlists from KV
async function getAllTrendingPlaylists() {
  try {
    const allPlaylists = [];
    
    // Get user playlists (existing functionality)
    const userPlaylistsResponse = await fetch(`${process.env.KV_REST_API_URL}/keys/userplaylists:*`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (userPlaylistsResponse.ok) {
      const userData = await userPlaylistsResponse.json();
      
      // Get each user's playlists
      for (const key of userData.result || []) {
        const playlistResponse = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (playlistResponse.ok) {
          const playlistData = await playlistResponse.json();
          if (playlistData.result) {
            // Handle double-encoded JSON from KV
            let parsed = JSON.parse(playlistData.result);
            
            // If result has a 'value' property, it's double-encoded
            if (parsed && typeof parsed === 'object' && parsed.value) {
              parsed = JSON.parse(parsed.value);
            }
            
            if (Array.isArray(parsed)) {
              allPlaylists.push(...parsed);
            }
          }
        }
      }
    }
    
    // Get trending playlists (new functionality)
    const trendingResponse = await fetch(`${process.env.KV_REST_API_URL}/keys/trending:*`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (trendingResponse.ok) {
      const trendingData = await trendingResponse.json();
      
      // Get each trending playlist
      for (const key of trendingData.result || []) {
        const playlistResponse = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (playlistResponse.ok) {
          const playlistData = await playlistResponse.json();
          if (playlistData.result) {
            try {
              let parsed = JSON.parse(playlistData.result);
              
              // Handle double-encoded JSON from KV (same as user playlists)
              if (parsed && typeof parsed === 'object' && parsed.value) {
                parsed = JSON.parse(parsed.value);
              }
              
              // Extract Spotify playlist ID from URL
              const spotifyId = parsed.spotifyUrl ? 
                parsed.spotifyUrl.split('/').pop() : 
                key.replace('trending:', '');
              
              // Convert trending format to user playlist format
              const convertedPlaylist = {
                playlistId: spotifyId,
                prompt: parsed.prompt || 'Playlist trending',
                name: parsed.prompt || 'Playlist trending',
                url: parsed.spotifyUrl || '#',
                tracks: parsed.trackCount || 20,
                views: parsed.views || 0,
                clicks: parsed.clicks || 0,
                createdAt: parsed.createdAt || new Date().toISOString(),
                updatedAt: parsed.createdAt || new Date().toISOString(),
                public: parsed.privacy === 'public',
                username: parsed.creator || 'jeylabbb',
                userEmail: `${parsed.creator || 'jeylabbb'}@example.com`,
                userName: parsed.creator || 'JeyLabbb User',
                userImage: null,
                isTrending: true // Mark as trending playlist
              };
              
              allPlaylists.push(convertedPlaylist);
            } catch (parseError) {
              console.warn('Error parsing trending playlist:', parseError);
            }
          }
        }
      }
    }
    
    return allPlaylists;
  } catch (error) {
    console.warn('Error getting all trending playlists from KV:', error);
    return [];
  }
}

// Generate dynamic playlist name using OpenAI
async function generateDynamicName(prompt) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        messages: [
          {
            role: 'system',
            content: `Genera un nombre de playlist profesional y atractivo basado en el prompt del usuario. 
            El nombre debe ser:
            - Breve (máximo 30 caracteres)
            - Estilizado y profesional
            - Atractivo visualmente
            - Mantener el tema/genre del prompt
            - Incluir emojis apropiados si es necesario
            - NO incluir "by JeyLabbb" (se agregará después)
            
            Ejemplos:
            "trap español para activarme" → "Trap Español 🔥 (Modo Activo)"
            "techno suave 2020s" → "Chill Techno (2020–2024 mix)"
            "reggaeton como Bad Bunny" → "Reggaeton Vibes 🎵"
            
            Responde SOLO con el nombre de la playlist, sin explicaciones adicionales.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || `Playlist IA ${new Date().getFullYear()}`;
  } catch (error) {
    console.error('Error generating dynamic name:', error);
    return `Playlist IA ${new Date().getFullYear()}`;
  }
}

// POST: Register new trending playlist (deprecated - now handled by userplaylists)
export async function POST(request) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Playlists are now automatically registered when created through userplaylists',
      deprecated: true
    });
  } catch (error) {
    console.error('Error in trending POST:', error);
    return NextResponse.json({ error: 'Endpoint deprecated' }, { status: 500 });
  }
}

// GET: Retrieve trending playlists (public only with author info)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;
    const sortBy = searchParams.get('sortBy') || 'recent'; // 'recent', 'views', 'clicks'

    let playlists = [];

    // Try KV first
    if (hasKV()) {
      console.log('[TRENDING] KV is available, fetching playlists...');
      const allPlaylists = await getAllTrendingPlaylists();
      console.log(`[TRENDING] Found ${allPlaylists.length} total playlists from KV`);
      
      // Filter only public playlists, remove duplicates, and add author info
      const seenIds = new Set();
      playlists = allPlaylists
        .filter(playlist => playlist.public === true) // Default to true for legacy playlists
        .filter(playlist => {
          // Remove playlists with fake IDs (sample1, sample2, etc.)
          if (playlist.playlistId.startsWith('sample') || playlist.playlistId.startsWith('176071')) {
            return false;
          }
          // Remove duplicates
          if (seenIds.has(playlist.playlistId)) {
            return false;
          }
          seenIds.add(playlist.playlistId);
          return true;
        })
        .map(playlist => ({
          id: playlist.playlistId,
          prompt: playlist.prompt || 'Playlist creada',
          playlistName: playlist.name,
          playlistId: playlist.playlistId,
          spotifyUrl: playlist.url,
          trackCount: playlist.tracks || 0,
          views: playlist.views || 0,
          clicks: playlist.clicks || 0,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt || playlist.createdAt,
          author: {
            username: playlist.username || playlist.userEmail?.split('@')[0] || 'unknown',
            displayName: playlist.userName || playlist.userEmail?.split('@')[0] || 'Usuario',
            image: playlist.userImage || null
          }
        }));
      
      console.log(`[TRENDING] Found ${playlists.length} public playlists after filtering`);
    }

    // If no KV, return fallback message but still return empty array
    if (!hasKV()) {
      console.log('[TRENDING] KV not available, returning empty array');
      return NextResponse.json({
        success: true,
        playlists: [],
        fallback: true,
        message: 'KV not available - trending playlists require server storage',
        error: 'Server storage not configured'
      });
    }

    // Sort playlists
    let sortedPlaylists = [...playlists];
    
    switch (sortBy) {
      case 'views':
        sortedPlaylists.sort((a, b) => (b.views || 0) - (a.views || 0) || new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'clicks':
        sortedPlaylists.sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'recent':
      default:
        sortedPlaylists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    const limitedPlaylists = sortedPlaylists.slice(0, limit);

    console.log(`[TRENDING] Returning ${limitedPlaylists.length} playlists (total: ${playlists.length})`);

    return NextResponse.json({
      success: true,
      playlists: limitedPlaylists,
      total: playlists.length,
      source: 'kv'
    });

  } catch (error) {
    console.error('Error retrieving trending playlists:', error);
    
    // Fallback: Return example playlists if KV fails
    console.log('[TRENDING] KV failed, using fallback example playlists');
    const fallbackPlaylists = [
      {
        id: "37i9dQZF1DX8Uebhn9wzrS",
        prompt: "reggaeton underground español 2024",
        playlistName: "reggaeton underground español 2024",
        playlistId: "37i9dQZF1DX8Uebhn9wzrS",
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS",
        trackCount: 50,
        views: 1243,
        clicks: 156,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: {
          username: "jeylabbb",
          displayName: "jeylabbb",
          image: null
        }
      },
      {
        id: "37i9dQZF1DX8jpyvTAre41",
        prompt: "música para estudiar sin distracciones",
        playlistName: "música para estudiar sin distracciones",
        playlistId: "37i9dQZF1DX8jpyvTAre41",
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8jpyvTAre41",
        trackCount: 50,
        views: 567,
        clicks: 89,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        author: {
          username: "musiclover",
          displayName: "musiclover",
          image: null
        }
      },
      {
        id: "37i9dQZF1DX8h3q2QqJj2N",
        prompt: "hits latinos para el verano 2024",
        playlistName: "hits latinos para el verano 2024",
        playlistId: "37i9dQZF1DX8h3q2QqJj2N",
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8h3q2QqJj2N",
        trackCount: 50,
        views: 1890,
        clicks: 234,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
        author: {
          username: "summervibes",
          displayName: "summervibes",
          image: null
        }
      },
      {
        id: "37i9dQZF1DXcBWIGoYBM5M",
        prompt: "chill beats para trabajar desde casa",
        playlistName: "chill beats para trabajar desde casa",
        playlistId: "37i9dQZF1DXcBWIGoYBM5M",
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        trackCount: 50,
        views: 423,
        clicks: 67,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString(),
        author: {
          username: "wfh_music",
          displayName: "wfh_music",
          image: null
        }
      },
      {
        id: "37i9dQZF1DX9QY2w5G5W9m",
        prompt: "rock español clásico de los 90s",
        playlistName: "rock español clásico de los 90s",
        playlistId: "37i9dQZF1DX9QY2w5G5W9m",
        spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX9QY2w5G5W9m",
        trackCount: 50,
        views: 987,
        clicks: 145,
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 345600000).toISOString(),
        author: {
          username: "rockfan",
          displayName: "rockfan",
          image: null
        }
      }
    ];

    return NextResponse.json({
      success: true,
      playlists: fallbackPlaylists,
      total: fallbackPlaylists.length,
      source: 'fallback'
    });
  }
}

// PUT: Update playlist metrics (now delegated to /api/metrics)
export async function PUT(request) {
  try {
    return NextResponse.json({
      success: false,
      message: 'This endpoint is deprecated. Use /api/metrics instead.',
      deprecated: true
    });
  } catch (error) {
    console.error('Error in trending PUT:', error);
    return NextResponse.json({ error: 'Endpoint deprecated' }, { status: 500 });
  }
}