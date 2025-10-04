"use client";

import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';

export default function TrendingPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    fetchTrendingPlaylists();
  }, [sortBy]);

  const fetchTrendingPlaylists = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trending?sortBy=${sortBy}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setPlaylists(data.playlists);
      } else {
        console.error('Error fetching trending playlists:', data.error);
      }
    } catch (error) {
      console.error('Error fetching trending playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackClick = async (playlistId, spotifyUrl) => {
    try {
      // Track click in our new metrics system
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, type: 'click' })
      });
      
      // Open Spotify link
      window.open(spotifyUrl, '_blank');
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still open the link even if tracking fails
      window.open(spotifyUrl, '_blank');
    }
  };

  const trackView = async (playlistId) => {
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, type: 'view' })
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // Anonymize prompt text
  const anonymizePrompt = (prompt) => {
    // Remove personal info, keep general structure
    return prompt
      .replace(/\b\w+@\w+\.\w+\b/g, '***') // emails
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '***') // names
      .substring(0, 100) + (prompt.length > 100 ? '...' : '');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation />
      
      {/* Header */}
      <div className="pt-20 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Trending Playlists 🔥
            </h1>
            <p className="text-gray-300 text-lg">
              Descubre las playlists más populares creadas por otros usuarios
            </p>
          </div>

          {/* Sort Options */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                sortBy === 'recent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              📅 Más Recientes
            </button>
            <button
              onClick={() => setSortBy('views')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                sortBy === 'views'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              👀 Más Vistas
            </button>
            <button
              onClick={() => setSortBy('clicks')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                sortBy === 'clicks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🔗 Más Clics
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Cargando playlists trending...</p>
              </div>
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-2xl font-bold text-gray-400 mb-2">No hay playlists aún</h3>
              <p className="text-gray-500">
                Sé el primero en generar una playlist y aparecerá aquí
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800/70"
                  onMouseEnter={() => trackView(playlist.playlistId)}
                >
                  <div className="flex items-start gap-4">
                    {/* Album Art Placeholder */}
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-2xl">🎵</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-white mb-2 truncate">
                            {playlist.playlistName}
                          </h3>
                          
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                            "{anonymizePrompt(playlist.prompt)}"
                          </p>
                          
                          <div className="space-y-3">
                            {/* Author Info */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {playlist.author?.image ? (
                                  <img 
                                    src={playlist.author.image} 
                                    alt={playlist.author.displayName} 
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm">👤</span>
                                  </div>
                                )}
                                <div>
                                  <span 
                                    className="text-blue-400 hover:text-blue-300 font-medium text-sm cursor-pointer transition-colors"
                                    onClick={() => window.location.href = `/u/${playlist.author?.username || 'unknown'}`}
                                    title="Ver perfil del autor"
                                  >
                                    @{playlist.author?.username || 'unknown'}
                                  </span>
                                  <div className="text-xs text-gray-500">
                                    {playlist.author?.displayName || 'Usuario'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{playlist.trackCount} canciones</span>
                              <span>👀 {playlist.views || 0}</span>
                              <span>🔗 {playlist.clicks || 0}</span>
                              <span>
                                {new Date(playlist.createdAt).toLocaleDateString('es-ES', {
                                  year: '2-digit',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Spotify Button */}
                        {playlist.spotifyUrl && (
                          <button
                            onClick={() => trackClick(playlist.playlistId, playlist.spotifyUrl)}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 whitespace-nowrap"
                          >
                            <span className="text-xl">🎧</span>
                            <span>Abrir en Spotify</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t border-gray-700">
            <p className="text-gray-500 text-sm">
              Playlists generadas con IA y creadas por usuarios de JeyLabbb
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Haz clic en el nombre del autor para ver sus otras creaciones
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
