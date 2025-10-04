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
    const response = await fetch(`${process.env.KV_REST_API_URL}/get/userplaylists:${encodeURIComponent(userEmail)}`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('KV GET failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.result ? JSON.parse(data.result) : [];
  } catch (error) {
    console.warn('KV GET error:', error);
    return null;
  }
}

// Save user playlist to Vercel KV
async function saveToKV(userEmail, playlist) {
  try {
    // Get existing playlists
    const existing = await getFromKV(userEmail) || [];
    
    // Add new playlist to beginning
    const updated = [playlist, ...existing].slice(0, 200); // Keep max 200 playlists
    
    const response = await fetch(`${process.env.KV_REST_API_URL}/set/userplaylists:${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: JSON.stringify(updated)
      })
    });

    if (!response.ok) {
      console.warn('KV SET failed:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('KV SET error:', error);
    return false;
  }
}

// GET: Retrieve user playlists
export async function GET(request) {
  try {
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    // Try Vercel KV first
    if (hasKV()) {
      const playlists = await getFromKV(userEmail);
      if (playlists !== null) {
        return NextResponse.json({
          success: true,
          playlists: playlists,
          source: 'kv'
        });
      }
    }

    // Fallback to localStorage (client-side)
    return NextResponse.json({
      success: true,
      playlists: [],
      fallback: true,
      source: 'localStorage'
    });

  } catch (error) {
    console.error('Error retrieving user playlists:', error);
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
    const session = await getServerSession(simpleAuthOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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
    if (hasKV()) {
      const saved = await saveToKV(userEmail, playlist);
      if (saved) {
        return NextResponse.json({
          success: true,
          saved: true,
          source: 'kv'
        });
      }
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

    // Get existing playlists
    const existingPlaylists = await getFromKV(userEmail) || [];
    
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
