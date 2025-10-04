import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

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
    const session = await getServerSession(authOptions);
    
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

// POST: Save user playlist
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userEmail, playlistId, name, url, image, tracks, prompt, mode } = body;

    // Validate required fields
    if (!userEmail || !playlistId || !name || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user email matches session
    if (userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 403 });
    }

    const playlist = {
      userEmail,
      playlistId,
      name,
      url,
      image: image || null,
      tracks: tracks || 0,
      prompt: prompt || '',
      mode: mode || 'NORMAL',
      createdAt: new Date().toISOString()
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
