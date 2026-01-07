"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedList from '../components/AnimatedList';
import TracksPreview from '../components/TracksPreview';
// Username se usa tal cual de Supabase - sin normalizar

export default function TrendingPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [previewPlaylist, setPreviewPlaylist] = useState(null);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchTrendingPlaylists = useCallback(async () => {
    try {
      console.log('[TRENDING] Starting to fetch trending playlists...');
      setLoading(true);
      const response = await fetch(`/api/trending?sortBy=${sortBy}&limit=50`);
      console.log('[TRENDING] Response status:', response.status);
      const data = await response.json();
      console.log('[TRENDING] Response data:', data);
      
      if (data.success) {
        if (data.fallback) {
          // KV not available, try to get playlists from localStorage
          console.log('KV not available, trying localStorage fallback');
          const localStoragePlaylists = await getPlaylistsFromLocalStorage();
          setPlaylists(localStoragePlaylists);
          
          // If no playlists found in localStorage either, show a message
          if (localStoragePlaylists.length === 0) {
            console.log('No playlists found in localStorage either');
          }
        } else {
          console.log('[TRENDING] Setting playlists:', data.playlists.length);
          setPlaylists(data.playlists);
        }
      } else {
        console.error('Error fetching trending playlists:', data.error);
      }
    } catch (error) {
      console.error('Error fetching trending playlists:', error);
    } finally {
      console.log('[TRENDING] Setting loading to false');
      setLoading(false);
    }
  }, [sortBy]);

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
      
      // Check if this is an example playlist (starts with 37i9dQZF1DX)
      const isExamplePlaylist = playlist.playlistId.startsWith('37i9dQZF1DX');
      
      // Get owner email from playlist for access control
      const ownerEmail = playlist.ownerEmail || playlist.author?.email || null;
      
      // Usar exactamente el mismo endpoint que FeaturedPlaylistCard usa
      const res = await fetch(`/api/featured-playlist/tracks?playlist_id=${playlist.playlistId}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch tracks');
      }
      
      const tracksData = await res.json();
      
      console.log('[TRENDING] Tracks response:', tracksData);
      
      if (tracksData.success && tracksData.tracks && tracksData.tracks.length > 0) {
        // Formatear tracks para que incluyan artists como array (TracksPreview espera artists como array)
        const formattedTracks = tracksData.tracks.map((track) => {
          // Convertir artist (string) a artists (array)
          let artists = [];
          if (track.artist) {
            // Si artist es string, dividirlo por comas y crear array
            artists = track.artist.split(',').map(name => ({ name: name.trim() }));
          }
          
          return {
            name: track.name,
            artist: track.artist, // Mantener como fallback
            artists: artists,
            artistNames: track.artist || 'Artista desconocido',
            spotify_url: track.spotify_url,
            image: track.image,
          };
        });
        setPreviewTracks(formattedTracks);
        console.log('[TRENDING] Successfully loaded', formattedTracks.length, 'tracks');
      } else {
        // Si falla, mostrar mensaje (igual que FeaturedPlaylistCard)
        console.error('[TRENDING] Error loading tracks:', tracksData.error);
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
    // 🚨 CRITICAL: Open Spotify URL immediately, track in background
    if (spotifyUrl) {
      try {
        // Try to open in new tab first
        const opened = window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
        // If popup blocked, navigate directly
        if (!opened || opened.closed || typeof opened.closed === 'undefined') {
          window.location.href = spotifyUrl;
        }
      } catch (error) {
        // Fallback: navigate directly
        window.location.href = spotifyUrl;
      }
    }
    
    // Track click in background (non-blocking)
    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, type: 'click' })
      });
      
      const result = await response.json();
      
      // If fallback to localStorage, handle client-side
      if (result.reason === 'fallback-localStorage') {
        await updateMetricsInLocalStorage(playlistId, 'click');
      } else if (result.ok) {
        // Update local state with new click count
        setPlaylists(prevPlaylists => 
          prevPlaylists.map(playlist => 
            playlist.playlistId === playlistId 
              ? { 
                  ...playlist, 
                  clicks: (playlist.clicks || 0) + 1
                }
              : playlist
          )
        );
      }
    } catch (error) {
      console.error('Error tracking click:', error);
      // Fallback to localStorage
      await updateMetricsInLocalStorage(playlistId, 'click');
    }
  };

  const trackView = useCallback(async (playlistId) => {
    // Only track if not already viewed in this session
    if (hasViewedInSession(playlistId)) {
      return;
    }
    
    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, type: 'view' })
      });
      
      const result = await response.json();
      
      // If fallback to localStorage, handle client-side
      if (result.reason === 'fallback-localStorage') {
        if (markAsViewedInSession(playlistId)) {
          await updateMetricsInLocalStorage(playlistId, 'view');
        }
      } else if (result.ok) {
        // Mark as viewed and update local state
        markAsViewedInSession(playlistId);
        setPlaylists(prevPlaylists => 
          prevPlaylists.map(playlist => 
            playlist.playlistId === playlistId 
              ? { 
                  ...playlist, 
                  views: (playlist.views || 0) + 1
                }
              : playlist
          )
        );
      }
    } catch (error) {
      console.error('Error tracking view:', error);
      // Fallback to localStorage
      if (markAsViewedInSession(playlistId)) {
        await updateMetricsInLocalStorage(playlistId, 'view');
      }
    }
  }, []);

  useEffect(() => {
    fetchTrendingPlaylists();
  }, [sortBy, fetchTrendingPlaylists]);

  // Auto-track views when playlists are loaded
  useEffect(() => {
    if (playlists.length > 0) {
      // Track view for each visible playlist (first 5 to avoid overwhelming)
      playlists.slice(0, 5).forEach(async (playlist) => {
        await trackView(playlist.playlistId);
      });
    }
  }, [playlists, trackView]);


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
              username: (() => {
                const rawUsername = playlist.username || playlist.userEmail?.split('@')[0] || 'unknown';
                // Normalizar username (quitar sufijo -xxxxx)
                if (rawUsername.includes('-')) {
                  const parts = rawUsername.split('-');
                  const lastPart = parts[parts.length - 1];
                  // Si el último segmento es 6-8 caracteres alfanuméricos, es probablemente un sufijo generado
                  if (/^[a-z0-9]{6,8}$/i.test(lastPart) && parts.length > 1) {
                    return parts.slice(0, -1).join('-');
                  }
                }
                return rawUsername;
              })(),
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
      {/* Header - Mobile optimized */}
      <div className="pt-12 sm:pt-20 pb-4 sm:pb-8 px-6 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Trending Playlists 🔥
            </h1>
            <p className="text-gray-300 text-xs sm:text-lg px-4 hidden sm:block">
              Descubre las playlists más populares creadas por otros usuarios
            </p>
          </div>

          {/* Sort Options - Mobile optimized */}
          <div className="flex flex-col sm:flex-row justify-center gap-1 sm:gap-4 mb-4 sm:mb-8">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 text-xs sm:text-base ${
                sortBy === 'recent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              📅 <span className="hidden sm:inline">Más </span>Recientes
            </button>
            <button
              onClick={() => setSortBy('views')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 text-xs sm:text-base ${
                sortBy === 'views'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              👀 <span className="hidden sm:inline">Más </span>Vistas
            </button>
            <button
              onClick={() => setSortBy('clicks')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 text-xs sm:text-base ${
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
      <div className="px-6 sm:px-6 pb-6 sm:pb-12">
        <div className="max-w-4xl mx-auto">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando playlists trending...</p>
            <p className="text-gray-500 text-xs mt-2">Debug: loading={loading.toString()}, playlists={playlists.length}</p>
          </div>
        </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-2xl font-bold text-gray-400 mb-2">No hay playlists trending</h3>
              <p className="text-gray-500 mb-4">
                Las playlists trending requieren almacenamiento en servidor
              </p>
              <p className="text-gray-600 text-sm">
                Crea una playlist para verla aquí, o contacta al administrador para configurar el almacenamiento
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-6">
              {playlists.map((playlist, index) => (
                <div
                  key={playlist.id || playlist.playlistId || `playlist-${index}`}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 sm:p-6 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800/70"
                  onMouseEnter={() => trackView(playlist.playlistId)}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Album Art Placeholder */}
                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg sm:text-2xl">🎵</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2 truncate">
                            {playlist.playlistName}
                          </h3>
                          
                          <p className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-3 line-clamp-2">
                            &ldquo;{anonymizePrompt(playlist.prompt)}&rdquo;
                          </p>
                          
                          <div className="space-y-1 sm:space-y-3">
                            {/* Author Info */}
                            <div className="flex items-center gap-1 sm:gap-3">
                              <div className="flex items-center gap-1 sm:gap-2">
                                {playlist.author?.image ? (
                                  <img 
                                    src={playlist.author.image} 
                                    alt={playlist.author.displayName} 
                                    className="w-5 h-5 sm:w-8 sm:h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-5 h-5 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs sm:text-sm">👤</span>
                                  </div>
                                )}
                                <div>
                                  <span 
                                    className="text-blue-400 hover:text-blue-300 font-medium text-xs sm:text-sm cursor-pointer transition-colors"
                                    onClick={() => {
                                      if (playlist.author?.username) {
                                        router.push(`/u/${playlist.author.username}`);
                                      }
                                    }}
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
                            <div className="flex items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500">
                              <span>{playlist.trackCount} canciones</span>
                              <span className="flex items-center gap-1">
                                <span className="text-xs sm:text-sm">👀</span>
                                <span>{formatNumber(playlist.views || 0)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-xs sm:text-sm">🔗</span>
                                <span>{formatNumber(playlist.clicks || 0)}</span>
                              </span>
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
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-3">
                          {/* Preview Button */}
                          <button
                            onClick={() => loadPlaylistPreview(playlist)}
                            disabled={loadingPreview}
                            className="flex items-center justify-center gap-1 sm:gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors duration-200 whitespace-nowrap text-xs sm:text-base"
                          >
                            <span className="text-sm sm:text-xl">{loadingPreview ? '⏳' : '👁️'}</span>
                            <span className="hidden sm:inline">{loadingPreview ? 'Cargando...' : 'Ver Preview'}</span>
                            <span className="sm:hidden">Preview</span>
                          </button>
                          
                          {/* Spotify Button */}
                          {playlist.spotifyUrl && (
                            <button
                              onClick={() => trackClick(playlist.playlistId, playlist.spotifyUrl)}
                              className="flex items-center justify-center gap-1 sm:gap-2 bg-green-500 hover:bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors duration-200 whitespace-nowrap text-xs sm:text-base"
                            >
                              <span className="text-sm sm:text-xl">🎧</span>
                              <span className="hidden sm:inline">Abrir en Spotify</span>
                              <span className="sm:hidden">Spotify</span>
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
                      <TracksPreview
                        tracks={previewTracks}
                        totalTracks={previewPlaylist?.trackCount || previewTracks.length}
                        spotifyPlaylistUrl={previewPlaylist?.spotifyUrl}
                        loading={false}
                      />
                      {previewPlaylist && previewPlaylist.trackCount > previewTracks.length && (
                        <div className="text-center py-4 border-t border-gray-700 mt-4">
                          <p className="text-gray-400 text-sm mb-3">
                            Mostrando {previewTracks.length} de {previewPlaylist.trackCount} canciones
                          </p>
                          {previewPlaylist.spotifyUrl && (
                            <button
                              onClick={() => {
                                trackClick(previewPlaylist.playlistId, previewPlaylist.spotifyUrl);
                              }}
                              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 mx-auto"
                            >
                              <span className="text-xl">🎧</span>
                              <span>Abrir playlist completa en Spotify</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-400 mb-4">No se pudieron cargar las canciones</p>
                      {previewPlaylist?.spotifyUrl && (
                        <button
                          onClick={() => {
                            trackClick(previewPlaylist.playlistId, previewPlaylist.spotifyUrl);
                            setPreviewPlaylist(null);
                            setPreviewTracks([]);
                          }}
                          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 mx-auto"
                        >
                          <span className="text-xl">🎧</span>
                          <span>Abrir en Spotify</span>
                        </button>
                      )}
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
              Playlists generadas con IA • by MTRYX
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
