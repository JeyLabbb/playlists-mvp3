"use client";
import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  const doRecommend = async () => {
    setMsg(""); setLoading(true); setTracks([]);
    try {
      const r = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, limit: 25 }),
      });
      const data = await r.json();
      if (!r.ok) throw data;
      setTracks(data.tracks || []);
      setMsg(`OK: ${data.tracks?.length || 0} temas`);
    } catch (e) {
      setMsg("Error al generar recomendaciones");
    } finally {
      setLoading(false);
    }
  };

  const doCreate = async () => {
    if (!tracks.length) { setMsg("No hay canciones"); return; }
    setCreating(true); setMsg("");
    try {
      const name = prompt?.trim() ? prompt.trim().slice(0, 90) : "Playlist IA";
      const uris = tracks.map(t => t.uri);
      const r = await fetch("/api/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: `Generada: ${prompt || ""}`, uris, isPublic: false }),
      });
      const data = await r.json();
      if (!r.ok) throw data;
      setMsg(`Playlist creada ✅ ${data.url ? "→ " + data.url : ""}`);
    } catch (e) {
      setMsg("Error al crear la playlist");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Playlist IA (MVP)</h1>
      <p>Escribe lo que te apetece y probamos:</p>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Ej: Fiesta bailable en español, 2000s–actualidad, energía alta"
        rows={4}
        style={{ width: "100%", padding: 12 }}
      />
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button onClick={doRecommend} disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Generando..." : "Generar lista"}
        </button>
        <button onClick={doCreate} disabled={creating || tracks.length === 0} style={{ padding: "8px 12px" }}>
          {creating ? "Creando..." : "Crear en mi Spotify"}
        </button>
      </div>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
      <ul style={{ marginTop: 16 }}>
        {tracks.map(t => (
          <li key={t.id}>
            {t.name} — {t.artists}
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 16 }}>
        Si no te deja, inicia sesión arriba (o recarga). Necesita permisos de Spotify.
      </p>
    </main>
  );
}
