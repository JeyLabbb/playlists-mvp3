'use client';

import { useState } from 'react';

type Track = {
  name: string;
  artist: string;
  spotify_url: string;
  image?: string | null;
  id?: string;
  artists?: Array<{ name: string }>;
  album?: { images?: Array<{ url: string }> };
  external_urls?: { spotify?: string };
  open_url?: string;
  artistNames?: string;
};

type TracksPreviewProps = {
  tracks: Track[];
  totalTracks?: number;
  spotifyPlaylistUrl?: string;
  loading?: boolean;
  onClose?: () => void;
  className?: string;
};

export default function TracksPreview({
  tracks,
  totalTracks,
  spotifyPlaylistUrl,
  loading = false,
  onClose,
  className = ''
}: TracksPreviewProps) {
  if (loading) {
    return (
      <div className={`text-center py-8 text-gray-400 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
        <p className="text-sm">Cargando canciones...</p>
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-400 text-sm ${className}`}>
        <p>No hay canciones disponibles</p>
        {spotifyPlaylistUrl && (
          <a
            href={spotifyPlaylistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 mt-2 inline-block text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            Ver playlist en Spotify →
          </a>
        )}
      </div>
    );
  }

  const formattedTracks = tracks.map((track) => ({
    name: track.name || 'Sin nombre',
    artist: Array.isArray(track.artists) && track.artists.length > 0
      ? track.artists.map((a: any) => a.name || a).join(', ')
      : track.artistNames || track.artist || 'Artista desconocido',
    spotify_url: track.external_urls?.spotify || track.open_url || track.spotify_url || `https://open.spotify.com/track/${track.id}` || '#',
    image: track.album?.images?.[0]?.url || track.image || null,
  }));

  const displayTotal = totalTracks || formattedTracks.length;
  const showingCount = formattedTracks.length;

  return (
    <div className={`space-y-2 max-h-96 overflow-y-auto rounded-xl p-4 ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {formattedTracks.map((track, index) => (
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
      {displayTotal > showingCount && spotifyPlaylistUrl && (
        <div className="pt-2 mt-2 border-t border-white/5 text-center">
          <p className="text-xs text-gray-400">
            ... y <span className="font-semibold text-gray-300">{displayTotal - showingCount}</span> canciones más
          </p>
          <a
            href={spotifyPlaylistUrl}
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
  );
}

