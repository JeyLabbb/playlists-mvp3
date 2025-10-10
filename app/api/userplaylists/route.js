import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

// Simplified auth options to avoid import circular dependency
const simpleAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true
};

// Check if Vercel KV is available
function hasKV() {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
}

// Get user playlists from Vercel KV
async function getFromKV(userEmail) {
  try {
    console.log('[USERPLAYLISTS] getFromKV: Fetching for user:', userEmail);
    const response = await fetch(`${process.env.KV_REST_API_URL}/get/userplaylists:${encodeURIComponent(userEmail)}`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('[USERPLAYLISTS] getFromKV: KV GET failed:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[USERPLAYLISTS] getFromKV: Raw KV data:', data);
    
    // Handle double-encoded JSON from KV
    let parsed = data.result ? JSON.parse(data.result) : null;
    console.log('[USERPLAYLISTS] getFromKV: First parse:', parsed);
    
    // If result has a 'value' property, it's double-encoded
    if (parsed && typeof parsed === 'object' && parsed.value) {
      console.log('[USERPLAYLISTS] getFromKV: Detected double encoding, parsing value');
      parsed = JSON.parse(parsed.value);
    }
    
    const playlists = Array.isArray(parsed) ? parsed : [];
    console.log('[USERPLAYLISTS] getFromKV: Returning', playlists.length, 'playlists');
    return playlists;
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
    
    const kvUrl = `${process.env.KV_REST_API_URL}/set/userplaylists:${encodeURIComponent(userEmail)}`;
    console.log('[USERPLAYLISTS] saveToKV: KV URL:', kvUrl);
    
    const requestBody = {
      value: JSON.stringify(updated)
    };
    console.log('[USERPLAYLISTS] saveToKV: Request body length:', JSON.stringify(requestBody).length);
    
    const response = await fetch(kvUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[USERPLAYLISTS] saveToKV: Response status:', response.status);
    const responseText = await response.text();
    console.log('[USERPLAYLISTS] saveToKV: Response body:', responseText);

    if (!response.ok) {
      console.warn('[USERPLAYLISTS] KV SET failed:', response.status, responseText);
      return false;
    }

    console.log('[USERPLAYLISTS] saveToKV: ✅ SUCCESS');
    return true;
  } catch (error) {
    console.warn('[USERPLAYLISTS] KV SET error:', error);
    return false;
  }
}

// GET: Retrieve user playlists
export async function GET(request) {
  try {
    const session = await getServerSession(simpleAuthOptions);
    
    console.log('[USERPLAYLISTS] ===== GET REQUEST =====');
    if (!session?.user?.email) {
      console.log('[USERPLAYLISTS] GET: No session/email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    console.log('[USERPLAYLISTS] GET: Fetching playlists for:', userEmail);

    // Try Vercel KV first
    if (hasKV()) {
      console.log('[USERPLAYLISTS] GET: KV available, fetching...');
      const playlists = await getFromKV(userEmail);
      console.log('[USERPLAYLISTS] GET: KV returned:', playlists ? playlists.length : null, 'playlists');
      
      if (playlists !== null) {
        console.log('[USERPLAYLISTS] GET: Responding with KV data');
        return NextResponse.json({
          success: true,
          playlists: playlists,
          source: 'kv'
        });
      }
    }

    // Fallback to localStorage (client-side)
    console.log('[USERPLAYLISTS] GET: Falling back to localStorage');
    return NextResponse.json({
      success: true,
      playlists: [],
      fallback: true,
      source: 'localStorage'
    });

  } catch (error) {
    console.error('[USERPLAYLISTS] GET: Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve playlists' }, { status: 500 });
  }
}

// Get user profile for author info
async function getUserProfile(email, session) {
  try {
    // Generate username from session data
    const baseUsername = session.user.name 
      ? session.user.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)
      : email.split('@')[0];
    
    return {
      username: baseUsername,
      displayName: session.user.name || email.split('@')[0],
      image: session.user.image || null
    };
  } catch (error) {
    console.warn('Error generating user profile:', error);
    return {
      username: email.split('@')[0],
      displayName: email.split('@')[0],
      image: null
    };
  }
}

// POST: Save user playlist
export async function POST(request) {
  try {
    console.log('[USERPLAYLISTS] ===== STARTING POST REQUEST =====');
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      console.log('[USERPLAYLISTS] ERROR: No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[USERPLAYLISTS] Session found for user:', session.user.email);
    const body = await request.json();
    console.log('[USERPLAYLISTS] Request body:', {
      userEmail: body.userEmail,
      playlistId: body.playlistId,
      name: body.name,
      hasUrl: !!body.url,
      tracks: body.tracks,
      mode: body.mode,
      public: body.public
    });
    
    const { userEmail, playlistId, name, url, image, tracks, prompt, mode, public: isPublic } = body;

    // Validate required fields
    if (!userEmail || !playlistId || !name || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user email matches session
    if (userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 403 });
    }

    // Get user profile for author info
    const userProfile = await getUserProfile(session.user.email, session);

    const playlist = {
      userEmail,
      userName: session.user.name,
      userImage: session.user.image,
      username: userProfile.username,
      playlistId,
      name,
      url,
      image: image || null,
      tracks: tracks || 0,
      prompt: prompt || '',
      mode: mode || null,
      public: isPublic !== false, // Default true
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0
    };

    // Try Vercel KV first
    console.log('[USERPLAYLISTS] Checking KV availability...');
    console.log('[USERPLAYLISTS] KV_REST_API_URL:', process.env.KV_REST_API_URL ? 'SET' : 'NOT SET');
    console.log('[USERPLAYLISTS] KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? 'SET' : 'NOT SET');
    
    if (hasKV()) {
      console.log('[USERPLAYLISTS] ✅ KV available, attempting to save playlist...');
      console.log('[USERPLAYLISTS] Playlist to save:', JSON.stringify(playlist, null, 2));
      const saved = await saveToKV(userEmail, playlist);
      console.log('[USERPLAYLISTS] KV save result:', saved);
      if (saved) {
        console.log('[USERPLAYLISTS] ✅✅✅ Playlist saved to KV successfully');
        return NextResponse.json({
          success: true,
          saved: true,
          source: 'kv'
        });
      } else {
        console.log('[USERPLAYLISTS] ❌ Failed to save to KV, falling back to localStorage');
      }
    } else {
      console.log('[USERPLAYLISTS] ❌ KV not available (missing env vars)');
    }

    // Fallback to localStorage (client-side)
    return NextResponse.json({
      success: true,
      saved: false,
      reason: 'fallback-localStorage',
      playlist: playlist
    });

  } catch (error) {
    console.error('Error saving user playlist:', error);
    return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
  }
}

// PATCH: Update playlist privacy
export async function PATCH(request) {
  try {
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playlistId, public: isPublic } = body;
    const userEmail = session.user.email;

    // Validate required fields
    if (!playlistId || typeof isPublic !== 'boolean') {
      return NextResponse.json({ error: 'Missing playlistId or public field' }, { status: 400 });
    }

    // Get existing playlists - try KV first, then fallback to localStorage
    let existingPlaylists = [];
    if (hasKV()) {
      existingPlaylists = await getFromKV(userEmail) || [];
    }
    
    // If no KV or no playlists found in KV, indicate localStorage fallback
    if (!hasKV() || existingPlaylists.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Playlist not found',
        reason: 'fallback-localStorage',
        message: 'KV not available, update handled client-side'
      });
    }
    
    // Find and update the playlist
    const playlistIndex = existingPlaylists.findIndex(p => p.playlistId === playlistId);
    
    if (playlistIndex === -1) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Verify ownership
    if (existingPlaylists[playlistIndex].userEmail !== userEmail) {
      return NextResponse.json({ error: 'Not authorized to modify this playlist' }, { status: 403 });
    }

    // Update the playlist
    existingPlaylists[playlistIndex].public = isPublic;
    existingPlaylists[playlistIndex].updatedAt = new Date().toISOString();

    // Try to save to KV
    if (hasKV()) {
      try {
        const response = await fetch(`${process.env.KV_REST_API_URL}/set/userplaylists:${encodeURIComponent(userEmail)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            value: JSON.stringify(existingPlaylists)
          })
        });

        if (response.ok) {
          return NextResponse.json({
            success: true,
            playlist: existingPlaylists[playlistIndex],
            saved: true,
            source: 'kv'
          });
        }
      } catch (error) {
        console.warn('KV update failed:', error);
      }
    }

    // Fallback to localStorage
    return NextResponse.json({
      success: true,
      playlist: existingPlaylists[playlistIndex],
      saved: false,
      reason: 'fallback-localStorage',
      source: 'localStorage'
    });

  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}

// DELETE: Delete playlist
export async function DELETE(request) {
  try {
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playlistId } = body;
    const userEmail = session.user.email;

    // Validate required fields
    if (!playlistId) {
      return NextResponse.json({ error: 'Missing playlistId' }, { status: 400 });
    }

    // Get existing playlists - try KV first, then fallback to localStorage
    let existingPlaylists = [];
    if (hasKV()) {
      existingPlaylists = await getFromKV(userEmail) || [];
    }
    
    // If no KV or no playlists found in KV, indicate localStorage fallback
    if (!hasKV() || existingPlaylists.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Playlist not found',
        reason: 'fallback-localStorage',
        message: 'KV not available, delete handled client-side'
      });
    }

    // Find the playlist to delete
    const playlistIndex = existingPlaylists.findIndex(p => p.playlistId === playlistId);
    
    if (playlistIndex === -1) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Verify ownership
    if (existingPlaylists[playlistIndex].userEmail !== userEmail) {
      return NextResponse.json({ error: 'Not authorized to delete this playlist' }, { status: 403 });
    }

    // Remove the playlist
    const deletedPlaylist = existingPlaylists.splice(playlistIndex, 1)[0];

    // Try to save to KV
    if (hasKV()) {
      try {
        const response = await fetch(`${process.env.KV_REST_API_URL}/set/userplaylists:${encodeURIComponent(userEmail)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            value: JSON.stringify(existingPlaylists)
          })
        });

        if (response.ok) {
          return NextResponse.json({
            success: true,
            deletedPlaylist: deletedPlaylist,
            saved: true,
            source: 'kv'
          });
        }
      } catch (kvError) {
        console.warn('Failed to save to KV after delete:', kvError);
      }
    }

    // Fallback to localStorage
    return NextResponse.json({
      success: true,
      deletedPlaylist: deletedPlaylist,
      saved: false,
      reason: 'fallback-localStorage',
      source: 'localStorage'
    });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}
