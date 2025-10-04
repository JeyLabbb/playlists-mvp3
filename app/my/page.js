"use client";

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Navigation from '../components/Navigation';

export default function MyPlaylistsPage() {
  const { data: session, status } = useSession();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewPlaylist, setPreviewPlaylist] = useState(null);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserPlaylists();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [session, status]);

  const fetchUserPlaylists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/userplaylists');
      const data = await response.json();
      
      if (data.success) {
        if (data.fallback) {
          // Load from localStorage
          const localKey = `jey_user_playlists:${session.user.email}`;
          const localPlaylists = JSON.parse(localStorage.getItem(localKey) || '[]');
          setPlaylists(localPlaylists);
        } else {
          setPlaylists(data.playlists || []);
        }
      } else {
        setError(data.error || 'Failed to load playlists');
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };


  const loadPlaylistDetails = async (playlist) => {
    try {
      setLoadingPreview(true);
      setPreviewPlaylist(playlist);
      
      // Extract playlist ID from URL
      const playlistIdMatch = playlist.url.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!playlistIdMatch) {
        console.error('Could not extract playlist ID from URL:', playlist.url);
        return;
      }
      
      const playlistId = playlistIdMatch[1];
      
      // Fetch playlist tracks
      const response = await fetch(`/api/spotify/playlist-tracks?id=${playlistId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewTracks(data.tracks || []);
      } else {
        console.error('Failed to load playlist tracks:', response.status);
        setPreviewTracks([]);
      }
    } catch (error) {
      console.error('Error loading playlist details:', error);
      setPreviewTracks([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`;
    return date.toLocaleDateString('es-ES');
  };

  // Not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navigation />
        
        <div className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Mis Playlists
              </h1>
              <p className="text-gray-300 text-lg">
                Inicia sesión para ver todas tus playlists creadas
              </p>
            </div>
            
            <button
              onClick={() => signIn('spotify')}
              className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">🎵</span>
              <span>Conectar con Spotify</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navigation />
        
        <div className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Cargando tus playlists...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navigation />
        
        <div className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
              <p className="text-gray-300">{error}</p>
            </div>
            
            <button
              onClick={fetchUserPlaylists}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (playlists.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navigation />
        
        <div className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Mis Playlists
              </h1>
              <p className="text-gray-300 text-lg mb-2">
                Aún no has creado ninguna playlist con la app
              </p>
              <p className="text-gray-400">
                Crea tu primera playlist 👉
              </p>
            </div>
            
            <a
              href="/"
              className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">🎵</span>
              <span>Crear Playlist</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Playlists list
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation />
      
      {/* Header */}
      <div className="pt-20 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Mis Playlists
            </h1>
            <p className="text-gray-300 text-lg">
              {playlists.length} playlist{playlists.length !== 1 ? 's' : ''} creada{playlists.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <div
                key={playlist.playlistId}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800/70 group"
              >
                <div className="flex items-start gap-4 mb-4">
                  {/* Album Art Placeholder */}
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-2xl">🎵</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-green-400 transition-colors">
                      {playlist.name}
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      "{playlist.prompt}"
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{playlist.tracks} canciones</span>
                      <span>•</span>
                      <span>{formatDate(playlist.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => loadPlaylistDetails(playlist)}
                    disabled={loadingPreview}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <span>👁️</span>
                    <span>{loadingPreview ? 'Cargando...' : 'Ver detalles'}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      try {
                        if (playlist.url) {
                          window.open(playlist.url, '_blank');
                        } else {
                          console.error('No URL available for playlist:', playlist);
                        }
                      } catch (error) {
                        console.error('Error opening playlist:', error);
                      }
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors duration-200 text-sm flex items-center justify-center"
                    title="Abrir en Spotify"
                  >
                    🎧
                  </button>
                  
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewPlaylist && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 p-6 border-b border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {previewPlaylist.name}
                  </h2>
                  <p className="text-gray-300 text-base mb-2">
                    "{previewPlaylist.prompt}"
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{previewPlaylist.tracks} canciones</span>
                    <span>•</span>
                    <span>{formatDate(previewPlaylist.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewPlaylist(null)}
                  className="text-gray-400 hover:text-white transition-colors text-2xl p-2 hover:bg-gray-800 rounded-full ml-4"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando canciones...</p>
                  </div>
                </div>
              ) : previewTracks.length > 0 ? (
                <div className="space-y-3">
                  {previewTracks.map((track, index) => (
                    <div key={`track-${previewPlaylist.playlistId}-${index}-${track.id}`} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <span className="text-gray-400 text-sm w-6">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{track.name}</div>
                        <div className="text-gray-400 text-sm truncate">
                          {Array.isArray(track.artists) ? track.artists.join(', ') : track.artists || 'Unknown Artist'}
                        </div>
                      </div>
                      <a
                        href={track.open_url || `https://open.spotify.com/track/${track.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded transition-colors"
                      >
                        Abrir
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">⚠️</div>
                  <p className="text-gray-400">No se pudieron cargar las canciones de esta playlist</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-800/30 flex justify-end">
              <button
                onClick={() => window.open(previewPlaylist.url, '_blank')}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Abrir en Spotify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
