import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json({ error: "no-access-token" }, { status: 401 });
  }

  const { name = "Mi playlist", tracks = [] } = await req.json();

  // 1) usuario actual
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  const me = await meRes.json();

  // 2) crear playlist pública
  const createRes = await fetch(
    `https://api.spotify.com/v1/users/${me.id}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        public: true,
        description: "Generada con IA (demo)",
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    return NextResponse.json({ error: "create-playlist", details: err }, { status: 500 });
  }

  const playlist = await createRes.json();
  const playlistId = playlist.id;

  // 3) añadir canciones (URIs tipo "spotify:track:XXXX")
  if (tracks.length) {
    const addRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: tracks }),
      }
    );
    if (!addRes.ok) {
      const err = await addRes.text();
      return NextResponse.json({ error: "add-tracks", details: err }, { status: 500 });
    }
  }

  const webUrl = `https://open.spotify.com/playlist/${playlistId}`;
  const appUrl = `spotify://playlist/${playlistId}`;

  return NextResponse.json({ ok: true, playlistId, webUrl, appUrl });
}
