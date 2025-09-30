"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
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

  // -------- Helpers de progreso (barra animada mientras hay trabajo) --------
  function startProgress(label = "🤖 IA pensando… puede tardar unos segundos") {
    setStatus(label);
    setProgress(0);
    if (progTimer.current) clearInterval(progTimer.current);
    progTimer.current = setInterval(() => {
      setProgress((p) => {
        const cap = 90; // hasta 90% mientras esperamos
        if (p < cap) {
          // sube rápido al principio y más lento luego
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

  // ---------------------- Generar (plan + recs) ----------------------
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
      // pequeño delay para que se note la fase final
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
    setCreating(true);
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playlistName || safeDefaultName(prompt),
          description: `Generada con IA (demo) — by JeyLabbb · ${prompt}`,
          public: !!isPublic,
          uris: tracks.map((t) => t.uri).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "create-failed");

      // Abre Spotify con la playlist creada
      const url =
        data.url ||
        data.open_url ||
        data.external_url ||
        (data.id ? `https://open.spotify.com/playlist/${data.id}` : "");
      if (url) window.open(url, "_blank");

      // Feedback al usuario
      alert("✅ Playlist creada en tu Spotify");
    } catch (e) {
      console.error(e);
      alert(
        "⚠️ No se pudo crear en tu Spotify. Inicia sesión de nuevo y reintenta."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Playlist AI — MVP
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Escribe un prompt (ej.: “hardstyle nightcore 80 canciones”, “festival
        Riverland 2025”, “para entrenar sin voces, 120-140 bpm”).
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
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              {status}
            </div>
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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ minWidth: 140, fontSize: 14 }}>
            Nombre de playlist:
          </label>
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
                      — {(t.artists || []).join(", ")}
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
            No hay resultados todavía. Genera una playlist para ver las
            canciones aquí.
          </p>
        )}
      </div>
    </div>
  );
}
