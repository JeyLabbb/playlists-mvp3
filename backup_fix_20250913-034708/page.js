"use client";

import { useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  const isAuthed = !!session;

  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(50);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Progreso y estados de texto
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const progTimer = useRef(null);

  // Opciones de creación
  const [playlistName, setPlaylistName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  // Modal de consejos
  const [showHelp, setShowHelp] = useState(false);
  const openHelp = () => setShowHelp(true);
  const closeHelp = () => setShowHelp(false);

  // -------- Helpers de progreso --------
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
  function applyBrand(name) {
    const base = (name || "Mi playlist IA").trim();
    const branded = `${base} · by JeyLabbb`;
    return branded.slice(0, 100);
  }

  // ---------------------- Generar (plan + recs) ----------------------
  async function handleGenerate() {
    if (!prompt.trim()) {
      alert("Escribe un prompt.");
      return;
    }
    if (!isAuthed) {
      await signIn("spotify");
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

  // ---------------------- Crear en Spotify ----------------------
  async function handleCreate() {
    if (!tracks.length) return;
    if (!isAuthed) {
      await signIn("spotify");
      return;
    }

    setCreating(true);
    try {
      const computedName = applyBrand(playlistName || safeDefaultName(prompt));
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: computedName,
          description: `Generada con IA (demo) — by JeyLabbb · ${prompt}`,
          public: !!isPublic,
          // IMPORTANTE: enviamos "tracks" (URIs) porque el endpoint espera "tracks"
          tracks: tracks.map((t) => t.uri).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "create-failed");

      const webUrl =
        data.webUrl ||
        data.url ||
        data.open_url ||
        data.external_url ||
        (data.id ? `https://open.spotify.com/playlist/${data.id}` : "");
      const appUrl = data.appUrl;

      // Intenta abrir la app; si no, abre web
      if (appUrl) {
        setTimeout(() => {
          if (webUrl) window.open(webUrl, "_blank");
        }, 800);
        window.location.href = appUrl;
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

  // Ejemplos rápidos (justo DEBAJO del prompt)
  const examples = [
    { label: "Gym sin voces (80)", prompt: "Música electrónica para entrenar sin voces, 120–140 bpm", count: 80 },
    { label: "Festival genérico 2025 (100)", prompt: "Cartel del Festival Delta 2025: artistas del lineup 2025, hits representativos", count: 100 },
    { label: "Focus lo-fi (60)", prompt: "Lo-fi hip hop sin voces para concentrarme", count: 60 },
    { label: "Hardstyle / Nightcore (70)", prompt: "Hardstyle y nightcore cañero para cardio", count: 70 },
  ];
  function setExample(e) {
    setPrompt(e.prompt);
    setCount(e.count);
  }

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px" }}>
      {/* Header + sesión */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Playlist AI — MVP</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAuthed ? (
            <>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Conectado: {session?.user?.name || "usuario"}
              </span>
              <button
                onClick={() => signOut()}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("spotify")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Iniciar sesión con Spotify
            </button>
          )}
        </div>
      </div>

      {/* Prompt */}
      <p style={{ opacity: 0.8, marginBottom: 8 }}>
        Escribe un prompt (ej.: “hardstyle nightcore”, “festival 2025”, “para entrenar sin voces, 120-140 bpm”).  
        Elige el número de canciones con el control de abajo.
      </p>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr",
          marginBottom: 12,
        }}
      >
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

        {/* Ejemplos bajo el prompt */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Ejemplos:</span>
          {examples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => setExample(ex)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: "#fafafa",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {ex.label}
            </button>
          ))}
          {/* Botón de consejos (abre modal) */}
          <button
            onClick={openHelp}
            title="Consejos para tu prompt"
            style={{
              marginLeft: "auto",
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            💡 Consejos
          </button>
        </div>

        {/* Fila: nº canciones + generar */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
            disabled={loading || !isAuthed}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: loading || !isAuthed ? "#f5f5f5" : "#111",
              color: loading || !isAuthed ? "#111" : "#fff",
              cursor: loading || !isAuthed ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "Generando…" : "Generar lista"}
          </button>
        </div>

        {/* Barra de progreso */}
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

      {/* Opciones de creación */}
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
              minWidth: 220,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
            }}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Pública
          </label>
          <button
            onClick={handleCreate}
            disabled={!tracks.length || creating || !isAuthed}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: !tracks.length || creating || !isAuthed ? "#f5f5f5" : "#111",
              color: !tracks.length || creating || !isAuthed ? "#111" : "#fff",
              cursor: !tracks.length || creating || !isAuthed ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {creating ? "Creando…" : "Crear en mi Spotify"}
          </button>
        </div>
      </div>

      {/* Resultados */}
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
                    <span style={{ opacity: 0.8 }}>
                      — {(t.artists || []).join?.(", ") || t.artists}
                    </span>
                  </div>
                  <a
                    href={t.open_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12 }}
                  >
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

      {/* --------- MODAL de Consejos --------- */}
      {showHelp ? (
        <div
          onClick={closeHelp}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 640,
              width: "100%",
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Consejos para tu prompt
              </h3>
              <button
                onClick={closeHelp}
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>
              <ul style={{ margin: "0 0 0 18px" }}>
                <li>
                  Incluye <strong>mood/uso</strong>: <em>“para entrenar sin voces”</em>, <em>“para estudiar”</em>, <em>“fiesta relajada”</em>.
                </li>
                <li>
                  Si quieres eventos: pon <strong>nombre del evento + año</strong>, p. ej. <em>“Festival Delta 2025”</em>.
                </li>
                <li>
                  Añade <strong>géneros/bpm/épocas</strong> si te importa: <em>“hardstyle y nightcore 130–160 bpm”</em>, <em>“pop 2010–2015”</em>.
                </li>
                <li>
                  Puedes indicar <strong>artistas o canciones concretas</strong>:
                  <br/>– para que <strong>aparezcan</strong> seguro (p. ej. “incluye 2 de [Artista X] y [Canción Y]”)
                  <br/>– o para marcar <strong>el estilo/vibe</strong> general de la lista.
                </li>
              </ul>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Ejemplos rápidos:</div>
                <ul style={{ margin: "0 0 0 18px" }}>
                  <li><em>“Lo-fi hip hop sin voces para estudiar”</em></li>
                  <li><em>“Cartel de un festival 2025: artistas del lineup y sus hits representativos”</em></li>
                  <li><em>“Techno melódico 120–128 bpm para correr”</em></li>
                </ul>
                <p style={{ marginTop: 8, opacity: 0.8 }}>
                  El <strong>número de canciones</strong> elígelo con el control de “Nº canciones”.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
