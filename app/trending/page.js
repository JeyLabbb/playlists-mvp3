"use client";

import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';

export default function TrendingPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [previewPlaylist, setPreviewPlaylist] = useState(null);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Helper function to update metrics in localStorage
  const updateMetricsInLocalStorage = async (playlistId, type) => {
    try {
      const localStorageKey = `jey_playlist_metrics:${playlistId}`;
      const currentMetrics = JSON.parse(localStorage.getItem(localStorageKey) || '{"views": 0, "clicks": 0}');
      
      if (type === 'view') {
        // Only increment views if this is the first time viewing in this session
        if (markAsViewedInSession(playlistId)) {
          currentMetrics.views = (currentMetrics.views || 0) + 1;
          console.log(`New view tracked for playlist ${playlistId}`);
        } else {
          console.log(`View already tracked for playlist ${playlistId} in this session`);
          return; // Don't update metrics if already viewed
        }
      } else if (type === 'click') {
        currentMetrics.clicks = (currentMetrics.clicks || 0) + 1;
      }
      
      localStorage.setItem(localStorageKey, JSON.stringify(currentMetrics));
      console.log(`Updated ${type} metrics in localStorage for playlist ${playlistId}`);
      
      // Also update the local state to reflect the change immediately
      setPlaylists(prevPlaylists => 
        prevPlaylists.map(playlist => 
          playlist.playlistId === playlistId 
            ? { 
                ...playlist, 
                views: currentMetrics.views,
                clicks: currentMetrics.clicks
              }
            : playlist
        )
      );
    } catch (error) {
      console.error('Error updating metrics in localStorage:', error);
    }
  };

  // Check if user has already viewed this playlist in this session
  const hasViewedInSession = (playlistId) => {
    const viewedKey = `jey_trending_views_session`;
    const viewedPlaylists = JSON.parse(localStorage.getItem(viewedKey) || '[]');
    return viewedPlaylists.includes(playlistId);
  };

  // Mark playlist as viewed in this session
  const markAsViewedInSession = (playlistId) => {
    const viewedKey = `jey_trending_views_session`;
    const viewedPlaylists = JSON.parse(localStorage.getItem(viewedKey) || '[]');
    if (!viewedPlaylists.includes(playlistId)) {
      viewedPlaylists.push(playlistId);
      localStorage.setItem(viewedKey, JSON.stringify(viewedPlaylists));
      return true; // New view
    }
    return false; // Already viewed
  };

  // Load playlist preview (tracks) and track click
  const loadPlaylistPreview = async (playlist) => {
    try {
      console.log('Loading preview for playground:', playlist.playlistId);
      setLoadingPreview(true);
      setPreviewPlaylist(playlist);
      
      // Track preview click
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: playlist.playlistId, type: 'click' })
      });
      
      const metricsResult = await response.json();
      
      // If fallback to localStorage, handle client-side
      if (metricsResult.reason === 'fallback-localStorage') {
        console.log('Handling preview click tracking in localStorage');
        await updateMetricsInLocalStorage(playlist.playlistId, 'click');
      }
      
      // Load playlist tracks
      console.log('Fetching tracks for playground:', playlist.playlistId);
      const tracksResponse = await fetch(`/api/spotify/playlist-tracks?id=${playlist.playlistId}`);
      const tracksData = await tracksResponse.json();
      
      console.log('Tracks response:', tracksData);
      
      if (tracksData.success && tracksData.tracks) {
        setPreviewTracks(tracksData.tracks);
        console.log('Successfully loaded', tracksData.tracks.length, 'tracks');
        console.log('Sample track structure:', tracksData.tracks[0]);
      } else {
        console.error('Failed to load playlist tracks:', tracksData.error);
        setPreviewTracks([]);
      }
    } catch (error) {
      console.error('Error loading playlist preview:', error);
      setPreviewTracks([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const trackClick = async (playlistId, spotifyUrl) => {
    try {
      // Track click in our new metrics system
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, type: 'click' })
      });
      
      const result = await response.json();
      
      // If fallback to localStorage, handle client-side
      if (result.reason === 'fallback-localStorage') {
        console.log('Handling click tracking in localStorage');
        await updateMetricsInLocalStorage(playlistId, 'click');
      }
      
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
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, type: 'view' })
      });
      
      const result = await response.json();
      
      // If fallback to localStorage, handle client-side
      if (result.reason === 'fallback-localStorage') {
        console.log('Handling view tracking in localStorage');
        await updateMetricsInLocalStorage(playlistId, 'view');
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  useEffect(() => {
    fetchTrendingPlaylists();
  }, [sortBy]);

  // Auto-track views when playlists are loaded
  useEffect(() => {
    if (playlists.length > 0) {
      // Track view for each visible playlist (first 5 to avoid overwhelming)
      playlists.slice(0, 5).forEach(async (playlist) => {
        await trackView(playlist.playlistId);
      });
    }
  }, [playlists]);

  const fetchTrendingPlaylists = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trending?sortBy=${sortBy}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        if (data.fallback) {
          // KV not available, try to get playlists from localStorage
          console.log('KV not available, trying localStorage fallback');
          const localStoragePlaylists = await getPlaylistsFromLocalStorage();
          setPlaylists(localStoragePlaylists);
        } else {
          setPlaylists(data.playlists);
        }
      } else {
        console.error('Error fetching trending playlists:', data.error);
      }
    } catch (error) {
      console.error('Error fetching trending playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlaylistsFromLocalStorage = async () => {
    try {
      // Get all localStorage keys that start with 'jey_user_playlists:'
      const allKeys = Object.keys(localStorage);
      const playlistKeys = allKeys.filter(key => key.startsWith('jey_user_playlists:'));
      
      const allPlaylists = [];
      
      for (const key of playlistKeys) {
        try {
          const userPlaylists = JSON.parse(localStorage.getItem(key) || '[]');
          allPlaylists.push(...userPlaylists);
        } catch (error) {
          console.warn('Error parsing localStorage playlist:', key, error);
        }
      }
      
      // Filter only public playlists and add author info
      const publicPlaylists = allPlaylists
        .filter(playlist => playlist.public === true)
        .map(playlist => {
          // Load additional metrics from localStorage for this playlist
          const metricsKey = `jey_playlist_metrics:${playlist.playlistId}`;
          const additionalMetrics = JSON.parse(localStorage.getItem(metricsKey) || '{"views": 0, "clicks": 0}');
          
          return {
            id: playlist.playlistId,
            prompt: playlist.prompt || 'Playlist creada',
            playlistName: playlist.name,
            playlistId: playlist.playlistId,
            spotifyUrl: playlist.url,
            trackCount: playlist.tracks || 0,
            views: (playlist.views || 0) + (additionalMetrics.views || 0),
            clicks: (playlist.clicks || 0) + (additionalMetrics.clicks || 0),
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt || playlist.createdAt,
            author: {
              username: playlist.username || playlist.userEmail?.split('@')[0] || 'unknown',
              displayName: playlist.userName || playlist.userEmail?.split('@')[0] || 'Usuario',
              image: playlist.userImage || null
            }
          };
        });
      
      console.log(`[TRENDING] Found ${allPlaylists.length} total playlists from localStorage, ${publicPlaylists.length} public`);
      
      // Sort playlists
      let sortedPlaylists = [...publicPlaylists];
      
      switch (sortBy) {
        case 'views':
          sortedPlaylists.sort((a, b) => (b.views || 0) - (a.views || 0) || new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'clicks':
          sortedPlaylists.sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'recent':
        default:
          sortedPlaylists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
      }
      
      return sortedPlaylists.slice(0, 50);
      
    } catch (error) {
      console.error('Error getting playlists from localStorage:', error);
      return [];
    }
    };

  // Format large numbers with K/M abbreviations
  const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    
    return num.toString();
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
      
      {/* Header - Mobile optimized */}
      <div className="pt-16 sm:pt-20 pb-6 sm:pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Trending Playlists 🔥
            </h1>
            <p className="text-gray-300 text-base sm:text-lg px-2">
              Descubre las playlists más populares creadas por otros usuarios
            </p>
          </div>

          {/* Sort Options - Mobile optimized */}
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base ${
                sortBy === 'recent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              📅 <span className="hidden sm:inline">Más </span>Recientes
            </button>
            <button
              onClick={() => setSortBy('views')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base ${
                sortBy === 'views'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              👀 <span className="hidden sm:inline">Más </span>Vistas
            </button>
            <button
              onClick={() => setSortBy('clicks')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base ${
                sortBy === 'clicks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🔗 <span className="hidden sm:inline">Más </span>Clics
            </button>
          </div>
        </div>
      </div>

      {/* Content - Mobile optimized */}
      <div className="px-4 sm:px-6 pb-8 sm:pb-12">
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
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 sm:p-6 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800/70"
                  onMouseEnter={() => trackView(playlist.playlistId)}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Album Art Placeholder */}
                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl sm:text-2xl">🎵</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 truncate">
                            {playlist.playlistName}
                          </h3>
                          
                          <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                            &ldquo;{anonymizePrompt(playlist.prompt)}&rdquo;
                          </p>
                          
                          <div className="space-y-2 sm:space-y-3">
                            {/* Author Info */}
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="flex items-center gap-2">
                                {playlist.author?.image ? (
                                  <img 
                                    src={playlist.author.image} 
                                    alt={playlist.author.displayName} 
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs sm:text-sm">👤</span>
                                  </div>
                                )}
                                <div>
                                  <span 
                                    className="text-blue-400 hover:text-blue-300 font-medium text-xs sm:text-sm cursor-pointer transition-colors"
                                    onClick={() => window.location.href = `/u/${playlist.author?.username || 'unknown'}`}
                                    title="Ver perfil del autor"
                                  >
                                    @{playlist.author?.username || 'unknown'}
                                  </span>
                                  <div className="text-xs text-gray-500 sm:block hidden">
                                    {playlist.author?.displayName || 'Usuario'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                              <span>{playlist.trackCount} canciones</span>
                              <span className="hidden sm:inline">👀</span>
                              <span>{formatNumber(playlist.views || 0)}</span>
                              <span className="hidden sm:inline">🔗</span>
                              <span>{formatNumber(playlist.clicks || 0)}</span>
                              <span className="hidden sm:inline">
                                {new Date(playlist.createdAt).toLocaleDateString('es-ES', {
                                  year: '2-digit',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                          {/* Preview Button */}
                          <button
                            onClick={() => loadPlaylistPreview(playlist)}
                            disabled={loadingPreview}
                            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors duration-200 whitespace-nowrap text-sm sm:text-base"
                          >
                            <span className="text-xl">{loadingPreview ? '⏳' : '👁️'}</span>
                            <span>{loadingPreview ? 'Cargando...' : 'Ver Preview'}</span>
                          </button>
                          
                          {/* Spotify Button */}
                          {playlist.spotifyUrl && (
                            <button
                              onClick={() => trackClick(playlist.playlistId, playlist.spotifyUrl)}
                              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors duration-200 whitespace-nowrap text-sm sm:text-base"
                            >
                              <span className="text-xl">🎧</span>
                              <span>Abrir en Spotify</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview Modal */}
          {previewPlaylist && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {previewPlaylist.playlistName}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {previewTracks.length} canciones • Creado por @{previewPlaylist.author?.username || 'unknown'}
                      {previewTracks.length > 15 && (
                        <span className="block mt-1 text-xs text-gray-500">
                          Mostrando 15 canciones aleatorias
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPreviewPlaylist(null);
                      setPreviewTracks([]);
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Content */}
                <div className="overflow-y-auto flex-1 min-h-0">
                  {loadingPreview ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Cargando canciones...</p>
                      </div>
                    </div>
                  ) : previewTracks.length > 0 ? (
                    <div className="p-4">
                      <div className="space-y-1">
                        {(() => {
                          // Shuffle tracks and take up to 15 random ones
                          const shuffledTracks = [...previewTracks].sort(() => Math.random() - 0.5);
                          const randomTracks = shuffledTracks.slice(0, 15);
                          
                          return randomTracks.map((track, index) => (
                          <div key={`track-${previewPlaylist.playlistId}-${index}-${track.id}`} className="flex items-center gap-3 py-1.5 border-b border-gray-800 last:border-b-0">
                            <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <span className="text-white text-sm">🎵</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{track.name}</p>
                              <p className="text-gray-400 text-sm truncate">
                                {track.artists?.join(', ') || track.artistNames?.join(', ') || 'Artista desconocido'}
                              </p>
                            </div>
                          </div>
                          ));
                        })()}
                        {previewTracks.length > 15 && (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-sm">
                              ... y {previewTracks.length - 15} canciones más
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-400">No se pudieron cargar las canciones</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-700">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-400">
                      {previewPlaylist.trackCount} canciones • {formatNumber(previewPlaylist.views || 0)} vistas • {formatNumber(previewPlaylist.clicks || 0)} clicks
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setPreviewPlaylist(null);
                          setPreviewTracks([]);
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Cerrar
                      </button>
                      {previewPlaylist.spotifyUrl && (
                        <button
                          onClick={() => {
                            trackClick(previewPlaylist.playlistId, previewPlaylist.spotifyUrl);
                            setPreviewPlaylist(null);
                            setPreviewTracks([]);
                          }}
                          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                        >
                          <span className="text-xl">🎧</span>
                          <span>Abrir en Spotify</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
