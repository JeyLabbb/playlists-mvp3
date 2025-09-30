"use client";

import { useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(50);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  // progreso
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const progTimer = useRef(null);

  // crear
  const [playlistName, setPlaylistName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  // modal consejos
  const [showTips, setShowTips] = useState(false);

  function startProgress(label = "🤖 IA pensando… puede tardar unos segundos") {
    setStatus(label);
    setProgress(0);
    if (progTimer.current) clearInterval(progTimer.current);
    progTimer.current = setInterval(() => {
      setProgress((p) => {
        const cap = 90;
        if (p < cap) {
          const inc = p < 30 ? 2.0 : p < 60 ? 1.2 : 0.6;
          return Math.min(cap, p + inc);
        }
        return p;
      });
    }, 200);
  }
  function bumpPhase(label, floor) {
    setStatus(label);
    setProgress((p) => Math.max(p, floor));
  }
  function finishProgress() {
    if (progTimer.current) {
      clearInterval(progTimer.current);
      progTimer.current = null;
    }
    setProgress(100);
  }
  function resetProgress() {
    if (progTimer.current) {
      clearInterval(progTimer.current);
      progTimer.current = null;
    }
    setProgress(0);
    setStatus("");
  }

  function safeDefaultName(p) {
    const s = (p || "").replace(/\s+/g, " ").trim();
    return s.length > 60 ? s.slice(0, 57) + "…" : s || "Mi playlist IA";
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      alert("Escribe un prompt.");
      return;
    }
    const wanted = Number(count) || 50;

    setLoading(true);
    setTracks([]);
    startProgress("🤖 IA pensando… puede tardar unos segundos");

    try {
      bumpPhase("🧠 Interpretando tu prompt…", 20);
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count: wanted }),
      });
      const plan = await planRes.json();
      if (!planRes.ok || !plan?.plan) throw new Error("plan-failed");

      bumpPhase(
        plan.plan.isEvent
          ? "🔎 Buscando playlists públicas relevantes…"
          : "🎯 Buscando canciones y artistas…",
        40
      );

      const recsRes = await fetch("/api/recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.plan }),
      });
      const recs = await recsRes.json();
      if (!recsRes.ok || !recs?.ok) throw new Error("recs-failed");

      bumpPhase("🎛️ Afinando por género/ritmo…", 70);
      await new Promise((r) => setTimeout(r, 300));

      setTracks(recs.tracks || []);
      if ((recs.got ?? 0) < (plan.plan.count ?? 0)) {
        alert(`⚠️ Solo se han añadido ${recs.got} de ${plan.plan.count}. Seguiremos mejorando con artistas del cartel.`);
      }
      const shortfall = Math.max(0, (plan.plan.count ?? 0) - (recs.got ?? 0));
      if (shortfall > 10) {
        if (plan.plan.isEvent) {
          alert(`⚠️ Se generaron ${recs.got}/${plan.plan.count}. Seguiremos mejorando (solo usamos artistas presentes en varias playlists del festival).`);
        } else {
          alert(`⚠️ Se generaron ${recs.got}/${plan.plan.count}. Intenta afinar más el prompt y nosotros seguiremos mejorando.`);
        }
      }
      finishProgress();
      setStatus(`✔️ Lista generada (${recs.got}/${plan.plan.count})`);
      if (!playlistName.trim()) setPlaylistName(safeDefaultName(prompt));
    } catch (e) {
      console.error(e);
      resetProgress();
      alert(
        "⚠️ Error al generar. Prueba otra vez (haz el prompt más concreto o reduce el nº de canciones)."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!tracks.length) return;
    setCreating(true);
    try {
      // añadimos “— by JeyLabbb” al nombre que se envía a Spotify
      const finalName = `${playlistName || safeDefaultName(prompt)} — by JeyLabbb`;

      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          description: `Generada con IA (demo) — by JeyLabbb · ${prompt}`,
          public: !!isPublic,
          uris: tracks.map((t) => t.uri).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "create-failed");

      // abrir app y fallback a web
      const webUrl =
        data.webUrl ||
        data.url ||
        data.open_url ||
        data.external_url ||
        (data.id ? `https://open.spotify.com/playlist/${data.id}` : "");
      const appUrl = data.appUrl || (data.id ? `spotify://playlist/${data.id}` : "");

      if (appUrl) {
        const t = setTimeout(() => {
          if (webUrl) window.open(webUrl, "_blank");
        }, 800);
        window.location.href = appUrl;
        // por si el navegador bloquea el location, abrimos igualmente la web
        setTimeout(() => {
          try {
            if (webUrl) window.open(webUrl, "_blank");
          } catch {}
        }, 1200);
      } else if (webUrl) {
        window.open(webUrl, "_blank");
      }

      alert("✅ Playlist creada en tu Spotify");
    } catch (e) {
      console.error(e);
      alert("⚠️ No se pudo crear en tu Spotify. Inicia sesión de nuevo y reintenta.");
    } finally {
      setCreating(false);
    }
  }

  const examples = [
    "hardstyle + nightcore, 80 canciones, energía alta",
    "música clásica (Vivaldi/Mozart), sin voces, 50-80 bpm",
    "festival 2025 Riverland, 120 canciones",
    "para estudiar concentrado, ambient/chill, sin voces, 60 canciones",
    "para gym, techno 125-140 bpm, sin letras explícitas, 100 canciones",
  ];

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px" }}>
      {/* header + sesión */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Playlist AI — MVP</h1>
        <div>
          {session ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Conectado: {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("spotify")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Iniciar sesión con Spotify
            </button>
          )}
        </div>
      </div>

      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        Escribe un prompt (ej.: “hardstyle nightcore 80 canciones”, “<strong>festival</strong>
        Festival Ejemplo 2025”, “para entrenar sin voces, 120-140 bpm”).
      </p>

      {/* prompt + controles */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", marginBottom: 8 }}>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tu prompt aquí…"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 14,
          }}
        />
        {/* chips de ejemplos */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {ex}
            </button>
          ))}
          <button
            onClick={() => setShowTips(true)}
            style={{
              marginLeft: "auto",
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#f8f8f8",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Consejos para el prompt
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 14 }}>Nº canciones (1–200):</label>
          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            style={{
              width: 100,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: loading ? "#f5f5f5" : "#111",
              color: loading ? "#111" : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "Generando…" : "Generar lista"}
          </button>
        </div>

        {/* barra progreso */}
        {loading || progress > 0 ? (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                height: 8,
                background: "#eee",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  transition: "width .25s linear",
                  background: "#22c55e",
                }}
              />
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{status}</div>
          </div>
        ) : null}
      </div>

      {/* opciones crear */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 10,
          padding: 12,
          marginTop: 12,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ minWidth: 140, fontSize: 14 }}>Nombre de playlist:</label>
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="(Usará tu prompt si lo dejas vacío)"
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              minWidth: 220,
            }}
          />
          <small style={{ opacity: 0.7 }}>
            Se añadirá automáticamente “— by JeyLabbb”.
          </small>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Pública
          </label>
          <button
            onClick={handleCreate}
            disabled={!tracks.length || creating}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: !tracks.length || creating ? "#f5f5f5" : "#111",
              color: !tracks.length || creating ? "#111" : "#fff",
              cursor: !tracks.length || creating ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {creating ? "Creando…" : "Crear en mi Spotify"}
          </button>
        </div>
      </div>

      {/* resultados */}
      <div style={{ marginTop: 18 }}>
        {tracks.length ? (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {tracks.length} canciones generadas
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {tracks.map((t, i) => (
                <li
                  key={t.id || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ fontSize: 14 }}>
                    <strong>{t.name}</strong>{" "}
                    <span style={{ opacity: 0.8 }}>— {(t.artists || []).join(", ")}</span>
                  </div>
                  <a href={t.open_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                    Abrir
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p style={{ opacity: 0.7 }}>
            No hay resultados todavía. Genera una playlist para ver las canciones aquí.
          </p>
        )}
      </div>

      {/* MODAL de consejos */}
      {showTips ? (
        <div
          onClick={() => setShowTips(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 95vw)",
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Consejos para escribir tu prompt
              </h3>
              <button
                onClick={() => setShowTips(false)}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "6px 10px",
                  background: "#f8f8f8",
                  cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <ul>
                <li>
                  <b>Cantidad</b>: elige el número en el selector (1–200). No hace falta ponerlo en el texto.
                </li>
                <li>
                  <b>Estilo</b>: describe género/mood/época (ej.: “hardstyle y nightcore”, “2000s-actualidad”).
                </li>
                <li>
                  <b>Voces</b>: añade “sin voces / instrumental” si quieres solo instrumentales.
                </li>
                <li>
                  <b>Ritmo</b>: puedes indicar rango de BPM (ej.: “120–140 bpm”).
                </li>
                <li>
                  <b>Festivales</b>: pon el nombre y la palabra <b>festival</b> + año(s) si quieres afinar (ej.: “Riverland festival 2025”).
                </li>
                <li>
                  <b>Artistas/canciones concretas</b>: puedes incluirlos para que aparezcan o para orientar el estilo.
                </li>
              </ul>
              <p style={{ opacity: 0.8, marginTop: 8 }}>
                Tip: si algo no sale perfecto a la primera, añade 1–2 ejemplos de artistas o un par de descriptores más
                (energía, idioma, década…).
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
