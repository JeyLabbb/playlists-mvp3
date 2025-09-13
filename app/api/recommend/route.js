import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const t of list) {
    if (!t?.id) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}
function mapTrack(t) {
  return {
    id: t.id,
    name: t.name,
    artists: (t.artists || []).map((a) => a.name).join(", "),
    uri: t.uri,
    open_url:
      t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
  };
}

async function searchOneTrack({ track, artist }, accessToken) {
  const parts = [];
  if (track) parts.push(`track:"${String(track).replace(/"/g, "")}"`);
  if (artist) parts.push(`artist:"${String(artist).replace(/"/g, "")}"`);
  const q = parts.join(" ");

  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", q || track || artist || "");
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "5");
  url.searchParams.set("market", "from_token");

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const data = await r.json();
  const items = data?.tracks?.items || [];
  if (!items.length) return null;

  if (artist) {
    const exact = items.find((it) =>
      (it.artists || []).some(
        (a) => a.name.toLowerCase() === String(artist).toLowerCase()
      )
    );
    if (exact) return mapTrack(exact);
  }
  return mapTrack(items[0]);
}

async function fillWithRecommendations({ have, need, accessToken, seeds }) {
  if (need <= 0) return [];
  const url = new URL("https://api.spotify.com/v1/recommendations");
  url.searchParams.set("limit", String(Math.min(need, 100)));

  const seed_tracks = seeds.tracks.slice(0, 5);
  const seed_artists = seeds.artists.slice(
    0,
    Math.max(0, 5 - seed_tracks.length)
  );
  const seed_genres = seeds.genres.slice(
    0,
    Math.max(0, 5 - seed_tracks.length - seed_artists.length)
  );

  if (seed_tracks.length)
    url.searchParams.set("seed_tracks", seed_tracks.join(","));
  if (seed_artists.length)
    url.searchParams.set("seed_artists", seed_artists.join(","));
  if (seed_genres.length)
    url.searchParams.set("seed_genres", seed_genres.join(","));

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const data = await r.json();
  const recs = (data?.tracks || []).map(mapTrack);

  const haveIds = new Set(have.map((t) => t.id));
  return recs.filter((t) => !haveIds.has(t.id));
}

export default async function handler(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "no-access-token" }, { status: 401 });
    }

    // lee entrada rápida (por compat)
    let prompt = "";
    let count = 30;
    if (req.method === "GET") {
      const sp = new URL(req.url).searchParams;
      prompt = sp.get("prompt") || "";
      count = Number(sp.get("limit") || sp.get("count") || 30);
    } else {
      try {
        const body = await req.json();
        prompt = body?.prompt || "";
        count = Number(body?.limit || body?.count || 30);
      } catch {}
    }
    count = Math.max(1, Math.min(count, 200));

    // esto solo hace búsqueda directa; tu flujo oficial usa /api/plan + /api/recs
    const found = [];
    const seeds = { tracks: [], artists: [], genres: [] };

    // ejemplo: si te pasaran candidates
    const candidates = Array.isArray([]) ? [] : [];
    for (const c of candidates) {
      if (found.length >= count) break;
      const t = await searchOneTrack(
        { track: c.track, artist: c.artist },
        token.accessToken
      );
      if (t) {
        found.push(t);
        if (seeds.tracks.length < 5) seeds.tracks.push(t.id);
      }
    }

    let tracks = dedupeById(found);
    if (tracks.length < count) {
      const extra = await fillWithRecommendations({
        have: tracks,
        need: count - tracks.length,
        accessToken: token.accessToken,
        seeds,
      });
      tracks = dedupeById([...tracks, ...extra]).slice(0, count);
    }

    return NextResponse.json({
      ok: true,
      used: "search+recs",
      prompt,
      requested: count,
      got: tracks.length,
      tracks,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "server", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
