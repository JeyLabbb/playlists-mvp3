import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const SAFE_MAX = 50; // cap estable del MVP

function sanitizeUris(arr = []) {
  const set = new Set();
  for (const u of arr) {
    if (typeof u === "string" && u.startsWith("spotify:track:")) {
      set.add(u);
    }
  }
  // dedup + cap
  return Array.from(set).slice(0, SAFE_MAX);
}

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json({ error: "no-access-token" }, { status: 401 });
  }

  const { name = "Mi playlist", tracks = [] } = await req.json();
  const uris = sanitizeUris(tracks);

  const headers = {
    Authorization: `Bearer ${token.accessToken}`,
    "Content-Type": "application/json",
  };

  const description = "Generada con IA (demo) — by JeyLabbb";

  // 1) Crear playlist (intentando ya con descripción)
  const createRes = await fetch("https://api.spotify.com/v1/me/playlists", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      description,
      public: true,
    }),
  });
  const playlist = await createRes.json();
  if (!createRes.ok) {
    return NextResponse.json(
      { error: "spotify-create", details: playlist },
      { status: createRes.status }
    );
  }
  const playlistId = playlist.id;

  // 1.5) Refuerzo de descripción (por si el POST la ignoró)
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ name, description, public: true }),
  });

  // 2) Añadir URIs en bloques seguros (máx 50 ya capado)
  let added = 0;
  let remaining = [...uris];
  while (remaining.length) {
    const chunk = remaining.slice(0, 50);
    remaining = remaining.slice(50);

    // Método por querystring (más estable)
    const qs = new URLSearchParams({ uris: chunk.join(",") }).toString();
    const addUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${qs}`;

    const addRes = await fetch(addUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    if (!addRes.ok) {
      let det = null;
      try { det = await addRes.json(); } catch {}
      return NextResponse.json(
        { error: "spotify-add", details: det },
        { status: addRes.status }
      );
    }

    added += chunk.length;

    // pequeño respiro por si hubiera throttling (no debería con 1 bloque)
    if (remaining.length) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // 3) Verificación: contar items en la playlist
  const checkRes = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1`,
    { headers: { Authorization: `Bearer ${token.accessToken}` } }
  );
  let total = null;
  if (checkRes.ok) {
    const checkData = await checkRes.json();
    total = checkData?.total ?? null;
  }

  const webUrl = `https://open.spotify.com/playlist/${playlistId}`;
  const appUrl = `spotify:playlist:${playlistId}`;

  return NextResponse.json(
    { id: playlistId, webUrl, appUrl, requested: uris.length, added, total },
    { status: 200 }
  );
}
