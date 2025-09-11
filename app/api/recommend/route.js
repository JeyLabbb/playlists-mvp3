import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// Devuelve JSON aunque Spotify no mande JSON
async function safeJsonResponse(res) {
  try { return await res.json(); } catch { return null; }
}

// Normaliza los tracks a lo que usa el front
function mapTracks(items = []) {
  return items.map((t) => ({
    id: t.id,
    name: t.name,
    artists: (t.artists || []).map((a) => a.name).join(", "),
    uri: t.uri,
    open_url: `https://open.spotify.com/track/${t.id}`,
  }));
}

async function handler(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json({ error: "no-access-token" }, { status: 401 });
  }

  let prompt = "";
  let limit = 30;
  if (req.method === "GET") {
    const sp = new URL(req.url).searchParams;
    prompt = sp.get("prompt") || "";
    limit = Number(sp.get("limit") || 30);
  } else {
    try {
      const body = await req.json();
      prompt = body?.prompt || "";
      limit = Number(body?.limit || 30);
    } catch {}
  }

  // CAP fuerte a 50 para evitar errores de Search en MVP
  const lim = Math.max(1, Math.min(Number.isFinite(limit) ? limit : 30, 50));

  try {
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", (prompt || "pop").trim());
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", String(lim));
    // Si más adelante quieres usar país del usuario: añade scope user-read-private y descomenta:
    // url.searchParams.set("market","from_token");

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
      next: { revalidate: 0 },
      cache: "no-store",
    });

    const body = await safeJsonResponse(r);

    if (!r.ok) {
      return NextResponse.json(
        { error: "spotify", status: r.status, url: url.toString(), body },
        { status: r.status }
      );
    }

    const tracks = mapTracks(body?.tracks?.items);
    return NextResponse.json(
      { ok: true, used: "search", url: url.toString(), prompt, tracks },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "server", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
