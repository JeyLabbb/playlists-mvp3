import { NextResponse } from 'next/server';

// Check if Vercel KV is available
function hasKV() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

// Get all user playlists to find playlist by ID
async function getAllUserPlaylists() {
  try {
    const response = await fetch(`${process.env.KV_REST_API_URL}/keys/userplaylists:*`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const allPlaylists = [];
    
    // Get each user's playlists
    for (const key of data.result || []) {
      const playlistResponse = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        if (playlistData.result) {
          const userPlaylists = JSON.parse(playlistData.result);
          allPlaylists.push(...userPlaylists);
        }
      }
    }
    
    return allPlaylists;
  } catch (error) {
    console.warn('Error getting all playlists:', error);
    return [];
  }
}

// Update playlist metrics in KV
async function updatePlaylistMetrics(playlistId, type, increment = 1) {
  try {
    const allPlaylists = await getAllUserPlaylists();
    const playlist = allPlaylists.find(p => p.playlistId === playlistId);
    
    if (!playlist) {
      return { success: false, error: 'Playlist not found' };
    }

    // Update metrics
    if (!playlist.views) playlist.views = 0;
    if (!playlist.clicks) playlist.clicks = 0;
    
    if (type === 'view') {
      playlist.views += increment;
    } else if (type === 'click') {
      playlist.clicks += increment;
    }

    playlist.updatedAt = new Date().toISOString();

    // Save updated playlist back to user's collection
    const userEmail = playlist.userEmail;
    const userPlaylists = allPlaylists.filter(p => p.userEmail === userEmail);
    const otherPlaylists = allPlaylists.filter(p => p.userEmail !== userEmail);
    
    // Update the playlist in user's collection
    const playlistIndex = userPlaylists.findIndex(p => p.playlistId === playlistId);
    if (playlistIndex !== -1) {
      userPlaylists[playlistIndex] = playlist;
    }
    
    // Save back to KV
    const response = await fetch(`${process.env.KV_REST_API_URL}/set/userplaylists:${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: JSON.stringify(userPlaylists)
      })
    });

    if (response.ok) {
      return { success: true, playlist };
    } else {
      return { success: false, error: 'Failed to update in KV' };
    }
  } catch (error) {
    console.error('Error updating playlist metrics:', error);
    return { success: false, error: error.message };
  }
}

// POST: Update playlist metrics
export async function POST(request) {
  try {
    // For metrics, we don't require authentication (public playlists can be viewed by anyone)
    // This endpoint is for tracking views/clicks on public playlists
    
    const body = await request.json();
    const { playlistId, type } = body;

    // Validate required fields
    if (!playlistId || !type) {
      return NextResponse.json({ error: 'Missing playlistId or type' }, { status: 400 });
    }

    // Validate type
    if (!['view', 'click'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be "view" or "click"' }, { status: 400 });
    }

    // If no KV available, just return success (metrics not tracked)
    if (!hasKV()) {
      return NextResponse.json({
        success: true,
        message: 'Metrics not tracked (KV not available)',
        source: 'fallback'
      });
    }

    // Update metrics
    const result = await updatePlaylistMetrics(playlistId, type);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        playlist: result.playlist,
        source: 'kv'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
