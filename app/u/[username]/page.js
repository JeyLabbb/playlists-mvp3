"use client";

import { useState, useEffect, useCallback, use } from 'react';
import { usePathname } from 'next/navigation';
import AnimatedList from '../../components/AnimatedList';
import { normalizeUsername } from '../../../lib/social/usernameUtils';
import { usePleiaSession } from '../../../lib/auth/usePleiaSession';

export default function PublicProfilePage({ params }) {
  const pathname = usePathname();
  const resolvedParams = use(params);
  const username = resolvedParams.username || pathname.split('/').pop();
  const { data: session } = usePleiaSession();
  
  const [profile, setProfile] = useState(null);
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewPlaylist, setPreviewPlaylist] = useState(null);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [previewInfo, setPreviewInfo] = useState({ isPreview: false, remainingCount: 0, total: 0 });
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true); 
      
      let userPlaylists = [];
      
      // First, try trending endpoint
      const trendingResponse = await fetch('/api/trending?limit=500');
      const trendingData = await trendingResponse.json();
      
      if (trendingData.success && trendingData.playlists) {
        // Filter playlists by this username
        userPlaylists = trendingData.playlists.filter(
          playlist => playlist.author?.username === username
        );
      }
      
      // If no playlists from trending (KV not available), try localStorage fallback
      if (userPlaylists.length === 0) {
        console.log('[USER-PROFILE] No data from trending, trying localStorage fallback');
        userPlaylists = await getPlaylistsFromLocalStorage();
        
        if (userPlaylists.length > 0) {
          console.log(`[USER-PROFILE] Found ${userPlaylists.length} total playlists from localStorage`);
          
          // Filter for this specific username
          userPlaylists = userPlaylists.filter(
            playlist => playlist.author?.username === username
          );
          
          console.log(`[USER-PROFILE] Found ${userPlaylists.length} playlists for user ${username}`);
        }
      }
      
      if (userPlaylists.length === 0) {
        setError('Usuario no encontrado o sin playlists públicas');
        return;
      }
      
      // Extract profile info from the first playlist (they should all have same author)
      const authorInfo = userPlaylists[0].author;
      
      // Try to get full profile information from API
      let fullProfile = null;
      try {
        const profileResponse = await fetch(`/api/social/profile/${encodeURIComponent(username)}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.profile) {
            fullProfile = profileData.profile;
            console.log('[USER-PROFILE] Loaded profile from API:', fullProfile);
          }
        }
      } catch (profileError) {
        console.warn('[USER-PROFILE] Error fetching profile from API:', profileError);
        
        // Fallback: Look for user profile in localStorage
        try {
          const allProfileKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('jey_user_profile:')) {
              allProfileKeys.push(key);
            }
          }
          
          // Find profile by username
          for (const key of allProfileKeys) {
            try {
              const profileData = JSON.parse(localStorage.getItem(key) || 'null');
              if (profileData && normalizeUsername(profileData.username) === normalizeUsername(username)) {
                fullProfile = profileData;
                break;
              }
            } catch (parseError) {
              console.warn(`Error parsing profile key ${key}:`, parseError);
            }
          }
        } catch (localStorageError) {
          console.warn('Error searching for full profile in localStorage:', localStorageError);
        }
      }
      
      // Use full profile if available, otherwise use basic author info
      const finalProfile = {
        username: normalizeUsername(fullProfile?.username || authorInfo?.username || username),
        displayName: fullProfile?.displayName || authorInfo?.displayName || username,
        image: fullProfile?.image || authorInfo?.image || null,
        bio: fullProfile?.bio || null,
        email: fullProfile?.email || null // Store email for playlist access control
      };
      setProfile(finalProfile);
      
      // Add owner email to each playlist for access control
      const playlistsWithOwner = userPlaylists.map(playlist => ({
        ...playlist,
        ownerEmail: finalProfile.email || playlist.author?.email || playlist.ownerEmail || null
      }));
      setPublicPlaylists(playlistsWithOwner);
      
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Error al cargar el perfil del usuario');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      fetchUserProfile();
    }
  }, [username, fetchUserProfile]);


  // React to localStorage search function
  const getPlaylistsFromLocalStorage = async () => {
    try {
      const allPlaylists = [];
      
      // Scan all localStorage keys that start with 'jey_user_playlists:'
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('jey_user_playlists:')) {
          try {
            const userPlaylists = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Add author info and filter public playlists
            const publicPlaylists = userPlaylists
              .filter(playlist => playlist.public !== false) // Default to true for legacy playlists
              .map(playlist => ({
                id: playlist.playlistId,
                prompt: playlist.prompt || 'Playlist creada',
                playlistName: playlist.name,
                playlistId: playlist.playlistId,
                spotifyUrl: playlist.url,
                trackCount: playlist.tracks || 0,
                views: playlist.views || 0,
                clicks: playlist.clicks || 0,
                createdAt: playlist.createdAt,
                author: {
                  username: playlist.username || playlist.userEmail?.split('@')[0] || 'unknown',
                  displayName: playlist.userName || playlist.userEmail?.split('@')[0] || 'Usuario',
                  image: playlist.userImage || null
                }
              }));
            
            allPlaylists.push(...publicPlaylists);
          } catch (parseError) {
            console.warn(`Error parsing localStorage key ${key}:`, parseError);
          }
        }
      }
      
      // Sort by creation date (newest first)
      allPlaylists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return allPlaylists;
    } catch (error) {
      console.error('[USER-PROFILE] Error reading from localStorage:', error);
      return [];
    }
  };

  // Helper function to update metrics in localStorage
  const updateMetricsInLocalStorage = async (playlistId, type) => {
    try {
      const localStorageKey = `jey_playlist_metrics:${playlistId}`;
      const currentMetrics = JSON.parse(localStorage.getItem(localStorageKey) || '{"views": 0, "clicks": 0}');
      
      if (type === 'view') {
        currentMetrics.views = (currentMetrics.views || 0) + 1;
      } else if (type === 'click') {
        currentMetrics.clicks = (currentMetrics.clicks || 0) + 1;
      }
      
      localStorage.setItem(localStorageKey, JSON.stringify(currentMetrics));
      console.log(`Updated ${type} metrics in localStorage for playlist ${playlistId}`);
      
      // Update local state if needed
      setPublicPlaylists(prevPlaylists => 
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

  const trackClick = async (playlistId, spotifyUrl) => {
    // 🚨 CRITICAL: Open Spotify URL immediately, track in background
    if (spotifyUrl) {
      try {
        const opened = window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
        if (!opened || opened.closed || typeof opened.closed === 'undefined') {
          window.location.href = spotifyUrl;
        }
      } catch (error) {
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
      
      if (result.reason === 'fallback-localStorage') {
        await updateMetricsInLocalStorage(playlistId, 'click');
      } else if (result.ok) {
        // Update local state
        setPublicPlaylists(prevPlaylists => 
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
      await updateMetricsInLocalStorage(playlistId, 'click');
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
      
      if (result.reason === 'fallback-localStorage') {
        await updateMetricsInLocalStorage(playlistId, 'view');
      } else if (result.ok) {
        // Update local state
        setPublicPlaylists(prevPlaylists => 
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
      await updateMetricsInLocalStorage(playlistId, 'view');
    }
  };

  const loadPlaylistPreview = async (playlist) => {
    try {
      setLoadingPreview(true);
      setPreviewPlaylist(playlist);
      setPreviewTracks([]);

      // Track click metric for preview
      try {
        const metricsResponse = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlistId: playlist.playlistId, type: 'click' })
        });
        
        const metricsResult = await metricsResponse.json();
        
        // If fallback to localStorage, handle client-side
        if (metricsResult.reason === 'fallback-localStorage') {
          await updateMetricsInLocalStorage(playlist.playlistId, 'click');
        }
      } catch (metricsError) {
        console.error('Error tracking preview click:', metricsError);
        // Fallback to localStorage
        await updateMetricsInLocalStorage(playlist.playlistId, 'click');
      }

      // Extract playlist ID from URL if needed
      let playlistId = playlist.playlistId;
      if (playlist.spotifyUrl && !playlistId) {
        const match = playlist.spotifyUrl.match(/playlist\/([a-zA-Z0-9]+)/);
        if (match) playlistId = match[1];
      }

      if (!playlistId) {
        console.error('No playlist ID available');
        setPreviewTracks([]);
        return;
      }

      // Get owner email from playlist or profile
      const ownerEmail = playlist.ownerEmail || profile?.email || null;
      const tracksUrl = ownerEmail 
        ? `/api/spotify/playlist-tracks?id=${playlistId}&ownerEmail=${encodeURIComponent(ownerEmail)}`
        : `/api/spotify/playlist-tracks?id=${playlistId}`;
      
      const response = await fetch(tracksUrl);
      const data = await response.json();

      if (data.success && data.tracks) {
        setPreviewTracks(data.tracks);
        // Store preview info
        setPreviewInfo({
          isPreview: data.preview || false,
          remainingCount: data.remainingCount || 0,
          total: data.total || data.tracks.length
        });
      } else {
        console.error('Failed to load playlist tracks:', data.error);
        // Set empty tracks to show error state
        setPreviewTracks([]);
        setPreviewInfo({ isPreview: false, remainingCount: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error loading playlist preview:', error);
      // Set empty tracks to show error state
      setPreviewTracks([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const anonymizePrompt = (prompt) => {
    return prompt
      .replace(/\b\w+@\w+\.\w+\b/g, '***')
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '***')
      .substring(0, 100) + (prompt.length > 100 ? '...' : '');
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        
        <div className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Cargando perfil...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        
        <div className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">👤</div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Usuario no encontrado
              </h1>
              <p className="text-gray-300 text-lg">
                @{username} no existe o no tiene playlists públicas
              </p>
            </div>
            
            <button
              onClick={() => window.history.back()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Volver atrás
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profile exists
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      <div className="pt-12 sm:pt-20 pb-4 sm:pb-12 px-6 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => {
              // Check if we came from trending
              const referrer = document.referrer;
              if (referrer.includes('/trending')) {
                window.location.href = '/trending';
              } else {
                window.history.back();
              }
            }}
            className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <span>←</span>
            <span>Volver</span>
          </button>
          
          {/* Profile Header - Mobile optimized */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-3 sm:p-8 mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                {profile.image ? (
                  <img 
                    src={profile.image} 
                    alt={profile.displayName} 
                    className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-gray-600"
                    onError={(e) => {
                      // If image fails to load, hide it and show placeholder
                      e.target.style.display = 'none';
                      const placeholder = e.target.nextElementSibling;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center border-4 border-gray-600 ${profile.image ? 'hidden' : ''}`}
                >
                  <span className="text-white text-2xl sm:text-4xl">👤</span>
                </div>
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="mb-1 sm:mb-2">
                  <h1 className="text-xl sm:text-3xl font-bold text-white">
                    {profile.displayName}
                  </h1>
                  <span className="text-gray-400 text-sm sm:text-lg">
                    @{normalizeUsername(profile.username) || profile.username || 'unknown'}
                  </span>
                </div>
                
                {profile.bio && (
                  <div className="text-gray-300 text-sm sm:text-lg mb-2 sm:mb-4 px-2">
                    {profile.bio}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-6 text-xs sm:text-sm text-gray-400">
                  <span>{publicPlaylists.length} playlists públicas</span>
                  <span className="hidden sm:inline">•</span>
                  <span>
                    {publicPlaylists.reduce((total, playlist) => total + (playlist.trackCount || 0), 0)} canciones totales
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>
                    {publicPlaylists.reduce((total, playlist) => total + (playlist.views || 0), 0)} visualizaciones
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Playlists Grid - Mobile optimized */}
          <div className="space-y-3 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <h2 className="text-lg sm:text-2xl font-bold text-white">
                Playlists Públicas
              </h2>
              <span className="text-gray-400 text-xs sm:text-lg">
                {publicPlaylists.length} playlist{publicPlaylists.length !== 1 ? 's' : ''}
              </span>
            </div>

            {publicPlaylists.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="text-6xl mb-4">🎵</div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-400 mb-2">
                  Sin playlists públicas
                </h3>
                <p className="text-gray-500 text-sm sm:text-base px-2">
                  Este usuario aún no ha hecho públicas sus playlists
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {publicPlaylists.map((playlist) => (
                  <div
                    key={playlist.playlistId}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 sm:p-6 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800/70 group"
                    onMouseEnter={() => trackView(playlist.playlistId)}
                  >
                    <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                      {/* Album Art Placeholder */}
                      <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg sm:text-2xl">🎵</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="text-sm sm:text-lg font-bold text-white mb-1 sm:mb-2 truncate">
                          {playlist.playlistName}
                        </h3>
                        
                        <p className="text-gray-400 text-xs sm:text-sm mb-2 line-clamp-2">
                          &ldquo;{anonymizePrompt(playlist.prompt)}&rdquo;
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span>{playlist.trackCount} canciones</span>
                          <span className="hidden sm:inline">👀</span>
                          <span className="hidden sm:inline">{playlist.views || 0}</span>
                          <span className="hidden sm:inline">🔗</span>
                          <span className="hidden sm:inline">{playlist.clicks || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-1 sm:gap-2">
                      {/* Preview Button */}
                      <button
                        onClick={() => loadPlaylistPreview(playlist)}
                        disabled={loadingPreview}
                        className="flex items-center justify-center gap-1 sm:gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors duration-200 text-xs sm:text-sm"
                      >
                        <span className="text-sm sm:text-lg">{loadingPreview ? '⏳' : '👁️'}</span>
                        <span className="hidden sm:inline">{loadingPreview ? 'Cargando...' : 'Ver Preview'}</span>
                        <span className="sm:hidden">Preview</span>
                      </button>
                      
                      {/* Spotify Button */}
                      {playlist.spotifyUrl && (
                        <button
                          onClick={() => trackClick(playlist.playlistId, playlist.spotifyUrl)}
                          className="flex items-center justify-center gap-1 sm:gap-2 bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors duration-200 text-xs sm:text-sm"
                        >
                          <span className="text-sm sm:text-lg">🎧</span>
                          <span className="hidden sm:inline">Abrir en Spotify</span>
                          <span className="sm:hidden">Spotify</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t border-gray-700">
            <p className="text-gray-500 text-sm">
              Perfil público de @{username} • Generado con IA • by MTRYX
            </p>
          </div>
        </div>

        {/* Preview Modal */}
        {previewPlaylist && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {previewPlaylist.playlistName}
                  </h2>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    {previewInfo.total > 0 ? previewInfo.total : previewTracks.length} canciones • Creado por @{previewPlaylist.author?.username || username}
                    {previewInfo.isPreview && previewInfo.remainingCount > 0 && (
                      <span className="block mt-1 text-xs text-blue-400 font-semibold">
                        Mostrando {previewTracks.length} de {previewInfo.total} (preview limitado)
                      </span>
                    )}
                    {!previewInfo.isPreview && previewTracks.length > 15 && (
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
                  className="text-gray-400 hover:text-white transition-colors text-xl sm:text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto flex-1 min-h-0">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-sm">Cargando canciones...</p>
                    </div>
                  </div>
                ) : previewTracks.length > 0 ? (
                  <div className="p-4">
                    <div className="space-y-2">
                      {previewTracks.map((track, index) => (
                        <div key={`track-${previewPlaylist.playlistId}-${index}-${track.id}`} className="flex items-center gap-3 py-2">
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded flex items-center justify-center">
                            <span className="text-white text-sm">🎵</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm sm:text-base truncate">
                              {track.name}
                            </p>
                            <p className="text-gray-400 text-xs sm:text-sm truncate">
                              {track.artistNames || track.artists?.join(', ') || 'Artista desconocido'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔒</div>
                      <p className="text-gray-400 text-sm mb-2">Preview no disponible</p>
                      <p className="text-gray-500 text-xs">Inicia sesión para ver las canciones</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {previewPlaylist.spotifyUrl && !loadingPreview && (
                <div className="flex items-center justify-center gap-3 p-4 sm:p-6 border-t border-gray-700">
                  <button
                    onClick={() => trackClick(previewPlaylist.playlistId, previewPlaylist.spotifyUrl)}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
                  >
                    <span className="text-xl">🎧</span>
                    <span>Abrir en Spotify</span>
                  </button>
                  <button
                    onClick={() => {
                      setPreviewPlaylist(null);
                      setPreviewTracks([]);
                    }}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
                  >
                    <span>Cerrar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
