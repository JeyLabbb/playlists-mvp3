import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { retryWithBackoff, batchSpotifyOperation } from "../../../lib/helpers.js";

export async function POST(req) {
  try {
    // 1) Get user token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }

    // 2) Parse request body
    let name = "AI Generated Playlist";
    let description = "AI Generated Playlist · by JeyLabbb AI projects";
    let isPublic = true; // Always public
    let uris = [];
    
    try {
      const body = await req.json();
      const userProvidedName = String(body?.name || "").trim();
      
      // Use user provided name + "by JeyLabbb" or default
      if (userProvidedName) {
        name = `${userProvidedName} by JeyLabbb`;
      } else {
        name = "AI Generated Playlist by JeyLabbb";
      }
      
      // Always use fixed description
      description = "AI Generated Playlist · by JeyLabbb AI projects";
      isPublic = true; // Always public
      uris = Array.isArray(body?.uris) ? body.uris.filter(Boolean) : 
             (Array.isArray(body?.tracks) ? body.tracks.filter(Boolean) : []);
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // 3) Create playlist with retry logic
    const createPlaylist = async () => {
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          public: isPublic,
        }),
        cache: "no-store",
      });

      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    };

    const createResult = await retryWithBackoff(createPlaylist, {
      retries: 3,
      baseMs: 1000
    });

    if (!createResult.ok) {
      console.error("Playlist creation failed:", createResult.data);
      return NextResponse.json(
        { 
          error: "Failed to create playlist", 
          details: createResult.data,
          status: createResult.status 
        },
        { status: createResult.status }
      );
    }

    const playlistId = createResult.data?.id;
    if (!playlistId) {
      return NextResponse.json(
        { error: "No playlist ID returned", details: createResult.data },
        { status: 500 }
      );
    }

    // 4) Add tracks in batches with retry logic
    let addedTotal = 0;
    if (uris.length > 0) {
      const addTracksBatch = async (batch) => {
        const response = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: batch }),
            cache: "no-store",
          }
        );

        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
      };

      const batchResults = await batchSpotifyOperation(addTracksBatch, uris, 100);
      
      // Count successful additions
      for (const result of batchResults) {
        if (result && !result.error) {
          addedTotal += result.data?.snapshot_id ? 100 : 0; // Assume 100 if successful
        }
      }

      // If some batches failed, try to get exact count
      if (addedTotal === 0 && batchResults.some(r => r && !r.error)) {
        // Fallback: assume all were added if at least one batch succeeded
        addedTotal = uris.length;
      }
    }

    // 5) Log playlist creation to Supabase
    console.log(`[CREATE] ===== LOGGING PLAYLIST CREATION TO SUPABASE =====`);
    try {
      const logResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'playlist',
          payload: {
            email: token.email,
            playlistName: name,
            prompt: 'Generated from streaming', // We don't have the original prompt here
            spotifyUrl: createResult.data?.external_urls?.spotify,
            spotifyId: playlistId,
            trackCount: addedTotal
          }
        })
      });
      
      if (logResponse.ok) {
        const logResult = await logResponse.json();
        console.log(`[CREATE] ===== PLAYLIST LOGGED TO SUPABASE =====`, logResult);
      } else {
        console.error(`[CREATE] Failed to log playlist:`, await logResponse.text());
      }
    } catch (logError) {
      console.error(`[CREATE] Error logging playlist:`, logError);
    }

    // 6) Return success response
    const webUrl = createResult.data?.external_urls?.spotify || 
                   `https://open.spotify.com/playlist/${playlistId}`;
    const appUrl = `spotify://playlist/${playlistId}`;

    return NextResponse.json({
      ok: true,
      playlistId,
      name,
      webUrl,
      appUrl,
      added: addedTotal,
      total: uris.length
    });

  } catch (error) {
    console.error("Create playlist error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
