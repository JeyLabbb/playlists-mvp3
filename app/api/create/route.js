import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json({ error: "no-access-token" }, { status: 401 });
  }

  const { name = "Mi playlist", tracks = [] } = await req.json();

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

  // 1.5) Refuerzo: volver a aplicar nombre/descripcion (por si el POST la ignoró)
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ name, description, public: true }),
  });

  // 2) Añadir canciones en bloques de 100
  let remaining = [...tracks];
  while (remaining.length) {
    const chunk = remaining.slice(0, 100);
    remaining = remaining.slice(100);
    const addRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ uris: chunk }),
      }
    );
    if (!addRes.ok) {
      let det = null;
      try { det = await addRes.json(); } catch {}
      return NextResponse.json(
        { error: "spotify-add", details: det },
        { status: addRes.status }
      );
    }
  }

  const webUrl = `https://open.spotify.com/playlist/${playlistId}`;
  const appUrl = `spotify:playlist:${playlistId}`;

  return NextResponse.json({ id: playlistId, webUrl, appUrl }, { status: 200 });
}
