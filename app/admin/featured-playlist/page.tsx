'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

type Playlist = {
  id: string;
  playlist_name: string;
  prompt: string;
  spotify_id: string;
  spotify_url: string;
  user_email: string;
  user_id: string | null;
  owner_display_name: string;
  track_count: number;
  created_at: string;
};

type FeaturedPlaylist = {
  id: string;
  is_active: boolean;
  playlist_name: string;
  display_name?: string | null;
  owner_display_name: string;
  spotify_playlist_url: string;
  featured_at: string;
};

export default function FeaturedPlaylistAdmin() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [featured, setFeatured] = useState<FeaturedPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar playlists disponibles
      const playlistsRes = await fetch('/api/admin/featured-playlist/list');
      const playlistsData = await playlistsRes.json();
      if (playlistsData.success) {
        setPlaylists(playlistsData.playlists || []);
      }

      // Cargar playlist destacada actual
      const featuredRes = await fetch('/api/featured-playlist');
      const featuredData = await featuredRes.json();
      if (featuredData.success && featuredData.featured) {
        setFeatured(featuredData.featured);
        setDisplayName(featuredData.featured.display_name || featuredData.featured.playlist_name);
      }
    } catch (error) {
      console.error('[FEATURED_ADMIN] Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (spotifyId: string) => {
    setSelecting(spotifyId);
    try {
      const res = await fetch('/api/admin/featured-playlist/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotify_playlist_id: spotifyId }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Playlist destacada seleccionada');
        await loadData();
      } else {
        toast.error(data.error || 'Error al seleccionar playlist');
      }
    } catch (error) {
      console.error('[FEATURED_ADMIN] Error selecting:', error);
      toast.error('Error al seleccionar playlist');
    } finally {
      setSelecting(null);
    }
  };

  const handleClear = async () => {
    if (!confirm('¿Seguro que quieres quitar la playlist destacada?')) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/admin/featured-playlist/clear', {
        method: 'POST',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Playlist destacada eliminada');
        setFeatured(null);
      } else {
        toast.error(data.error || 'Error al quitar playlist');
      }
    } catch (error) {
      console.error('[FEATURED_ADMIN] Error clearing:', error);
      toast.error('Error al quitar playlist');
    } finally {
      setClearing(false);
    }
  };

  const handleSaveName = async () => {
    if (!featured) return;

    setSavingName(true);
    try {
      const res = await fetch('/api/admin/featured-playlist/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Nombre actualizado');
        setEditingName(false);
        await loadData();
      } else {
        toast.error(data.error || 'Error al actualizar nombre');
      }
    } catch (error) {
      console.error('[FEATURED_ADMIN] Error saving name:', error);
      toast.error('Error al actualizar nombre');
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    if (featured) {
      setDisplayName(featured.display_name || featured.playlist_name);
    }
    setEditingName(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Playlist Destacada</h1>
          <Link
            href="/admin/debug/db"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Volver al Panel Admin
          </Link>
        </div>

        {/* Playlist destacada actual */}
        {featured && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-green-400 mb-2">
                  ⭐ Destacada Actual
                </h2>
                {editingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
                      placeholder="Nombre personalizado..."
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                    >
                      {savingName ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={savingName}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-lg text-white">
                      {featured.display_name || featured.playlist_name}
                    </p>
                    <button
                      onClick={() => setEditingName(true)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                      title="Editar nombre"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <p className="text-sm text-gray-400">
                  Nombre original: {featured.playlist_name}
                </p>
                <p className="text-sm text-gray-400">
                  Por {featured.owner_display_name} • {new Date(featured.featured_at).toLocaleDateString('es-ES')}
                </p>
              </div>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium disabled:opacity-50 ml-4"
              >
                {clearing ? 'Quitando...' : 'Quitar destacada'}
              </button>
            </div>
            <a
              href={featured.spotify_playlist_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 text-sm"
            >
              Abrir en Spotify →
            </a>
          </div>
        )}

        {/* Lista de playlists disponibles */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Playlists Disponibles</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No hay playlists disponibles</div>
          ) : (
            <div className="space-y-4">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">{playlist.playlist_name}</h3>
                    <p className="text-sm text-gray-400 mb-1">{playlist.prompt}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Por: {playlist.owner_display_name}</span>
                      <span>•</span>
                      <span>{playlist.track_count} canciones</span>
                      <span>•</span>
                      <span>{new Date(playlist.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={playlist.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                    >
                      Ver
                    </a>
                    <button
                      onClick={() => handleSelect(playlist.spotify_id)}
                      disabled={selecting === playlist.spotify_id || featured?.id === playlist.id}
                      className="px-4 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-medium disabled:opacity-50"
                    >
                      {selecting === playlist.spotify_id
                        ? 'Seleccionando...'
                        : featured?.id === playlist.id
                        ? 'Destacada'
                        : 'Seleccionar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

