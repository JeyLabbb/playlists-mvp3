import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function readOpenAIText(data) {
  return (
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    (Array.isArray(data?.content) && data.content[0]?.text) ||
    ""
  );
}
function safeParsePlan(text) {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const raw = fenced ? fenced[1] : text;
    return JSON.parse(raw);
  } catch { return null; }
}
function dedupeById(list) {
  const seen = new Set(); const out = [];
  for (const t of list) { if (!t?.id) continue; if (seen.has(t.id)) continue; seen.add(t.id); out.push(t); }
  return out;
}
function mapTrack(t) {
  return {
    id: t.id,
    name: t.name,
    artists: (t.artists || []).map(a => a.name).join(", "),
    uri: t.uri,
    open_url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`
  };
}
async function searchOneTrack({ track, artist }, token) {
  const qParts = [];
  if (track)  qParts.push(`track:"${track.replace(/"/g,"")}"`);
  if (artist) qParts.push(`artist:"${artist.replace(/"/g,"")}"`);
  const q = qParts.join(" ");

  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", q || track || artist || "");
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "5");
  url.searchParams.set("market", "from_token");

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json();
  const items = data?.tracks?.items || [];
  if (!items.length) return null;

  if (artist) {
    const exact = items.find(it => (it.artists || []).some(a => a.name.toLowerCase() === artist.toLowerCase()));
    if (exact) return mapTrack(exact);
  }
  return mapTrack(items[0]);
}
async function fillWithRecommendations({ have, need, token, seeds }) {
  if (need <= 0) return [];
  const url = new URL("https://api.spotify.com/v1/recommendations");
  url.searchParams.set("limit", String(Math.min(need, 100)));

  const seed_tracks = seeds.tracks.slice(0,5);
  const seed_artists = seeds.artists.slice(0, Math.max(0, 5 - seed_tracks.length));
  const seed_genres  = seeds.genres.slice(0, Math.max(0, 5 - seed_tracks.length - seed_artists.length));
  if (seed_tracks.length)  url.searchParams.set("seed_tracks",  seed_tracks.join(","));
  if (seed_artists.length) url.searchParams.set("seed_artists", seed_artists.join(","));
  if (seed_genres.length)  url.searchParams.set("seed_genres",  seed_genres.join(","));

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json();
  const recs = (data?.tracks || []).map(mapTrack);

  const haveIds = new Set(have.map(t => t.id));
  return recs.filter(t => !haveIds.has(t.id));
}

export default async function handler(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "no-access-token" }, { status: 401 });
    }

    let prompt = ""; let count = 30;
    if (req.method === "GET") {
      const sp = new URL(req.url).searchParams;
      prompt = sp.get("prompt") || "";
      count = Number(sp.get("limit") || sp.get("count") || 30);
    } else {
      try { const body = await req.json(); prompt = body?.prompt || ""; count = Number(body?.limit || body?.count || 30); } catch {}
    }
    count = Math.max(1, Math.min(count, 200));

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const system = `
Eres un planificador musical experto. Dado un prompt usuario, devuelve SOLO JSON:
{
  "candidates": [ { "track": "...", "artist": "..." }, ... ],
  "genres": ["..."],
  "notes": "breve explicación (opcional)"
}
Reglas:
- "candidates" debe tener al menos COUNT + 40% (para cubrir caídas) y NUNCA títulos inventados raros.
- Respeta el idioma, épocas, energía, "sin voces", festivales, etc., si el prompt lo indica.
- Si el prompt pide "200 canciones", intenta mezclar artistas variados.
- No devuelvas nada que no exista en Spotify. Evita karaoke/covers si no se piden.
- SOLO JSON válido (sin texto fuera).
    `.trim();
    const user = `COUNT=${count}
PROMPT=${prompt}`.trim();

    const or = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, system, input: user, temperature: 0.4 })
    });
    if (!or.ok) {
      const err = await or.text();
      return NextResponse.json({ error: "openai", details: err }, { status: 500 });
    }
    const odata = await or.json();
    const text = readOpenAIText(odata);
    const plan = safeParsePlan(text) || { candidates: [], genres: [] };

    const candidates = Array.isArray(plan.candidates) ? plan.candidates : [];
    const wanted = count;

    const found = [];
    const seeds = { tracks: [], artists: [], genres: (plan.genres || []).slice(0, 5) };

    for (const c of candidates) {
      if (found.length >= wanted) break;
      const t = await searchOneTrack(
        { track: String(c?.track || "").slice(0,120), artist: String(c?.artist || "").slice(0,80) },
        token.accessToken
      );
      if (t) {
        found.push(t);
        if (seeds.tracks.length < 5) seeds.tracks.push(t.id);
      }
    }

    let tracks = dedupeById(found);

    if (tracks.length < wanted) {
      const extra = await fillWithRecommendations({
        have: tracks, need: wanted - tracks.length, token: token.accessToken, seeds
      });
      tracks = dedupeById([...tracks, ...extra]).slice(0, wanted);
    }

    return NextResponse.json({ ok: true, used: "ai+match", prompt, requested: wanted, got: tracks.length, tracks });
  } catch (e) {
    return NextResponse.json({ error: "server", message: String(e?.message || e) }, { status: 500 });
  }
}
export const GET = handler;
export const POST = handler;
