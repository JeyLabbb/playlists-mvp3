// web/app/api/spotify/create/route.js
// Clean playlist creation with robust validation

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../../lib/auth/config';

export async function POST(req) {
  const traceId = crypto.randomUUID();
  
  try {
    // Helpers
    const ID22 = /^[0-9A-Za-z]{22}$/;
    const toUri = (u) => {
      if (!u) return null;
      if (typeof u === 'string' && u.startsWith('spotify:track:')) {
        const id = u.slice('spotify:track:'.length);
        return ID22.test(id) ? u : null;
      }
      if (typeof u === 'string' && u.includes('/track/')) {
        const id = u.split('/track/')[1]?.split('?')[0];
        return ID22.test(id) ? `spotify:track:${id}` : null;
      }
      if (typeof u === 'string' && ID22.test(u)) return `spotify:track:${u}`;
      return null;
    };
    
    // Sanitize inputs
    const { name: rawName, description: rawDesc, public: rawPublic, uris: rawUris } = await req.json();
    const name = String(rawName || '').trim();
    // Remove special characters that might cause 400 errors
    const safeName = name.length ? name.replace(/[^\w\s\-\.]/g, '').slice(0, 100) : 'Mi playlist';
    const description = (rawDesc == null ? '' : String(rawDesc)).replace(/[^\w\s\-\.]/g, '').replace(/\n/g, ' ').trim().slice(0, 300);
    const isPublic = !!rawPublic;
    
    const uris = Array.isArray(rawUris)
      ? rawUris.map(toUri).filter(Boolean).slice(0, 200)
      : [];
    
    console.log(`[TRACE:${traceId}] Creating playlist: "${safeName}"`);
    
    // Get session and access token
    const session = await getServerSession(authOptions);
    const token = session?.accessToken || session?.user?.accessToken;
    
    // Validations
    if (!token) {
      console.log(`[TRACE:${traceId}] No valid session found`);
      return NextResponse.json({ ok: false, message: 'Missing Spotify access token' }, { status: 401 });
    }
    
    if (!safeName) {
      return NextResponse.json({ ok: false, message: 'Missing playlist name' }, { status: 400 });
    }
    
    console.log(`[TRACE:${traceId}] Session found, creating playlist`);
    
    // Debug payload - ensure all fields are clean
    const payload = { 
      name: safeName, 
      description: description || '', 
      public: Boolean(isPublic) 
    };
    console.log('[CREATE] payload:', JSON.stringify(payload));
    console.log('[CREATE] uris count:', uris.length);
    
    // Create playlist expecting 201
    const createRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (createRes.status !== 201) {
      let err;
      try { err = await createRes.json(); } catch {}
      console.error('[CREATE] create_failed', createRes.status, err);
      return NextResponse.json({ 
        ok: false, 
        message: 'Failed to create playlist', 
        status: createRes.status, 
        error: err 
      }, { status: createRes.status });
    }
    
    const playlist = await createRes.json();
    const playlistId = playlist?.id;
    const playlistUrl = playlist?.external_urls?.spotify;
    
    // Add tracks in batches of 100
    let added = 0;
    if (uris.length) {
      for (let i = 0; i < uris.length; i += 100) {
        const chunk = uris.slice(i, i + 100);
        const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ uris: chunk })
        });
        
        if (!addRes.ok) {
          let err; 
          try { err = await addRes.json(); } catch {}
          console.error('[CREATE] add-tracks failed', { status: addRes.status, error: err, batch: i / 100 });
          return NextResponse.json({ 
            ok: false, 
            message: 'Failed to add tracks', 
            status: addRes.status, 
            error: err, 
            batch: i / 100 
          }, { status: addRes.status });
        }
        added += chunk.length;
      }
    }
    
    console.log('[CREATE] ok', { id: playlistId, url: playlistUrl, added });
    
    return NextResponse.json({
      ok: true,
      playlistId: playlistId,
      playlistUrl: playlistUrl,
      name: safeName,
      trackCount: added
    }, { status: 200 });
    
  } catch (error) {
    console.error(`[TRACE:${traceId}] Playlist creation error:`, error);
    
    // Handle specific error types
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      return NextResponse.json({ 
        ok: false, 
        message: 'Spotify service unavailable' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      ok: false, 
      message: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}