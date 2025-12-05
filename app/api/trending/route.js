import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { normalizeUsername } from '@/lib/social/usernameUtils';

// Check if Vercel KV is available
function hasKV() {
  return !!(process.env.UPSTASH_REDIS_KV_REST_API_URL && process.env.UPSTASH_REDIS_KV_REST_API_TOKEN);
}

// Fallback playlists when KV is not available or empty
function getFallbackPlaylists() {
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

// Get all trending playlists from KV
async function getAllTrendingPlaylists() {
  try {
    const kv = await import('@vercel/kv');
    const allPlaylists = [];
    
    // Get user playlists
    const userPlaylistKeys = await kv.kv.keys('userplaylists:*');
    
    for (const key of userPlaylistKeys) {
      try {
        const playlists = await kv.kv.get(key);
        if (Array.isArray(playlists)) {
          allPlaylists.push(...playlists);
        }
      } catch (err) {
        console.warn('Error getting user playlists for key:', key, err);
      }
    }
    
    // Get trending playlists
    const trendingKeys = await kv.kv.keys('trending:*');
    
    for (const key of trendingKeys) {
      try {
        const playlist = await kv.kv.get(key);
        if (playlist) {
          // Extract Spotify playlist ID from URL
          const spotifyId = playlist.spotifyUrl ? 
            playlist.spotifyUrl.split('/').pop() : 
            key.replace('trending:', '');
          
          // Convert trending format to user playlist format
          const convertedPlaylist = {
            playlistId: spotifyId,
            prompt: playlist.prompt || 'Playlist trending',
            name: playlist.prompt || 'Playlist trending',
            url: playlist.spotifyUrl || '#',
            tracks: playlist.trackCount || 20,
            views: playlist.views || 0,
            clicks: playlist.clicks || 0,
            createdAt: playlist.createdAt || new Date().toISOString(),
            updatedAt: playlist.createdAt || new Date().toISOString(),
            public: playlist.privacy === 'public',
            username: playlist.creator || 'jeylabbb',
            userEmail: `${playlist.creator || 'jeylabbb'}@example.com`,
            userName: playlist.creator || 'JeyLabbb User',
            userImage: null,
            isTrending: true // Mark as trending playlist
          };
          
          allPlaylists.push(convertedPlaylist);
        }
      } catch (err) {
        console.warn('Error getting trending playlist for key:', key, err);
      }
    }
    
    return allPlaylists;
  } catch (error) {
    console.warn('Error getting all trending playlists from KV:', error);
    return [];
  }
}

// Get playlists from Supabase as fallback
async function getPlaylistsFromSupabase() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[TRENDING] Supabase admin not configured');
      return [];
    }

    console.log('[TRENDING] Fetching playlists from Supabase...');
    
    // Get playlists from Supabase (try with public column first, fallback to all if column doesn't exist)
    let { data: playlists, error } = await supabase
      .from('playlists')
      .select('id, user_email, playlist_name, prompt, spotify_url, track_count, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    
    // If error is about missing column, try without public filter
    if (error && error.code === '42703') {
      console.log('[TRENDING] public column not found, fetching all playlists...');
      const retry = await supabase
        .from('playlists')
        .select('id, user_email, playlist_name, prompt, spotify_url, track_count, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      playlists = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('[TRENDING] Error fetching playlists from Supabase:', error);
      return [];
    }

    if (!playlists || playlists.length === 0) {
      console.log('[TRENDING] No public playlists found in Supabase');
      return [];
    }

    console.log(`[TRENDING] Found ${playlists.length} playlists from Supabase`);

    // Get user details for each playlist
    const userEmails = [...new Set(playlists.map(p => p.user_email).filter(Boolean))];
    const userDetailsMap = new Map();

    if (userEmails.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, username')
        .in('email', userEmails);

      if (users) {
        // Get user images from Supabase auth
        const { getSupabaseAdmin } = await import('@/lib/supabase/server');
        const adminSupabase = getSupabaseAdmin();
        
        for (const user of users) {
          if (user.email && user.id) {
            let userImage = null;
            
            // Try to get image from Supabase auth
            if (adminSupabase) {
              try {
                const { data: authUser } = await adminSupabase.auth.admin.getUserById(user.id);
                if (authUser?.user?.user_metadata?.avatar_url) {
                  userImage = authUser.user.user_metadata.avatar_url;
                }
              } catch (authError) {
                console.warn(`[TRENDING] Could not fetch image for user ${user.email}:`, authError);
              }
            }
            
            userDetailsMap.set(user.email.toLowerCase(), {
              username: user.username || null,
              email: user.email,
              image: userImage
            });
          }
        }
      }
    }

    // Convert Supabase playlists to the expected format
    const formattedPlaylists = playlists.map(playlist => {
      const userDetails = userDetailsMap.get(playlist.user_email?.toLowerCase()) || {};
      const rawUsername = userDetails.username || playlist.user_email?.split('@')[0] || 'unknown';
      const normalized = normalizeUsername(rawUsername);

      return {
        playlistId: playlist.id,
        prompt: playlist.prompt || 'Playlist creada',
        name: playlist.playlist_name || playlist.prompt || 'Playlist',
        url: playlist.spotify_url || '#',
        tracks: playlist.track_count || 0,
        views: 0, // Supabase doesn't track views yet
        clicks: 0, // Supabase doesn't track clicks yet
        createdAt: playlist.created_at || new Date().toISOString(),
        updatedAt: playlist.created_at || new Date().toISOString(),
        public: true, // Assume all playlists from Supabase are public for trending
        username: normalized || rawUsername,
        userEmail: playlist.user_email,
        userName: userDetails.username || playlist.user_email?.split('@')[0] || 'Usuario',
        userImage: userDetails.image || null
      };
    });

    return formattedPlaylists;
  } catch (error) {
    console.error('[TRENDING] Error in getPlaylistsFromSupabase:', error);
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
      
      // Get user emails to fetch profile images
      const userEmails = [...new Set(allPlaylists.map(p => p.userEmail).filter(Boolean))];
      const userImagesMap = new Map();
      
      // Fetch profile images from KV and Supabase auth
      if (userEmails.length > 0 && hasKV()) {
        try {
          const kv = await import('@vercel/kv');
          const supabase = getSupabaseAdmin();
          
          // Get profiles from KV
          for (const email of userEmails) {
            try {
              const profile = await kv.kv.get(`jey_user_profile:${email}`);
              if (profile?.image) {
                userImagesMap.set(email.toLowerCase(), profile.image);
              }
            } catch (kvError) {
              console.warn(`[TRENDING] Could not get profile from KV for ${email}:`, kvError);
            }
            
            // If no image in KV, try Supabase auth
            if (!userImagesMap.has(email.toLowerCase()) && supabase) {
              try {
                const { data: user } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', email.toLowerCase())
                  .maybeSingle();
                
                if (user?.id) {
                  const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
                  if (authUser?.user?.user_metadata?.avatar_url) {
                    userImagesMap.set(email.toLowerCase(), authUser.user.user_metadata.avatar_url);
                  }
                }
              } catch (authError) {
                console.warn(`[TRENDING] Could not get image from auth for ${email}:`, authError);
              }
            }
          }
        } catch (error) {
          console.warn('[TRENDING] Error fetching user images:', error);
        }
      }
      
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
        .map(playlist => {
          const userEmail = playlist.userEmail?.toLowerCase();
          const userImage = userEmail ? userImagesMap.get(userEmail) : null;
          
          return {
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
            ownerEmail: playlist.userEmail || null, // Add owner email for access control
            author: {
              username: normalizeUsername(playlist.username || playlist.userEmail?.split('@')[0] || 'unknown') || 'unknown',
              displayName: playlist.userName || playlist.userEmail?.split('@')[0] || 'Usuario',
              image: userImage || playlist.userImage || null,
              email: playlist.userEmail || null // Add email to author for access control
            }
          };
        });
      
      console.log(`[TRENDING] Found ${playlists.length} public playlists after filtering from KV`);
    }

    // If no playlists from KV, try Supabase as fallback
    if (playlists.length === 0) {
      console.log('[TRENDING] No playlists from KV, trying Supabase fallback...');
      const supabasePlaylists = await getPlaylistsFromSupabase();
      
      if (supabasePlaylists.length > 0) {
        // Filter and format Supabase playlists
        const seenIds = new Set();
        playlists = supabasePlaylists
          .filter(playlist => {
            // Remove playlists with fake IDs
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
              username: normalizeUsername(playlist.username) || 'unknown',
              displayName: playlist.userName || 'Usuario',
              image: playlist.userImage || null
            }
          }));
        
        console.log(`[TRENDING] Found ${playlists.length} playlists from Supabase`);
      }
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

    // If no playlists found, use fallback
    if (limitedPlaylists.length === 0) {
      console.log('[TRENDING] No playlists found, using fallback');
      return getFallbackPlaylists();
    }

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
    return getFallbackPlaylists();
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