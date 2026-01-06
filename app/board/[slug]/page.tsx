'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PublicBoardPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [board, setBoard] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);

  const loadPublicBoard = async () => {
    try {
      const res = await fetch(`/api/board/public/${slug}`);
      if (!res.ok) {
        throw new Error('Board no encontrado');
      }

      const data = await res.json();
      setBoard(data.board);
      setPlaylists(data.playlists || []);
    } catch (err: any) {
      console.error('[PUBLIC_BOARD] Error:', err);
      setError(err.message || 'Error al cargar el board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      loadPublicBoard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-4">
        <div className="text-6xl mb-4">🎵</div>
        <h1 className="text-2xl font-bold mb-2">Board no encontrado</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <Link
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Ir a PLEIA
        </Link>
      </div>
    );
  }

  return <BoardRenderer board={board} playlists={playlists} />;
}

function BoardRenderer({ board, playlists }: any) {
  const { theme, displayName, statusText, fontTitle, fontStatus } = board;

  const themeClasses = {
    light: 'bg-white text-gray-900',
    dark: 'bg-gray-950 text-white',
    pleia: 'bg-gradient-to-br from-gray-900 via-green-900/20 to-blue-900/20 text-white',
  };

  const fontClasses: any = {
    inter: 'font-sans',
    space_grotesk: 'font-mono tracking-tight',
    sf_pro: 'font-sans',
  };

  const isPleiaTheme = theme === 'pleia';

  return (
    <div className={`min-h-screen ${themeClasses[theme as keyof typeof themeClasses]}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-16">
          {isPleiaTheme && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-full mb-6">
              <span className="text-sm font-semibold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                ✨ PLEIA Board
              </span>
            </div>
          )}

          <h1
            className={`text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 ${fontClasses[fontTitle]}`}
            style={{ letterSpacing: '-0.02em' }}
          >
            {displayName}
          </h1>

          {statusText && (
            <p
              className={`text-xl sm:text-2xl lg:text-3xl opacity-80 max-w-3xl mx-auto ${fontClasses[fontStatus]}`}
              style={{ lineHeight: '1.4' }}
            >
              {statusText}
            </p>
          )}
        </div>

        {/* Playlists Grid */}
        {playlists.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-lg">Aún no hay playlists públicas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
            {playlists.map((playlist: any) => (
              <PlaylistCard key={playlist.id} playlist={playlist} theme={theme} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-12 border-t border-current/10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
          >
            <span>Made with</span>
            <span className="font-semibold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              PLEIA
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function PlaylistCard({ playlist, theme }: any) {
  const [expanded, setExpanded] = useState(false);

  const cardBg = {
    light: 'bg-gray-50 border-gray-200 hover:border-gray-300',
    dark: 'bg-white/5 border-white/10 hover:border-white/30',
    pleia: 'bg-white/5 border-white/10 hover:border-green-500/30',
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        cardBg[theme as keyof typeof cardBg]
      }`}
    >
      {/* Cover */}
      <div className="aspect-square bg-gray-800 overflow-hidden relative group">
        {playlist.coverImage ? (
          <img
            src={playlist.coverImage}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 line-clamp-2">{playlist.name}</h3>

        {playlist.mood && (
          <p className="text-sm opacity-60 mb-3 line-clamp-1">{playlist.mood}</p>
        )}

        {/* Preview Tracks */}
        {playlist.previewTracks && playlist.previewTracks.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs opacity-60 hover:opacity-100 transition-opacity mb-2"
            >
              {expanded ? '▼' : '▶'} {playlist.previewTracks.length} canciones
            </button>

            {expanded && (
              <div className="space-y-1 text-xs opacity-70 max-h-32 overflow-y-auto">
                {playlist.previewTracks.map((track: any, idx: number) => (
                  <div key={idx} className="truncate">
                    {track.name} · {track.artist}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spotify Button */}
        {playlist.spotifyUrl && (
          <a
            href={playlist.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg font-semibold text-sm text-center transition-colors"
          >
            Abrir en Spotify
          </a>
        )}
      </div>
    </div>
  );
}

