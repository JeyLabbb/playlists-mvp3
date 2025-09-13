import { NextResponse } from "next/server";

const FALLBACK_GENRES = [
  "hardstyle","nightcore","phonk","techno","house","deep house","deephouse",
  "drum and bass","dnb","dubstep","trance","hard trance","hardtrance",
  "reggaeton","latin","pop","rap","hip hop","hip-hop","rock","metal","indie","k-pop","kpop",
  "classical","ambient","lo-fi","lofi","r&b","salsa","bachata","cumbia"
];

// Heurísticas locales simples desde el texto del prompt
function deriveConstraints(promptRaw) {
  const p = (promptRaw || "").toLowerCase();

  // bpm
  let bpmMin = null, bpmMax = null;
  const mRange = p.match(/(\d{2,3})\s*[-–]\s*(\d{2,3})\s*bpm/);
  if (mRange) { bpmMin = Number(mRange[1]); bpmMax = Number(mRange[2]); }
  const mSingle = !mRange && p.match(/(\d{2,3})\s*bpm/);
  if (mSingle) { const v = Number(mSingle[1]); bpmMin = v-3; bpmMax = v+3; }

  // voces / explícitos
  const noVoces = /sin voces|instrumental/i.test(promptRaw);
  const cleanOnly = /sin explícitos|sin explicitos|limpia|clean/i.test(promptRaw);

  // idioma
  const wantsSpanish = /español|castellano|espanol/i.test(promptRaw);
  const wantsEnglish = /inglés|ingles|english/i.test(promptRaw);

  // década
  let decade = null;
  const mDec = p.match(/\b(19|20)\d0s\b/); // ej. 2000s
  if (mDec) decade = mDec[0];

  // géneros
  const inferred = [];
  for (const g of FALLBACK_GENRES) if (p.includes(g)) inferred.push(g);

  // evento / festival
  const isEvent = /(festival|cartel|line[\s-]?up|lineup|riverland|primavera|mad\s?cool|boombastic|arenal|sonar|fib|o son do camiño|cruilla|groove\s+pamplona)/i.test(promptRaw);
  const years = (promptRaw.match(/\b(20\d{2})\b/g) || []).slice(0, 2);

  return {
    bpmMin, bpmMax,
    instrumental: noVoces,
    cleanOnly,
    wantsSpanish, wantsEnglish,
    decade,
    targetGenresGuess: Array.from(new Set(inferred)).slice(0,4),
    isEvent,
    years
  };
}

export async function POST(req) {
  try {
    const { prompt = "", count = 50 } = await req.json().catch(() => ({}));
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "openai-key-missing" }, { status: 500 });
    }

    // Pedimos a la IA un JSON (candidatos + términos de búsqueda + géneros)
    const system = `
Eres un planificador musical. Devuelve SOLO JSON válido:
{
  "candidates": [ { "track": "Titulo", "artist": "Artista" }, ... ],
  "queryTerms": ["palabras","clave","para","Spotify"],
  "targetGenres": ["hardstyle","techno","..."],
  "isEvent": true|false,
  "count": 120
}
Reglas:
- "candidates" ≥ COUNT + 40% (para cubrir descartes). No inventes títulos raros.
- "targetGenres": 2–4 géneros concisos alineados con el prompt.
- "isEvent": true si huele a festival/cartel/lineup/edición concreta.
- Respeta idioma/época/energía/“sin voces” si el prompt lo pide.
- SOLO JSON. Nada fuera del JSON.
`.trim();

    const user = `COUNT=${Number(count)||50}
PROMPT=${prompt}`.trim();

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const data = await r.json();
    if (!r.ok) return NextResponse.json({ error: "openai", details: data }, { status: r.status });

    const raw = data.choices?.[0]?.message?.content || "{}";
    let planAI; try { planAI = JSON.parse(raw); } catch { planAI = {}; }

    // Heurísticas locales
    const local = deriveConstraints(prompt);

    const out = {
      candidates: Array.isArray(planAI.candidates) ? planAI.candidates : [],
      queryTerms: Array.isArray(planAI.queryTerms) ? planAI.queryTerms.slice(0, 10) : [],
      targetGenres: Array.isArray(planAI.targetGenres) && planAI.targetGenres.length
        ? planAI.targetGenres.slice(0,4)
        : local.targetGenresGuess,
      isEvent: !!planAI.isEvent || local.isEvent,
      count: Math.max(1, Math.min(Number(planAI.count || count || 50), 200)),

      // Reglas operativas que aprovechará /api/recommend
      rules: {
        bpmMin: local.bpmMin, bpmMax: local.bpmMax,
        instrumental: local.instrumental,
        cleanOnly: local.cleanOnly,
        wantsSpanish: local.wantsSpanish,
        wantsEnglish: local.wantsEnglish,
        decade: local.decade
      },

      years: local.years,
      rawPrompt: prompt
    };

    // Asegurar queryTerms útiles (festival + año, etc.)
    const baseTerms = [];
    const noYears = (prompt || "").replace(/\b20\d{2}\b/g, "").trim();
    if (noYears) baseTerms.push(noYears);
    for (const y of (out.years||[])) baseTerms.push(`${noYears} ${y}`);

    const seen = new Set(out.queryTerms.map(t=>String(t||"").toLowerCase()));
    for (const t of baseTerms) {
      const k = String(t||"").toLowerCase();
      if (!seen.has(k) && k.length >= 3) { out.queryTerms.push(t); seen.add(k); }
    }

    return NextResponse.json({ ok: true, plan: out });
  } catch (e) {
    return NextResponse.json({ error: "server", message: String(e?.message || e) }, { status: 500 });
  }
}

export const GET = POST;
