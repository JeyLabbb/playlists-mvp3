import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/* ============= UTILIDADES ============= */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function dedupeById(list) {
  const seen = new Set(); const out = [];
  for (const t of list) {
    if (!t?.id) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id); out.push(t);
  }
  return out;
}

function mapTrack(t) {
  return {
    id: t.id,
    name: t.name,
    artist_ids: (t.artists || []).map(a => a.id).filter(Boolean),
    artists: (t.artists || []).map(a => a.name).join(", "),
    uri: t.uri,
    explicit: !!t.explicit,
    open_url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
  };
}

function stripAccents(s) {
  return String(s||"").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function cleanTokens(str) {
  return stripAccents(String(str||""))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ============= SPOTIFY HELPERS ============= */
async function searchOneTrack({ track, artist }, token) {
  const parts = [];
  if (track)  parts.push(`track:"${String(track).replace(/"/g, '')}"`);
  if (artist) parts.push(`artist:"${String(artist).replace(/"/g, '')}"`);
  const q = parts.join(" ") || (track || artist || "");
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "5");
  url.searchParams.set("market", "from_token");

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json();
  const items = data?.tracks?.items || [];
  if (!items.length) return null;

  if (artist) {
    const exact = items.find(it =>
      (it.artists || []).some(a => a.name.toLowerCase() === String(artist).toLowerCase())
    );
    if (exact) return mapTrack(exact);
  }
  return mapTrack(items[0]);
}

async function searchPlaylists(terms, token, limitTotal = 24) {
  const results = [];
  const tried = new Set();
  for (const term of terms || []) {
    if (results.length >= limitTotal) break;
    const q = String(term || "").trim();
    if (!q || tried.has(q.toLowerCase())) continue;
    tried.add(q.toLowerCase());

    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", q);
    url.searchParams.set("type", "playlist");
    url.searchParams.set("limit", "20");
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!r.ok) continue;
    const data = await r.json();
    const items = data?.playlists?.items || [];
    for (const pl of items) {
      results.push({ id: pl.id, name: pl.name });
      if (results.length >= limitTotal) break;
    }
  }
  return results;
}

async function fetchPlaylistMeta(playlistId, token) {
  const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
  });
  if (!r.ok) return null;
  const d = await r.json();
  return {
    id: d?.id,
    name: d?.name || "",
    description: d?.description || "",
  };
}

async function fetchPlaylistTracks(playlistId, token, cap = 200) {
  const acc = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  while (url && acc.length < cap) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!r.ok) break;
    const data = await r.json();
    const items = data?.items || [];
    for (const it of items) {
      const t = it?.track;
      if (!t?.id) continue;
      acc.push(mapTrack(t));
      if (acc.length >= cap) break;
    }
    url = data?.next || null;
  }
  return acc;
}

async function fetchAudioFeatures(ids, token) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const url = new URL("https://api.spotify.com/v1/audio-features");
    url.searchParams.set("ids", chunk.join(","));
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!r.ok) continue;
    const data = await r.json();
    for (const f of (data?.audio_features || [])) {
      if (f?.id) out.set(f.id, f);
    }
  }
  return out;
}

async function fetchArtistTopTracks(artistId, token) {
  const r = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=from_token`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
  });
  if (!r.ok) return [];
  const data = await r.json();
  return (data?.tracks || []).map(mapTrack);
}

async function fillWithRecommendations({ have, need, token, seeds }) {
  if (need <= 0) return [];
  const url = new URL("https://api.spotify.com/v1/recommendations");
  url.searchParams.set("limit", String(Math.min(need, 100)));
  const seed_tracks = (seeds.tracks || []).slice(0, 5);
  const seed_artists = (seeds.artists || []).slice(0, Math.max(0, 5 - seed_tracks.length));
  const seed_genres = (seeds.genres || []).slice(0, Math.max(0, 5 - seed_tracks.length - seed_artists.length));
  if (seed_tracks.length) url.searchParams.set("seed_tracks", seed_tracks.join(","));
  if (seed_artists.length) url.searchParams.set("seed_artists", seed_artists.join(","));
  if (seed_genres.length) url.searchParams.set("seed_genres", seed_genres.join(","));
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json();
  const recs = (data?.tracks || []).map(mapTrack);
  const haveIds = new Set(have.map(t => t.id));
  return recs.filter(t => !haveIds.has(t.id));
}

/* ============= FEATURES/FILTROS ============= */
function applyFeatureFilters(tracks, featMap, rules) {
  const out = [];
  for (const t of tracks) {
    const f = featMap.get(t.id) || {};
    if (rules?.bpmMin && f.tempo && f.tempo < rules.bpmMin) continue;
    if (rules?.bpmMax && f.tempo && f.tempo > rules.bpmMax) continue;
    if (rules?.instrumental && typeof f.instrumentalness === "number" && f.instrumentalness < 0.5) continue;
    if (rules?.cleanOnly && t.explicit) continue;
    out.push(t);
  }
  return out;
}

/* ============= OPENAI HELPERS ============= */
function readOpenAIText(data) {
  return (
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    (Array.isArray(data?.content) && data.content[0]?.text) ||
    ""
  );
}
function safeParseJSON(text) {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const raw = fenced ? fenced[1] : text;
    return JSON.parse(raw);
  } catch { return null; }
}

/* ============= BUILD SEARCH TERMS FOR EVENT ============= */
function buildEventTerms(prompt, queryTerms = [], years = []) {
  const p = stripAccents(prompt).trim();
  const base = new Set();

  // base directos
  if (p) base.add(p);
  for (const qt of queryTerms) if (qt) base.add(stripAccents(qt));

  // combinaciones típicas
  const words = p.split(/\s+/).filter(Boolean);
  if (words.length) {
    const joined = words.join(" ");
    base.add(`${joined} festival`);
    base.add(`${joined} lineup`);
    base.add(`${joined} line up`);
    base.add(`${joined} cartel`);
    base.add(`${joined} oficial`);
  }

  // con años
  for (const y of years) {
    if (!y) continue;
    base.add(`${p} ${y}`);
    base.add(`${p} festival ${y}`);
    base.add(`${p} cartel ${y}`);
    base.add(`${p} lineup ${y}`);
    base.add(`${p} line up ${y}`);
  }

  // limpiar
  return Array.from(base).map(s => s.replace(/\s+/g, " ").trim()).filter(s => s.length >= 3).slice(0, 20);
}

/* ============= SCORING DE PLAYLIST ============= */
function scorePlaylistMeta(meta, tokens, years) {
  const name = cleanTokens(meta?.name || "");
  const desc = cleanTokens(meta?.description || "");
  let score = 0;

  for (const t of tokens) {
    if (!t) continue;
    if (name.includes(t)) score += t.length >= 6 ? 3.0 : 1.8;
    if (desc.includes(t)) score += 1.2;
  }
  for (const y of years || []) {
    if (name.includes(y)) score += 2.8;
    if (desc.includes(y)) score += 1.6;
  }
  // bonus si empieza por el nombre clave
  if (tokens.length) {
    const first = tokens[0];
    if (name.startsWith(first)) score += 1.5;
  }
  // penalización leve si no encaja nada
  if (!tokens.some(t => name.includes(t))) score -= 0.8;

  return score;
}

/* ============= HANDLER ============= */
export default async function handler(req) {
  try {
    // 1) Auth
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "no-access-token" }, { status: 401 });
    }

    // 2) prompt + count
    let prompt = "", count = 30;
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
    count = clamp(count || 30, 1, 200);

    // 3) Llamada compacta a OpenAI para plan básico (como /api/plan)
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const system = `
Eres un planificador musical. Devuelve SOLO JSON:
{
  "candidates": [ { "track": "Titulo", "artist": "Artista" }, ... ],
  "queryTerms": ["palabras","clave","para","Spotify"],
  "targetGenres": ["hardstyle","techno","..."],
  "isEvent": true|false,
  "years": ["2025"],
  "count": 120,
  "rules": { "bpmMin": null, "bpmMax": null, "instrumental": false, "cleanOnly": false }
}
Reglas: candidates ≥ COUNT + 40% (sin inventar). SOLO JSON.
`.trim();
    const user = `COUNT=${count}
PROMPT=${prompt}`.trim();

    const or = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model, temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }]
      })
    });

    if (!or.ok) {
      const err = await or.text();
      return NextResponse.json({ error: "openai", details: err }, { status: 500 });
    }
    const odata = await or.json();
    const planRaw = readOpenAIText(odata);
    const plan = safeParseJSON(planRaw) || { candidates: [], queryTerms: [], targetGenres: [], years: [], rules: {}, isEvent: false, count };

    const rules = typeof plan.rules === "object" && plan.rules ? plan.rules : {};
    const targetGenres = Array.isArray(plan.targetGenres) ? plan.targetGenres : [];
    const years = Array.isArray(plan.years) ? plan.years.map(String) : [];

    /* 4) FESTIVAL branch robusto */
    let pool = [];
    const seeds = { tracks: [], artists: [], genres: (targetGenres || []).slice(0,5) };

    if (plan.isEvent) {
      // construir términos potentes
      const terms = buildEventTerms(prompt, plan.queryTerms, years);
      const pls = await searchPlaylists(terms, token.accessToken, 24);

      if (pls.length === 0) {
        // si ni siquiera hay playlists, devolvemos guidance
        return NextResponse.json({ ok: false, reason: "no-playlists", message: "No encontré playlists públicas del evento. Prueba con el nombre completo del festival y el año." }, { status: 404 });
      }

      // score meta
      const tokens = cleanTokens(prompt).split(" ").filter(w => w && w.length >= 3);
      const metas = [];
      for (const pl of pls) {
        const meta = await fetchPlaylistMeta(pl.id, token.accessToken);
        if (meta) metas.push(meta);
      }
      metas.sort((a,b) => scorePlaylistMeta(b, tokens, years) - scorePlaylistMeta(a, tokens, years));

      // top N para cosechar (más alto si hay ruido)
      const take = clamp(Math.ceil(metas.length * 0.33), 4, 8);
      const topMetas = metas.slice(0, take);

      // tracks por playlist + pesos
      const weights = new Map(); // playlistId -> weight
      const maxScore = Math.max(...topMetas.map(m => scorePlaylistMeta(m, tokens, years)), 1);
      for (const m of topMetas) {
        const s = scorePlaylistMeta(m, tokens, years);
        const w = 1 + (s / maxScore) * 4; // peso 1..5
        weights.set(m.id, w);
      }

      const byPl = [];
      for (const m of topMetas) {
        const ts = await fetchPlaylistTracks(m.id, token.accessToken, 200);
        byPl.push({ id: m.id, w: weights.get(m.id) || 1, ts });
        pool.push(...ts);
      }

      // frecuencias ponderadas
      const trackW = new Map();
      const artistW = new Map();

      for (const { id: pid, w, ts } of byPl) {
        const seenArtist = new Set();
        for (const t of ts) {
          trackW.set(t.id, (trackW.get(t.id) || 0) + w);
          for (const aid of (t.artist_ids || [])) {
            if (seenArtist.has(aid)) continue;
            seenArtist.add(aid);
            artistW.set(aid, (artistW.get(aid) || 0) + w);
          }
        }
      }

      // core por umbrales dinámicos
      const trackThr = Math.max(2, Math.floor((Math.max(...trackW.values(), 2)) * 0.35));
      const artistThr = Math.max(2, Math.floor((Math.max(...artistW.values(), 2)) * 0.35));

      const coreArtistIds = new Set(Array.from(artistW.entries()).filter(([,w]) => w >= artistThr).map(([id]) => id));
      const prelim = [];
      for (const t of pool) {
        const tw = trackW.get(t.id) || 0;
        const hasCoreArtist = (t.artist_ids || []).some(aid => coreArtistIds.has(aid));
        if (tw >= trackThr || hasCoreArtist) prelim.push(t);
      }

      // semillas tracks
      for (const t of prelim.slice(0, 5)) {
        if (seeds.tracks.length < 5) seeds.tracks.push(t.id);
      }

      // si aún muy cortos, reforzar con top-tracks de artistas core
      let finalFest = dedupeById(prelim);
      if (finalFest.length < count && coreArtistIds.size) {
        const topArtistList = Array.from(coreArtistIds).slice(0, 10);
        for (const aid of topArtistList) {
          const top = await fetchArtistTopTracks(aid, token.accessToken);
          finalFest.push(...top);
          if (finalFest.length >= count * 1.5) break;
        }
        finalFest = dedupeById(finalFest);
      }

      pool = finalFest;
    } else {
      // no-event: usar candidatos de la IA (track+artist) y semillas de tracks
      const found = [];
      for (const c of (plan.candidates || [])) {
        if (found.length >= count) break;
        const t = await searchOneTrack(
          { track: String(c?.track || "").slice(0, 120), artist: String(c?.artist || "").slice(0, 80) },
          token.accessToken
        );
        if (t) {
          found.push(t);
          if (seeds.tracks.length < 5) seeds.tracks.push(t.id);
        }
      }
      pool = dedupeById(found);
    }

    // 5) Filtrado por features
    const feat0 = await fetchAudioFeatures(pool.map(t => t.id), token.accessToken);
    let filtered = applyFeatureFilters(pool, feat0, rules);

    // 6) Relleno si falta
    if (filtered.length < count) {
      const extra = await fillWithRecommendations({
        have: filtered, need: count - filtered.length, token: token.accessToken, seeds
      });
      const feat1 = await fetchAudioFeatures(extra.map(t => t.id), token.accessToken);
      const extraF = applyFeatureFilters(extra, feat1, rules);
      filtered = dedupeById([...filtered, ...extraF]);
    }

    const final = filtered.slice(0, count);

    if (!final.length) {
      return NextResponse.json({
        ok: false,
        reason: "no-results",
        message: "No hubo coincidencias sólidas para ese evento. Prueba con el nombre completo y el año (ej.: “Arenal Sound 2023”)."
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      used: plan.isEvent ? "festival-weighted" : "ai+match",
      prompt,
      requested: count,
      got: final.length,
      tracks: final
    });

  } catch (e) {
    return NextResponse.json({ error: "server", message: String(e?.message || e) }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
