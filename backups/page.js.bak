"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  const [promptText, setPromptText] = useState("");
  const [tracks, setTracks] = useState([]); // {name, artists, uri, open_url}
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastLinks, setLastLinks] = useState(null);
  const [count, setCount] = useState(50); // nº de canciones

  async function generarLista() {
    setMsg("");
    setTracks([]);
    setLoading(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, limit: count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "recommend-failed");

      setTracks(data.tracks || []);
      if (!data.tracks?.length) {
        setMsg("⚠️ No se encontraron canciones para ese prompt. Ajusta un poco y prueba de nuevo.");
      }
    } catch (e) {
      setMsg("⚠️ Error al recomendar. Inicia sesión y prueba otra vez.");
    } finally {
      setLoading(false);
    }
  }

  async function crearEnSpotify() {
    if (!tracks.length) {
      setMsg("⚠️ Genera una lista primero.");
      return;
    }
    setCreating(true);
    setMsg("");
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: promptText?.trim() || "Mi playlist",
          tracks: tracks.map((t) => t.uri),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "create-failed");

      setMsg("✅ Playlist creada. Abriendo Spotify…");
      setLastLinks({ web: data.webUrl, app: data.appUrl });

      // Intentamos abrir la app; si no, la web
      try {
        const fallback = setTimeout(() => window.open(data.webUrl, "_blank"), 800);
        window.location.href = data.appUrl;
        clearTimeout(fallback);
      } catch {
        window.open(data.webUrl, "_blank");
      }
    } catch {
      setMsg("⚠️ No se pudo crear la playlist. Vuelve a iniciar sesión y prueba otra vez.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Playlist IA (MVP)</h1>
        <div>
          {session ? (
            <div className="flex gap-3 items-center">
              <span className="text-sm text-gray-600">
                Conectado: {session.user?.name || "Usuario Spotify"}
              </span>
              <button className="border px-3 py-1 rounded" onClick={() => signOut()}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button className="border px-3 py-1 rounded" onClick={() => signIn("spotify")}>
              Iniciar sesión con Spotify
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2">Escribe lo que te apetece y probamos:</p>
        <textarea
          className="w-full p-3 border rounded"
          rows={4}
          placeholder="Ej: Fiesta bailable en español, 2000s–actualidad, energía alta"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm text-gray-700">Tamaño</label>
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) =>
              setCount(
                Math.max(1, Math.min(500, Number(e.target.value) || 50))
              )
            }
            className="w-24 p-2 border rounded"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          disabled={loading}
          className="border px-3 py-2 rounded"
          onClick={generarLista}
        >
          {loading ? "Generando…" : "Generar lista"}
        </button>
        <button
          disabled={creating || !tracks.length}
          className="border px-3 py-2 rounded"
          onClick={crearEnSpotify}
        >
          {creating ? "Creando…" : "Crear en mi Spotify"}
        </button>
      </div>

      {msg && (
        <p className="text-sm">
          {msg}{" "}
          {lastLinks?.web && (
            <a className="underline" href={lastLinks.web} target="_blank">
              Abrir en Spotify
            </a>
          )}
        </p>
      )}

      <div className="divide-y">
        {tracks.map((t, i) => (
          <div key={t.id || i} className="py-3 flex justify-between items-center">
            <div>
              <div>{t.name}</div>
              <div className="text-sm text-gray-600">{t.artists}</div>
            </div>
            <a className="text-sm underline" href={t.open_url} target="_blank">
              Abrir
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
