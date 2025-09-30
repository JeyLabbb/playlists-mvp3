import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function POST(req) {
  // 1) Token del usuario
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json({ error: "no-access-token" }, { status: 401 });
  }

  // 2) Body
  let name = "Mi playlist";
  let description = "Generada con IA (demo) — by JeyLabbb";
  let isPublic = false;
  let uris = [];
  try {
    const body = await req.json();
    name = String(body?.name || name).slice(0, 100).trim() || "Mi playlist";
    description = String(body?.description || description).slice(0, 300).trim() || description;
    isPublic = !!body?.public;

    // Acepta 'uris' (array de strings) o 'tracks' (strings/objetos con .uri)
    if (Array.isArray(body?.uris)) {
      uris = body.uris.filter(Boolean);
    } else if (Array.isArray(body?.tracks)) {
      uris = body.tracks.map(t => (typeof t === "string" ? t : t?.uri)).filter(Boolean);
    }
  } catch {_/*body vacío: seguimos con defaults*/}

  // 3) Crear playlist
  const createRes = await fetch("https://api.spotify.com/v1/me/playlists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description, public: isPublic }),
    cache: "no-store",
  });

  const created = await createRes.json();
  if (!createRes.ok) {
    return NextResponse.json({ error: "create-failed", details: created }, { status: createRes.status });
  }

  const playlistId = created?.id;
  if (!playlistId) {
    return NextResponse.json({ error: "no-playlist-id", details: created }, { status: 500 });
  }

  // 4) Añadir pistas en bloques de 100
  let addedTotal = 0;
  if (uris.length > 0) {
    for (let i = 0; i < uris.length; i += 100) {
      const chunk = uris.slice(i, i + 100);
      const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: chunk }),
        cache: "no-store",
      });
      const addBody = await addRes.json();
      if (!addRes.ok) {
        return NextResponse.json(
          { error: "add-tracks-failed", at: i, details: addBody },
          { status: addRes.status }
        );
      }
      addedTotal += chunk.length;
    }
  }

  // 5) URLs útiles
  const url = created?.external_urls?.spotify || `https://open.spotify.com/playlist/${playlistId}`;
  const appUrl = `spotify://playlist/${playlistId}`;

  return NextResponse.json({
    ok: true,
    id: playlistId,
    name,
    url,           // web
    appUrl,        // app
    external_url: url,
    open_url: url,
    added: addedTotal,
  });
}
