'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState('');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function generar() {
    setError('');
    setTracks([]);
    setLoading(true);
    try {
      const r = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, limit: 20 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.error?.message || 'Error al recomendar');
      setTracks(data.tracks || []);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function crearEnSpotify() {
    setError('');
    setCreating(true);
    try {
      const uris = tracks.map(t => t.uri);
      const r = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: (prompt || 'Playlist IA').slice(0, 60),
          uris,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Error al crear playlist');
      window.open(data.url, '_blank');
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setCreating(false);
    }
  }

  const logged = !!session;

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Playlist IA (MVP)</h1>
        <div>
          {logged ? (
            <div className="flex items-center gap-3">
              <span className="text-sm">Conectado: {session.user?.name || 'Usuario Spotify'}</span>
              <button onClick={() => signOut()} className="border px-3 py-1 rounded">Cerrar sesión</button>
            </div>
          ) : (
            <button onClick={() => signIn('spotify')} className="border px-3 py-1 rounded">
              Iniciar sesión con Spotify
            </button>
          )}
        </div>
      </header>

      <p className="text-sm text-gray-500">Escribe lo que te apetece y probamos:</p>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Ej: Fiesta bailable en español, 2000s–actualidad, energía alta"
        className="w-full h-28 border rounded p-3"
      />

      <div className="flex gap-3">
        <button onClick={generar} disabled={loading || !prompt} className="border px-3 py-1 rounded">
          {loading ? 'Generando…' : 'Generar lista'}
        </button>
        <button
          onClick={crearEnSpotify}
          disabled={!logged || tracks.length === 0 || creating}
          className="border px-3 py-1 rounded"
          title={!logged ? 'Inicia sesión para crear la playlist' : ''}
        >
          {creating ? 'Creando…' : 'Crear en mi Spotify'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">⚠️ {error}</p>}

      <ul className="divide-y">
        {tracks.map(t => (
          <li key={t.id} className="py-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-gray-500">{t.artists}</div>
            </div>
            <div className="shrink-0 flex gap-2">
              {t.preview_url && (
                <audio controls src={t.preview_url} className="h-8" />
              )}
              <a href={t.external_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline">
                Abrir
              </a>
            </div>
          </li>
        ))}
      </ul>

      {!logged && <p className="text-sm text-gray-500">Si no te deja, inicia sesión arriba (o recarga). Necesita permisos de Spotify.</p>}
    </main>
  );
}
