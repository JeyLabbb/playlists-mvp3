'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type FeaturedPlaylist = {
  id: string;
  playlist_name: string;
  owner_display_name: string;
  owner_username?: string | null;
  owner_user_id?: string | null;
  owner_profile_url?: string | null; // URL completa del perfil
  spotify_playlist_id: string;
  spotify_playlist_url: string;
  preview_tracks: Array<{
    name: string;
    artist: string;
    album?: string;
    image?: string;
    spotify_url?: string;
  }>;
};

type Track = {
  name: string;
  artist: string;
  spotify_url: string;
  image?: string | null;
};

export default function FeaturedPlaylistCard() {
  const [featured, setFeatured] = useState<FeaturedPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTracks, setShowTracks] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [totalTracks, setTotalTracks] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/featured-playlist')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.featured) {
          setFeatured(data.featured);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('[FEATURED] Error loading featured playlist:', err);
        setLoading(false);
      });
  }, []);

  const handleShowTracks = async () => {
    if (showTracks) {
      setShowTracks(false);
      return;
    }

    if (tracks.length > 0) {
      // Si ya tenemos tracks, solo mostrar
      setShowTracks(true);
      return;
    }

    // Cargar tracks desde Spotify
    setTracksLoading(true);
    try {
      const res = await fetch(`/api/featured-playlist/tracks?playlist_id=${featured?.spotify_playlist_id}`);
      const data = await res.json();
      
      if (data.success) {
        setTracks(data.tracks || []);
        setTotalTracks(data.total || 0);
        setShowTracks(true);
      } else {
        console.error('[FEATURED] Error loading tracks:', data.error);
        // Si falla, usar preview_tracks si están disponibles
        if (featured?.preview_tracks && featured.preview_tracks.length > 0) {
          setTracks(featured.preview_tracks.slice(0, 15).map(t => ({
            name: t.name,
            artist: t.artist,
            spotify_url: t.spotify_url || '#',
          })));
          setTotalTracks(featured.preview_tracks.length);
          setShowTracks(true);
        }
      }
    } catch (err) {
      console.error('[FEATURED] Error fetching tracks:', err);
      // Fallback a preview_tracks
      if (featured?.preview_tracks && featured.preview_tracks.length > 0) {
        setTracks(featured.preview_tracks.slice(0, 15).map(t => ({
          name: t.name,
          artist: t.artist,
          spotify_url: t.spotify_url || '#',
        })));
        setTotalTracks(featured.preview_tracks.length);
        setShowTracks(true);
      }
    } finally {
      setTracksLoading(false);
    }
  };

  // Función para obtener URL del perfil - igual que trending
  const getProfileUrl = () => {
    // Prioridad 1: username directo (igual que trending usa)
    if (featured?.owner_username) {
      // Usar username tal cual (sin normalizar que quite sufijos)
      const username = featured.owner_username.trim();
      if (username.length >= 1) {
        return `/u/${encodeURIComponent(username)}`;
      }
    }
    
    // Prioridad 2: profile_url guardado en DB (la fuente de verdad)
    if (featured?.owner_profile_url) {
      // Si es URL completa, extraer solo la ruta relativa
      if (featured.owner_profile_url.startsWith('http')) {
        const url = new URL(featured.owner_profile_url);
        return url.pathname;
      }
      // Si ya es ruta relativa, usarla directamente
      return featured.owner_profile_url;
    }
    
    // Prioridad 3: usar display_name sanitizado (fallback)
    if (featured?.owner_display_name && !featured?.owner_username) {
      const sanitized = featured.owner_display_name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._-]/g, '')
        .substring(0, 30);
      if (sanitized.length >= 1) {
        return `/u/${encodeURIComponent(sanitized)}`;
      }
    }
    
    // Si no podemos construir una URL válida, no mostrar link
    return null;
  };

  if (loading) {
    return null;
  }

  if (!featured) {
    return null;
  }

  const profileUrl = getProfileUrl();

  return (
    <div 
      className="relative mb-8 rounded-3xl overflow-hidden group"
      style={{
        background: 'linear-gradient(135deg, rgba(54, 226, 180, 0.15) 0%, rgba(91, 140, 255, 0.15) 50%, rgba(71, 200, 209, 0.1) 100%)',
        border: '1px solid rgba(54, 226, 180, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(54, 226, 180, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 80px rgba(54, 226, 180, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
        e.currentTarget.style.borderColor = 'rgba(54, 226, 180, 0.5)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(54, 226, 180, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(54, 226, 180, 0.3)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Efecto de brillo animado en el borde superior */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, transparent, #36E2B4, #5B8CFF, transparent)',
          animation: 'shimmer 3s ease-in-out infinite',
        }}
      />
      
      {/* Badge destacado premium */}
      <div className="absolute top-4 right-4 z-10">
        <div
          className="px-4 py-1.5 rounded-full backdrop-blur-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(54, 226, 180, 0.3), rgba(91, 140, 255, 0.3))',
            border: '1px solid rgba(54, 226, 180, 0.5)',
            boxShadow: '0 4px 16px rgba(54, 226, 180, 0.3)',
          }}
        >
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <span className="text-yellow-300 animate-pulse">⭐</span>
            <span>Destacada</span>
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-1 h-6 rounded-full"
              style={{
                background: 'linear-gradient(180deg, #36E2B4, #5B8CFF)',
                boxShadow: '0 0 12px rgba(54, 226, 180, 0.6)',
              }}
            />
            <h3 
              className="text-lg sm:text-xl font-bold text-white"
              style={{
                fontFamily: 'var(--font-primary), sans-serif',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #36E2B4, #5B8CFF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Playlist destacada de la semana
            </h3>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="mb-6">
          <h4 
            className="text-2xl sm:text-3xl font-bold text-white mb-4"
            style={{
              fontFamily: 'var(--font-primary), sans-serif',
              letterSpacing: '-0.03em',
              lineHeight: '1.2',
            }}
          >
            {featured.playlist_name}
          </h4>
          
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">Creada por</span>
            {profileUrl ? (
              <Link
                href={profileUrl}
                className="text-sm font-semibold hover:underline transition-all inline-flex items-center gap-1"
                style={{
                  color: '#36E2B4',
                  textShadow: '0 0 8px rgba(54, 226, 180, 0.4)',
                }}
                onClick={(e) => {
                  // Prevenir que se propague el click del botón de tracks
                  e.stopPropagation();
                }}
              >
                {featured.owner_display_name}
                <span className="text-xs opacity-70">→</span>
              </Link>
            ) : (
              <span 
                className="text-sm font-semibold"
                style={{
                  color: '#36E2B4',
                  textShadow: '0 0 8px rgba(54, 226, 180, 0.4)',
                }}
              >
                {featured.owner_display_name}
              </span>
            )}
          </div>

          {/* Botón para ver canciones - más visible e intuitivo */}
          <button
            onClick={handleShowTracks}
            disabled={tracksLoading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: showTracks 
                ? 'linear-gradient(135deg, rgba(54, 226, 180, 0.2), rgba(91, 140, 255, 0.2))'
                : 'linear-gradient(135deg, rgba(54, 226, 180, 0.3), rgba(91, 140, 255, 0.3))',
              border: '1px solid rgba(54, 226, 180, 0.5)',
              color: '#fff',
              boxShadow: showTracks 
                ? '0 4px 16px rgba(54, 226, 180, 0.3)'
                : '0 4px 16px rgba(54, 226, 180, 0.2)',
            }}
            onMouseEnter={(e) => {
              if (!tracksLoading && !showTracks) {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(54, 226, 180, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!tracksLoading && !showTracks) {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(54, 226, 180, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {tracksLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                <span>Cargando canciones...</span>
              </span>
            ) : showTracks ? (
              <span className="flex items-center gap-2">
                <span>Ocultar canciones</span>
                <span>↑</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Ver canciones</span>
                <span>↓</span>
              </span>
            )}
          </button>
        </div>

        {/* Tracks preview */}
        {showTracks && (
          <div className="mb-6">
            {tracksLoading ? (
              <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
                <p className="text-sm">Cargando canciones...</p>
              </div>
            ) : tracks.length > 0 ? (
              <div 
                className="space-y-2 max-h-96 overflow-y-auto rounded-xl p-4"
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {tracks.map((track, index) => (
                  <a
                    key={index}
                    href={track.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group/track"
                    style={{
                      backdropFilter: 'blur(4px)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {track.image && (
                      <div className="relative">
                        <img
                          src={track.image}
                          alt={track.name}
                          className="w-12 h-12 rounded-lg object-cover"
                          style={{
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                          }}
                        />
                        <div 
                          className="absolute inset-0 rounded-lg opacity-0 group-hover/track:opacity-100 transition-opacity"
                          style={{
                            background: 'linear-gradient(135deg, rgba(54, 226, 180, 0.2), rgba(91, 140, 255, 0.2))',
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover/track:text-green-300 transition-colors">
                        {track.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                    </div>
                    <span className="text-xs text-gray-500 opacity-0 group-hover/track:opacity-100 transition-opacity">
                      →
                    </span>
                  </a>
                ))}
                
                {/* Mensaje "... y x canciones más" */}
                {totalTracks > tracks.length && (
                  <div className="pt-2 mt-2 border-t border-white/5 text-center">
                    <p className="text-xs text-gray-400">
                      ... y <span className="font-semibold text-gray-300">{totalTracks - tracks.length}</span> canciones más
                    </p>
                    <a
                      href={featured.spotify_playlist_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:text-green-300 mt-1 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver todas en Spotify →
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                No se pudieron cargar las canciones
              </div>
            )}
          </div>
        )}

        {/* Botón principal */}
        <div className="flex gap-3">
          <a
            href={featured.spotify_playlist_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center font-semibold py-4 px-6 rounded-xl text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group/btn"
            style={{
              background: 'linear-gradient(135deg, #36E2B4 0%, #5B8CFF 100%)',
              boxShadow: '0 4px 20px rgba(54, 226, 180, 0.4), 0 0 40px rgba(91, 140, 255, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 30px rgba(54, 226, 180, 0.6), 0 0 60px rgba(91, 140, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(54, 226, 180, 0.4), 0 0 40px rgba(91, 140, 255, 0.2)';
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Efecto de brillo en hover */}
            <div 
              className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent)',
              }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>Abrir en Spotify</span>
              <span className="text-lg">→</span>
            </span>
          </a>
        </div>
      </div>

      {/* Estilos de animación */}
      <style jsx>{`
        @keyframes shimmer {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(-100%);
          }
          50% {
            opacity: 1;
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
