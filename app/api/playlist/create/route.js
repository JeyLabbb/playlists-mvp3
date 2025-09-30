import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json({ error: "no-access-token" }, { status: 401 });
  }

  const { name, description = "", uris = [], isPublic = false } = await req.json();
  if (!name || !Array.isArray(uris) || uris.length === 0) {
    return NextResponse.json({ error: "missing name or uris" }, { status: 400 });
  }

  // 1) Obtener mi perfil para saber user_id
  const me = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  }).then(r => r.json());

  // 2) Crear playlist
  const create = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description, public: !!isPublic }),
  }).then(r => r.json());

  if (!create?.id) {
    return NextResponse.json({ error: "cannot-create-playlist", detail: create }, { status: 400 });
  }

  // 3) Añadir tracks (en bloques por si hay muchas)
  const chunk = (arr, n) => arr.reduce((a,_,i)=> (i % n ? a : [...a, arr.slice(i, i+n)]), []);
  const batches = chunk(uris, 100);
  for (const batch of batches) {
    const add = await fetch(`https://api.spotify.com/v1/playlists/${create.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: batch }),
    });
    if (!add.ok) {
      const err = await add.json();
      return NextResponse.json({ error: "add-tracks-failed", detail: err }, { status: add.status });
    }
  }

  return NextResponse.json({
    playlistId: create.id,
    url: create?.external_urls?.spotify || null,
  });
}
