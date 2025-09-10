import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

async function spotify(token, url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    next: { revalidate: 0 },
  });
  const data = await r.json().catch(() => ({}));
  return { r, data };
}

export async function POST(req) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt?.accessToken) {
    return NextResponse.json({ error: 'no-access-token' }, { status: 401 });
  }

  const { name = 'Playlist IA', uris = [] } = await req.json().catch(() => ({}));

  // ID de usuario
  const me = await spotify(jwt.accessToken, 'https://api.spotify.com/v1/me');
  if (!me.r.ok) return NextResponse.json({ error: me.data }, { status: me.r.status });
  const userId = me.data.id;

  // Crear playlist
  const created = await spotify(
    jwt.accessToken,
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    { method: 'POST', body: JSON.stringify({ name, public: false, description: 'Generada con IA (demo)' }) }
  );
  if (!created.r.ok) return NextResponse.json({ error: created.data }, { status: created.r.status });

  // Añadir canciones (máx 100 URIs)
  if (uris.length) {
    const added = await spotify(
      jwt.accessToken,
      `https://api.spotify.com/v1/playlists/${created.data.id}/tracks`,
      { method: 'POST', body: JSON.stringify({ uris: uris.slice(0, 100) }) }
    );
    if (!added.r.ok) return NextResponse.json({ error: added.data }, { status: added.r.status });
  }

  const url = created.data.external_urls?.spotify || `https://open.spotify.com/playlist/${created.data.id}`;
  return NextResponse.json({ ok: true, url, id: created.data.id });
}
