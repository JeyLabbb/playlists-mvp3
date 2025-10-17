"use client";

import { useState, useEffect, use } from 'react';
import { usePathname } from 'next/navigation';
import AnimatedList from '../../components/AnimatedList';

export default function PublicProfilePage({ params }) {
  const pathname = usePathname();
  const resolvedParams = use(params);
  const username = resolvedParams.username || pathname.split('/').pop();
  
  const [profile, setProfile] = useState(null);
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewPlaylist, setPreviewPlaylist] = useState(null);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (username) {
      fetchUserProfile();
    }
  }, [username]);

  const fetchUserProfile = async () => {
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
      
      // Try to get full profile information
      let fullProfile = null;
      try {
        // Look for user profile in localStorage
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
            if (profileData && profileData.username === username) {
              fullProfile = profileData;
              break;
            }
          } catch (parseError) {
            console.warn(`Error parsing profile key ${key}:`, parseError);
          }
        }
      } catch (error) {
        console.warn('Error searching for full profile:', error);
      }
      
      // Use full profile if available, otherwise use basic author info
      setProfile({
        username: authorInfo.username,
        displayName: fullProfile?.displayName || authorInfo.displayName,
        image: fullProfile?.image || authorInfo.image,
        bio: fullProfile?.bio || null
      });
      
      setPublicPlaylists(userPlaylists);
      
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Error al cargar el perfil del usuario');
    } finally {
      setLoading(false);
    }
  };

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

  const trackClick = async (playlistId, spotifyUrl) => {
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, type: 'click' })
      });
      
      try {
        window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
      } catch (openError) {
        console.error('Error opening Spotify URL:', openError);
        // Fallback: try to navigate directly
        window.location.href = spotifyUrl;
      }
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still open the link even if tracking fails
      if (spotifyUrl) {
        try {
          window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
        } catch (openError) {
          window.location.href = spotifyUrl;
        }
      }
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

  const loadPlaylistPreview = async (playlist) => {
    try {
      setLoadingPreview(true);
      setPreviewPlaylist(playlist);
      setPreviewTracks([]);

      // Track click metric for preview
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: playlist.playlistId, type: 'click' })
      });

      const response = await fetch(`/api/spotify/playlist-tracks?id=${playlist.playlistId}`);
      const data = await response.json();

      if (data.success) {
        // Shuffle tracks and show 15 random ones
        const shuffledTracks = [...data.tracks].sort(() => Math.random() - 0.5);
        setPreviewTracks(shuffledTracks);
      } else {
        console.error('Failed to load playlist tracks:', data.error);
        // Set empty tracks to show error state
        setPreviewTracks([]);
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
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center border-4 border-gray-600">
                    <span className="text-white text-2xl sm:text-4xl">👤</span>
                  </div>
                )}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="mb-1 sm:mb-2">
                  <h1 className="text-xl sm:text-3xl font-bold text-white">
                    {profile.displayName}
                  </h1>
                  <span className="text-gray-400 text-sm sm:text-lg">
                    @{profile.username}
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
              <div className="grid gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {publicPlaylists.map((playlist) => (
                  <div
                    key={playlist.playlistId}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-6 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800/70 group"
                    onMouseEnter={() => trackView(playlist.playlistId)}
                  >
                    <div className="flex items-start gap-2 sm:gap-4 mb-2 sm:mb-4">
                      {/* Album Art Placeholder */}
                      <div className="flex-shrink-0 w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg sm:text-2xl">🎵</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-lg font-bold text-white mb-1 sm:mb-2 truncate">
                          {playlist.playlistName}
                        </h3>
                        
                        <p className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-3 line-clamp-2">
                          &ldquo;{anonymizePrompt(playlist.prompt)}&rdquo;
                        </p>
                        
                        <div className="flex items-center gap-1 sm:gap-4 text-xs text-gray-500">
                          <span>{playlist.trackCount} canciones</span>
                          <span className="hidden sm:inline">👀</span>
                          <span>{playlist.views || 0}</span>
                          <span className="hidden sm:inline">🔗</span>
                          <span>{playlist.clicks || 0}</span>
                          <span className="hidden sm:inline">
                            {new Date(playlist.createdAt).toLocaleDateString('es-ES', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
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
              Perfil público de @{username} • Generado con IA JeyLabbb
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
                    {previewTracks.length} canciones • Creado por @{previewPlaylist.author?.username || username}
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
                      {previewTracks.slice(0, 15).map((track, index) => (
                        <div key={`track-${previewPlaylist.playlistId}-${index}-${track.id}`} className="flex items-center gap-3 py-2">
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded flex items-center justify-center">
                            <span className="text-white text-sm">🎵</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm sm:text-base truncate">
                              {track.name}
                            </p>
                            <p className="text-gray-400 text-xs sm:text-sm truncate">
                              {track.artists?.join(', ') || 'Artista desconocido'}
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
