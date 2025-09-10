import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

async function safeJsonResponse(r) {
  const text = await r.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

function mapTracks(items) {
  return (items || []).map(t => ({
    id: t.id,
    name: t.name,
    artists: (t.artists || []).map(a => a.name).join(', '),
    uri: t.uri,
    preview_url: t.preview_url || null,
  }));
}

async function handler(req) {
  try {
    // 1) token de Spotify desde NextAuth
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'no-access-token' }, { status: 401 });
    }

    // 2) prompt / limit desde GET ?prompt=… o POST JSON
    let prompt = '';
    let limit = 10;

    if (req.method === 'GET') {
      const sp = new URL(req.url).searchParams;
      prompt = sp.get('prompt') || '';
      limit = Number(sp.get('limit') || 10);
    } else {
      try {
        const body = await req.json();
        prompt = body?.prompt || '';
        limit = Number(body?.limit || 10);
      } catch {}
    }

    // 3) BÚSQUEDA directa en Spotify (garantiza resultados si hay login)
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.set('q', prompt || 'pop');
    url.searchParams.set('type', 'track');
    url.searchParams.set('limit', String(Math.min(limit || 10, 50)));

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
      cache: 'no-store',
    });

    const body = await safeJsonResponse(r);

    if (!r.ok) {
      // devolvemos SIEMPRE un JSON con el detalle del fallo
      return NextResponse.json(
        { error: 'spotify', status: r.status, url: url.toString(), body },
        { status: r.status }
      );
    }

    const tracks = mapTracks(body?.tracks?.items);
    return NextResponse.json({
      ok: true,
      used: 'search',
      url: url.toString(),
      prompt,
      tracks,
    });
  } catch (e) {
    // catch global para evitar pantallas en blanco
    return NextResponse.json(
      { error: 'server', message: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
