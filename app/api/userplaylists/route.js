import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';

// Check if Vercel KV is available
function hasKV() {
  return !!(process.env.UPSTASH_REDIS_KV_REST_API_URL && process.env.UPSTASH_REDIS_KV_REST_API_TOKEN);
}

// Get user playlists from Vercel KV
async function getFromKV(userEmail) {
  try {
    console.log('[USERPLAYLISTS] getFromKV: Fetching for user:', userEmail);
    const kv = await import('@vercel/kv');
    const key = `userplaylists:${userEmail}`;
    const playlists = await kv.kv.get(key);
    
    const playlistsArray = Array.isArray(playlists) ? playlists : [];
    console.log('[USERPLAYLISTS] getFromKV: Returning', playlistsArray.length, 'playlists');
    return playlistsArray;
  } catch (error) {
    console.warn('[USERPLAYLISTS] getFromKV: Error:', error);
    return null;
  }
}

// Save user playlist to Vercel KV
async function saveToKV(userEmail, playlist) {
  try {
    console.log('[USERPLAYLISTS] saveToKV: Starting save process for user:', userEmail);
    // Get existing playlists
    const existing = await getFromKV(userEmail);
    const existingArray = Array.isArray(existing) ? existing : [];
    console.log('[USERPLAYLISTS] saveToKV: Found existing playlists:', existingArray.length);
    
    // Add new playlist to beginning
    const updated = [playlist, ...existingArray].slice(0, 200); // Keep max 200 playlists
    console.log('[USERPLAYLISTS] saveToKV: Updated playlist count:', updated.length);
    
    const kv = await import('@vercel/kv');
    const key = `userplaylists:${userEmail}`;
    await kv.kv.set(key, updated);
    
    console.log('[USERPLAYLISTS] saveToKV: Successfully saved to KV');
    return true;
  } catch (error) {
    console.error('[USERPLAYLISTS] saveToKV: Error:', error);
    return false;
  }
}

// Update playlist in Vercel KV
async function updateInKV(userEmail, playlistId, updates) {
  try {
    console.log('[USERPLAYLISTS] updateInKV: Updating playlist:', playlistId);
    const existing = await getFromKV(userEmail);
    const existingArray = Array.isArray(existing) ? existing : [];
    
    const updated = existingArray.map(playlist => {
      if (playlist.playlistId === playlistId) {
        return { ...playlist, ...updates, updatedAt: new Date().toISOString() };
      }
      return playlist;
    });
    
    const kv = await import('@vercel/kv');
    const key = `userplaylists:${userEmail}`;
    await kv.kv.set(key, updated);
    
    console.log('[USERPLAYLISTS] updateInKV: Successfully updated in KV');
    return true;
  } catch (error) {
    console.error('[USERPLAYLISTS] updateInKV: Error:', error);
    return false;
  }
}

// Delete playlist from Vercel KV
async function deleteFromKV(userEmail, playlistId) {
  try {
    console.log('[USERPLAYLISTS] deleteFromKV: Deleting playlist:', playlistId);
    const existing = await getFromKV(userEmail);
    const existingArray = Array.isArray(existing) ? existing : [];
    
    const updated = existingArray.filter(playlist => playlist.playlistId !== playlistId);
    
    const kv = await import('@vercel/kv');
    const key = `userplaylists:${userEmail}`;
    await kv.kv.set(key, updated);
    
    console.log('[USERPLAYLISTS] deleteFromKV: Successfully deleted from KV');
    return true;
  } catch (error) {
    console.error('[USERPLAYLISTS] deleteFromKV: Error:', error);
    return false;
  }
}

// GET: Retrieve user playlists
export async function GET(request) {
  try {
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;
    console.log('[USERPLAYLISTS] GET: Request from user:', userEmail);

    let playlists = [];

    // Try Vercel KV first
    console.log('[USERPLAYLISTS] Checking KV availability...');
    console.log('[USERPLAYLISTS] UPSTASH_REDIS_KV_REST_API_URL:', process.env.UPSTASH_REDIS_KV_REST_API_URL ? 'SET' : 'NOT SET');
    console.log('[USERPLAYLISTS] UPSTASH_REDIS_KV_REST_API_TOKEN:', process.env.UPSTASH_REDIS_KV_REST_API_TOKEN ? 'SET' : 'NOT SET');
    
    if (hasKV()) {
      try {
        const kvPlaylists = await getFromKV(userEmail);
        if (kvPlaylists) {
          playlists = kvPlaylists;
          console.log('[USERPLAYLISTS] GET: Retrieved', playlists.length, 'playlists from KV');
        }
      } catch (error) {
        console.error('[USERPLAYLISTS] GET: KV error:', error);
      }
    }

    // Sort by creation date (newest first)
    playlists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({
      success: true,
      playlists: playlists,
      total: playlists.length,
      source: hasKV() ? 'kv' : 'localStorage'
    });

  } catch (error) {
    console.error('[USERPLAYLISTS] GET: Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve playlists' }, { status: 500 });
  }
}

// POST: Create new playlist
export async function POST(request) {
  try {
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;
    const playlistData = await request.json();
    
    console.log('[USERPLAYLISTS] POST: Creating playlist for user:', userEmail);

    // Create playlist object
    const playlist = {
      playlistId: playlistData.playlistId || `playlist_${Date.now()}`,
      prompt: playlistData.prompt || 'Playlist creada',
      name: playlistData.name || playlistData.prompt || 'Mi Playlist',
      url: playlistData.url || '#',
      tracks: playlistData.tracks || 0,
      views: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      public: playlistData.public !== false, // Default to public
      username: user?.name || userEmail.split('@')[0],
      userEmail: userEmail,
      userName: user?.name || 'Usuario',
      userImage: user?.image || null
    };

    // Save to KV if available
    if (hasKV()) {
      try {
        const saved = await saveToKV(userEmail, playlist);
        if (!saved) {
          return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
        }
      } catch (error) {
        console.error('[USERPLAYLISTS] POST: KV save error:', error);
        return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      playlist: playlist,
      message: 'Playlist created successfully',
      source: hasKV() ? 'kv' : 'localStorage'
    });

  } catch (error) {
    console.error('[USERPLAYLISTS] POST: Error:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}

// PUT: Update playlist
export async function PUT(request) {
  try {
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;
    const { playlistId, ...updates } = await request.json();
    
    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    console.log('[USERPLAYLISTS] PUT: Updating playlist:', playlistId);

    // Update in KV if available
    if (hasKV()) {
      try {
        const updated = await updateInKV(userEmail, playlistId, updates);
        if (!updated) {
          return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
        }
      } catch (error) {
        console.error('[USERPLAYLISTS] PUT: KV update error:', error);
        return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist updated successfully',
      source: hasKV() ? 'kv' : 'localStorage'
    });

  } catch (error) {
    console.error('[USERPLAYLISTS] PUT: Error:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}

// DELETE: Delete playlist
export async function DELETE(request) {
  try {
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('id');
    
    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    console.log('[USERPLAYLISTS] DELETE: Deleting playlist:', playlistId);

    // Delete from KV if available
    if (hasKV()) {
      try {
        const deleted = await deleteFromKV(userEmail, playlistId);
        if (!deleted) {
          return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
        }
      } catch (error) {
        console.error('[USERPLAYLISTS] DELETE: KV delete error:', error);
        return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist deleted successfully',
      source: hasKV() ? 'kv' : 'localStorage'
    });

  } catch (error) {
    console.error('[USERPLAYLISTS] DELETE: Error:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}