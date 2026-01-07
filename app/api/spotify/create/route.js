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
    const { name: rawName, description: rawDesc, public: rawPublic, uris: rawUris, tracks: rawTracks, prompt: rawPrompt } = await req.json();
    const name = String(rawName || '').trim();
    const prompt = String(rawPrompt || '').trim();
    
    let finalName = name;
    
    // Fallback to default if no name provided (skip LLM generation for speed)
    if (!finalName) {
      // Simple name from prompt or default
      if (prompt) {
        finalName = prompt.slice(0, 50).trim() || 'Mi playlist';
      } else {
        finalName = 'Mi playlist';
      }
    }
    
    // Remove special characters that might cause 400 errors
    const safeName = finalName.replace(/[^\w\s\-\.]/g, '').slice(0, 100);
    const description = (rawDesc == null ? '' : String(rawDesc)).replace(/[^\w\s\-\.]/g, '').replace(/\n/g, ' ').trim().slice(0, 300);
    const isPublic = !!rawPublic;
    
    // NUEVO: Si vienen tracks completos, formatearlos y extraer URIs
    let tracksData = null;
    let uris = [];
    
    if (Array.isArray(rawTracks) && rawTracks.length > 0) {
      // Formatear tracks completos para guardar
      tracksData = rawTracks.map((track) => {
        const artists = Array.isArray(track.artists) 
          ? track.artists.map((a) => ({ name: a.name || a, id: a.id || null }))
          : track.artist 
            ? [{ name: track.artist, id: null }]
            : [{ name: 'Artista desconocido', id: null }];
        
        return {
          id: track.id,
          name: track.name || 'Sin nombre',
          artist: artists.map((a) => a.name).join(', '), // String para compatibilidad
          artists: artists, // Array completo
          album: {
            name: track.album?.name || track.album_name || '',
            images: track.album?.images || track.album?.image ? [track.album.image] : []
          },
          spotify_url: track.external_urls?.spotify || track.spotify_url || track.open_url || `https://open.spotify.com/track/${track.id}`,
          image: track.album?.images?.[0]?.url || track.album?.image || track.image || null
        };
      });
      
      // Extraer URIs de los tracks
      uris = rawTracks
        .map(t => toUri(t.uri || t.id))
        .filter(Boolean)
        .slice(0, 200);
    } else {
      // Si solo vienen URIs, usarlos directamente
      uris = Array.isArray(rawUris)
        ? rawUris.map(toUri).filter(Boolean).slice(0, 200)
        : [];
    }
    
    console.log(`[TRACE:${traceId}] Creating playlist: "${safeName}"`);
    
    // Get hub access token (PLEIAHUB account)
    const { getHubAccessToken } = await import('@/lib/spotify/hubAuth');
    const { getPleiaServerUser } = await import('@/lib/auth/serverUser');
    
    let accessToken;
    try {
      accessToken = await getHubAccessToken();
      console.log(`[TRACE:${traceId}] Using hub access token for playlist creation`);
    } catch (tokenError) {
      console.error(`[TRACE:${traceId}] Failed to get hub access token:`, tokenError);
      return NextResponse.json({ ok: false, message: 'Failed to authenticate with Spotify Hub' }, { status: 500 });
    }
    
    // Get user email for logging
    const pleiaUser = await getPleiaServerUser();
    const userEmail = pleiaUser?.email || 'unknown@example.com';
    
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
    
    // Create playlist expecting 201 (using hub token)
    const createRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
    
    // Add tracks in batches of 100 (in parallel for speed)
    let added = 0;
    if (uris.length) {
      const batches = [];
      for (let i = 0; i < uris.length; i += 100) {
        batches.push(uris.slice(i, i + 100));
      }
      
      // Add all batches in parallel
      const addPromises = batches.map(async (chunk, batchIndex) => {
        const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ uris: chunk })
        });
        
        if (!addRes.ok) {
          let err; 
          try { err = await addRes.json(); } catch {}
          console.error('[CREATE] add-tracks failed', { status: addRes.status, error: err, batch: batchIndex });
          throw new Error(`Failed to add tracks batch ${batchIndex}: ${addRes.status}`);
        }
        return chunk.length;
      });
      
      try {
        const results = await Promise.all(addPromises);
        added = results.reduce((sum, count) => sum + count, 0);
      } catch (batchError) {
        console.error('[CREATE] Error adding tracks:', batchError);
        // Still return success if playlist was created, tracks can be added later
        added = 0;
      }
    }
    
    console.log('[CREATE] ok', { id: playlistId, url: playlistUrl, added });
    
    // Get base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://playlists.jeylabbb.com');
    
    // Log playlist creation to Supabase asynchronously (don't block response)
    console.log(`[CREATE] Logging playlist to: ${baseUrl}/api/telemetry/ingest`);
    const logPromise = fetch(`${baseUrl}/api/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'playlist',
        payload: {
          email: userEmail,
          playlistName: safeName,
          prompt: prompt || 'Generated from streaming',
          spotifyUrl: playlistUrl,
          spotifyId: playlistId,
          trackCount: added,
          tracksData: tracksData || undefined // NUEVO: Pasar tracks completos si están disponibles
        }
      })
    }).then(async (response) => {
      if (response.ok) {
        const result = await response.json();
        console.log(`[CREATE] ===== PLAYLIST LOGGED TO SUPABASE SUCCESSFULLY =====`, result);
        return result;
      } else {
        const errorText = await response.text();
        console.error(`[CREATE] ❌ Failed to log playlist (${response.status}):`, errorText);
        throw new Error(`Failed to log playlist: ${errorText}`);
      }
    }).catch(err => {
      console.error(`[CREATE] ❌ Error logging playlist (non-blocking):`, err);
      return { ok: false, error: err.message };
    });
    
    // Don't await logging - return immediately, but log result
    logPromise.then((result) => {
      if (result && result.ok) {
        console.log(`[CREATE] ✅ Playlist logged successfully with Spotify URL: ${playlistUrl}`);
      }
    });
    
    return NextResponse.json({
      ok: true,
      playlistId: playlistId,
      playlistUrl: playlistUrl,
      url: playlistUrl, // Also include 'url' for compatibility
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