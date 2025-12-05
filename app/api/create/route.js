import { NextResponse } from "next/server";
import { getHubAccessToken } from "@/lib/spotify/hubAuth";
import { getPleiaServerUser } from "@/lib/auth/serverUser";
import { retryWithBackoff, batchSpotifyOperation } from "../../../lib/helpers.js";

export async function POST(req) {
  try {
    // 1) Get hub access token (PLEIAHUB account)
    let accessToken;
    try {
      accessToken = await getHubAccessToken();
    } catch (tokenError) {
      console.error('[CREATE] Failed to get hub access token:', tokenError);
      return NextResponse.json({ error: "Failed to authenticate with Spotify Hub" }, { status: 500 });
    }
    
    // Get user email for logging
    const pleiaUser = await getPleiaServerUser();
    const userEmail = pleiaUser?.email || 'unknown@example.com';

    // 2) Parse request body
    let name = "AI Generated Playlist";
    let description = "AI Generated Playlist · by MTRYX";
    let isPublic = true; // Always public
    let uris = [];
    
    try {
      const body = await req.json();
      const userProvidedName = String(body?.name || "").trim();
      
      // Use user provided name + "by JeyLabbb" or default
      if (userProvidedName) {
        name = `${userProvidedName} by MTRYX`;
      } else {
        name = "AI Generated Playlist by MTRYX";
      }
      
      // Always use fixed description
      description = "AI Generated Playlist · by MTRYX";
      isPublic = true; // Always public
      uris = Array.isArray(body?.uris) ? body.uris.filter(Boolean) : 
             (Array.isArray(body?.tracks) ? body.tracks.filter(Boolean) : []);
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // 3) Create playlist with retry logic (using hub token)
    const createPlaylist = async () => {
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

    // Create playlist (no retry for speed - if it fails, user can try again)
    const createResult = await createPlaylist();

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

    // 4) Add tracks in batches in parallel (for speed)
    let addedTotal = 0;
    if (uris.length > 0) {
      const batches = [];
      for (let i = 0; i < uris.length; i += 100) {
        batches.push(uris.slice(i, i + 100));
      }
      
      // Add all batches in parallel
      const addPromises = batches.map(async (batch) => {
        const response = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: batch }),
            cache: "no-store",
          }
        );

        const data = await response.json();
        return { ok: response.ok, status: response.status, data, count: batch.length };
      });

      try {
        const results = await Promise.all(addPromises);
        addedTotal = results
          .filter(r => r.ok)
          .reduce((sum, r) => sum + r.count, 0);
      } catch (error) {
        console.error('[CREATE] Error adding tracks:', error);
        // Still return success if playlist was created
        addedTotal = 0;
      }
    }

    // 5) Log playlist creation to Supabase asynchronously (don't block response)
    const logPromise = fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'playlist',
        payload: {
          email: userEmail,
          playlistName: name,
          prompt: 'Generated from streaming',
          spotifyUrl: createResult.data?.external_urls?.spotify,
          spotifyId: playlistId,
          trackCount: addedTotal
        }
      })
    }).catch(err => {
      console.error(`[CREATE] Error logging playlist (non-blocking):`, err);
    });
    
    // Don't await logging - return immediately
    logPromise.then(() => {
      console.log(`[CREATE] ===== PLAYLIST LOGGED TO SUPABASE =====`);
    });

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
