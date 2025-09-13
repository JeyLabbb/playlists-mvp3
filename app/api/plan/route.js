import { NextResponse } from "next/server";

const FALLBACK_GENRES = [
  "classical","musica clasica","piano","orchestral","ambient",
  "hardstyle","nightcore","phonk","techno","house","deep house",
  "drum and bass","dnb","dubstep","trance","hard trance",
  "reggaeton","latin","pop","rap","hip hop","rock","metal","indie","k-pop"
];
const FESTIVAL_HINTS = [
  "riverland","arenal","primavera","mad cool","boombastic","fib","sonar","o son do camiño",
  "cruilla","low festival","dcode","viña rock","resurrection","granada sound","groove pamplona"
];

const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const norm = (s)=>String(s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"");

function inferGenres(prompt){
  const p = norm(prompt);
  const out = new Set();
  for(const g of FALLBACK_GENRES){ if(p.includes(norm(g))) out.add(g); }
  if(/(concentrad|study|focus)/i.test(prompt)) out.add("ambient");
  if(/(gym|gimnasio|entrenar|motiv)/i.test(prompt)) out.add("techno");
  if(/(triste|melanc|chill)/i.test(prompt)) out.add("indie");
  if(/(clasic|vivaldi|mozart|beethoven)/i.test(prompt)) out.add("classical");
  return Array.from(out).slice(0,4);
}
function inferRules(prompt){
  const rules = { bpmMin:null, bpmMax:null, instrumental:false, cleanOnly:false };
  if(/(sin voces|instrumental)/i.test(prompt)) rules.instrumental = true;
  if(/(clean|limpia|sin palabras malsonantes)/i.test(prompt)) rules.cleanOnly = true;
  const m = String(prompt).match(/\b(\d{2,3})\s*-\s*(\d{2,3})\s*bpm\b/i);
  if(m){ rules.bpmMin = +m[1]; rules.bpmMax = +m[2]; }
  if(/(nightcore|hardstyle|techno)/i.test(prompt)) rules.bpmMin = rules.bpmMin ?? 120;
  return rules;
}
function detectYears(prompt){ return (String(prompt).match(/\b(20\d{2})\b/g) || []).slice(0,2); }
function detectEvent(prompt){
  const p = norm(prompt);
  if(/(festival|cartel|line[\s-]?up|lineup)/i.test(String(prompt))) return true;
  for(const k of FESTIVAL_HINTS){ if(p.includes(norm(k))) return true; }
  const words = p.trim().split(/\s+/).filter(Boolean);
  if(words.length<=3 && !FALLBACK_GENRES.some(g=>p.includes(norm(g)))) return true;
  return false;
}
function baseQueryTerms(prompt, years, isEvent){
  const out = new Set();
  const raw = String(prompt||"").trim();
  if(raw) out.add(raw);
  const noYears = raw.replace(/\b20\d{2}\b/g,"").trim();
  if(noYears) out.add(noYears);
  if(isEvent){
    const core = noYears || raw;
    if(core){
      out.add(`${core} festival`);
      out.add(`${core} lineup`);
      out.add(`${core} line up`);
      out.add(`${core} cartel`);
      out.add(`${core} oficial`);
      for(const y of years){
        out.add(`${core} ${y}`);
        out.add(`${core} festival ${y}`);
        out.add(`${core} cartel ${y}`);
        out.add(`${core} lineup ${y}`);
      }
    }
  }
  return Array.from(out).slice(0,10);
}

function makeHeuristicPlan(prompt, count){
  const years = detectYears(prompt);
  const isEvent = detectEvent(prompt);
  const targetGenres = inferGenres(prompt);
  const rules = inferRules(prompt);
  const queryTerms = baseQueryTerms(prompt, years, isEvent);

  const plan = {
    candidates: [],
    queryTerms,
    targetGenres,
    isEvent,
    years,
    count: clamp(Number(count)||50,1,200),
    rules,
    rawPrompt: prompt
  };
  // compat con /api/recs
  plan.queries = plan.queryTerms;
  plan.genres  = plan.targetGenres;
  return plan;
}

export async function POST(req){
  try{
    const { prompt = "", count = 50 } = await req.json().catch(()=>({}));
    const want = clamp(Number(count)||50,1,200);

    if(!process.env.OPENAI_API_KEY){
      return NextResponse.json({ ok:true, plan: makeHeuristicPlan(prompt, want), source:"heuristic-no-key" });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const system = `
Eres un planificador musical. Devuelve SOLO JSON válido:
{
  "candidates": [ { "track": "Titulo", "artist": "Artista" }, ... ],
  "queryTerms": ["palabras","clave","para","Spotify"],
  "targetGenres": ["hardstyle","techno","..."],
  "isEvent": true|false,
  "years": ["2025"],
  "count": 120,
  "rules": { "bpmMin": null, "bpmMax": null, "instrumental": false, "cleanOnly": false }
}
Reglas:
- "candidates" ≥ COUNT + 40% (para cubrir descartes) y NO inventes títulos.
- Si el prompt es sólo el nombre de un evento/festival, marca "isEvent": true y rellena "years" si aparecen.
- SOLO JSON. Nada fuera del JSON.
`.trim();

    const user = `COUNT=${want}
PROMPT=${prompt}`.trim();

    const r = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          { role:"system", content: system },
          { role:"user", content: user }
        ]
      })
    });

    if(!r.ok){
      return NextResponse.json({ ok:true, plan: makeHeuristicPlan(prompt, want), source:"heuristic-openai-fail" });
    }

    const data = await r.json();
    let raw = data?.choices?.[0]?.message?.content || "{}";
    let plan;
    try{ plan = JSON.parse(raw); }catch{ plan = {}; }

    const years = Array.isArray(plan.years) ? plan.years.map(String) : detectYears(prompt);
    const isEvent = !!plan.isEvent || detectEvent(prompt);
    const targetGenres = Array.isArray(plan.targetGenres)&&plan.targetGenres.length ? plan.targetGenres.slice(0,4) : inferGenres(prompt);
    const rules = typeof plan.rules==="object" && plan.rules ? plan.rules : inferRules(prompt);
    const qTerms = Array.isArray(plan.queryTerms) ? plan.queryTerms.slice(0,10) : [];
    const mergedTerms = Array.from(new Set([...qTerms, ...baseQueryTerms(prompt, years, isEvent)])).slice(0,10);

    const out = {
      candidates: Array.isArray(plan.candidates) ? plan.candidates : [],
      queryTerms: mergedTerms,
      targetGenres,
      isEvent,
      years,
      count: clamp(Number(plan.count || want),1,200),
      rules,
      rawPrompt: prompt
    };
    // compat /api/recs
    out.queries = out.queryTerms;
    out.genres  = out.targetGenres;

    return NextResponse.json({ ok:true, plan: out, source:"openai+sanity" });

  }catch(e){
    return NextResponse.json({ ok:true, plan: makeHeuristicPlan("", 50), source:"heuristic-catch" });
  }
}

export const GET = POST;
