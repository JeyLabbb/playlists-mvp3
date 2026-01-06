'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { usePleiaSession } from '../../lib/auth/usePleiaSession';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'pleia', label: 'PLEIA' },
];

const FONTS = [
  { value: 'inter', label: 'Inter' },
  { value: 'space_grotesk', label: 'Space Grotesk' },
  { value: 'sf_pro', label: 'SF Pro' },
];

export default function BoardPage() {
  const router = useRouter();
  const { data: sessionData, status } = usePleiaSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [board, setBoard] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);

  // Estado local - NO se resetea al guardar
  const [displayName, setDisplayName] = useState('');
  const [statusText, setStatusText] = useState('');
  const [theme, setTheme] = useState('pleia');
  const [fontTitle, setFontTitle] = useState('inter');
  const [fontStatus, setFontStatus] = useState('inter');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && sessionData?.user) {
      loadBoard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionData?.user]);

  const loadBoard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/board/me', {
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cargar board');
      }

      const data = await res.json();
      
      setBoard(data.board);
      setPlaylists(data.playlists || []);

      // Solo actualizar estado si no estamos editando
      if (data.board && !isEditing) {
        setDisplayName(data.board.display_name || '');
        setStatusText(data.board.status_text || '');
        setTheme(data.board.theme || 'pleia');
        setFontTitle(data.board.font_title || 'inter');
        setFontStatus(data.board.font_status || 'inter');
      }
    } catch (error: any) {
      console.error('[BOARD] Error loading:', error);
      toast.error(error.message || 'Error al cargar board');
    } finally {
      setLoading(false);
    }
  };

  const saveBoard = async () => {
    if (saving) return false;
    
    setSaving(true);
    try {
      const res = await fetch('/api/board/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          display_name: displayName,
          status_text: statusText,
          theme,
          font_title: fontTitle,
          font_status: fontStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar');
      }

      const data = await res.json();
      setBoard(data.board);
      return true;
    } catch (error: any) {
      console.error('[BOARD] Error saving:', error);
      toast.error(error.message || 'Error al guardar');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (newTheme: string) => {
    const oldTheme = theme;
    setTheme(newTheme);
    
    const success = await saveBoard();
    if (!success) {
      setTheme(oldTheme);
    }
  };

  const handleSave = async () => {
    const success = await saveBoard();
    if (success) {
      setIsEditing(false);
      toast.success('Cambios guardados');
    }
  };

  const handleCancel = () => {
    if (board) {
      setDisplayName(board.display_name || '');
      setStatusText(board.status_text || '');
      setTheme(board.theme || 'pleia');
      setFontTitle(board.font_title || 'inter');
      setFontStatus(board.font_status || 'inter');
    }
    setIsEditing(false);
  };

  const handlePlaylistUpdate = async (playlistId: string, updates: any) => {
    try {
      const kvUpdates: any = {};
      if (updates.playlist_name) kvUpdates.name = updates.playlist_name;
      if (updates.spotify_playlist_url) kvUpdates.url = updates.spotify_playlist_url;

      const res = await fetch(`/api/userplaylists`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          playlistId,
          ...kvUpdates,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar playlist');
      }

      if (updates.playlist_name || updates.spotify_playlist_url) {
        try {
          await fetch('/api/board/update-playlist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              playlistId,
              playlist_name: updates.playlist_name,
              spotify_playlist_url: updates.spotify_playlist_url,
            }),
          });
        } catch (supabaseError) {
          console.warn('[BOARD] Supabase update error:', supabaseError);
        }
      }

      // Recargar playlists sin recargar todo el board
      const boardRes = await fetch('/api/board/me', {
        credentials: 'include',
      });
      if (boardRes.ok) {
        const boardData = await boardRes.json();
        setPlaylists(boardData.playlists || []);
      }
      
      setEditingPlaylist(null);
      toast.success('Playlist actualizada');
    } catch (error) {
      console.error('[BOARD] Error updating playlist:', error);
      toast.error('Error al actualizar playlist');
    }
  };

  const copyPublicLink = () => {
    if (!board?.slug) {
      toast.error('No hay enlace disponible');
      return;
    }
    const url = `${window.location.origin}/board/${board.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-40 border-b transition-colors ${
        theme === 'light' 
          ? 'bg-white/95 backdrop-blur-md border-gray-200' 
          : theme === 'dark'
          ? 'bg-gray-900/95 backdrop-blur-md border-gray-800'
          : 'bg-gray-900/95 backdrop-blur-md border-white/10'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                theme === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'
              }`}
            >
              ← Volver
            </Link>

            <div className="flex items-center gap-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      theme === 'light'
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={copyPublicLink}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 border ${
                      theme === 'light'
                        ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    Compartir
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border ${
                      theme === 'light'
                        ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Cancelar
                  </button>
                </>
              )}

              {/* Theme Selector */}
              <div className={`relative group ${theme === 'light' ? 'text-gray-700' : 'text-white'}`}>
                <button className="px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 border border-current/20 hover:bg-current/10">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
                  </svg>
                  {THEMES.find(t => t.value === theme)?.label}
                </button>
                <div className={`absolute right-0 top-full mt-2 w-32 rounded-lg border shadow-xl p-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ${
                  theme === 'light'
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-800 border-gray-700'
                }`}>
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => handleThemeChange(t.value)}
                      disabled={saving}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                        theme === t.value
                          ? 'bg-green-500/20 text-green-400'
                          : theme === 'light'
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Board Render */}
      <div className="pt-16">
        <BoardRenderer
          displayName={displayName}
          statusText={statusText}
          theme={theme}
          fontTitle={fontTitle}
          fontStatus={fontStatus}
          playlists={playlists}
          isEditing={isEditing}
          onDisplayNameChange={setDisplayName}
          onStatusTextChange={setStatusText}
          onFontTitleChange={setFontTitle}
          onFontStatusChange={setFontStatus}
          onPlaylistClick={(pl) => setEditingPlaylist(pl)}
        />
      </div>

      {/* Playlist Edit Modal */}
      {editingPlaylist && (
        <PlaylistEditModal
          playlist={editingPlaylist}
          onClose={() => setEditingPlaylist(null)}
          onSave={(updates) => handlePlaylistUpdate(editingPlaylist.playlist_id, updates)}
        />
      )}
    </>
  );
}

function BoardRenderer({
  displayName,
  statusText,
  theme,
  fontTitle,
  fontStatus,
  playlists,
  isEditing,
  onDisplayNameChange,
  onStatusTextChange,
  onFontTitleChange,
  onFontStatusChange,
  onPlaylistClick,
}: any) {
  const themeConfig: any = {
    light: {
      bg: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      card: 'bg-white border-gray-200 shadow-lg hover:shadow-xl',
      cardHover: 'hover:border-gray-300',
      border: 'border-gray-200',
      accent: 'text-gray-900',
      inputBorder: 'border-gray-400',
      inputBg: 'bg-white',
    },
    dark: {
      bg: 'bg-gradient-to-br from-gray-950 via-gray-900 to-black',
      text: 'text-white',
      textSecondary: 'text-gray-400',
      card: 'bg-gray-800/80 border-gray-700/80 backdrop-blur-xl shadow-2xl hover:shadow-green-500/20',
      cardHover: 'hover:border-gray-600',
      border: 'border-gray-700/80',
      accent: 'text-white',
      inputBorder: 'border-gray-600',
      inputBg: 'bg-gray-800/50',
    },
    pleia: {
      bg: 'bg-gradient-to-br from-gray-900 via-green-900/30 to-blue-900/40',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      card: 'bg-white/10 border-white/20 backdrop-blur-xl shadow-2xl hover:shadow-green-500/30',
      cardHover: 'hover:border-green-500/40',
      border: 'border-white/20',
      accent: 'text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-blue-400',
      inputBorder: 'border-white/30',
      inputBg: 'bg-white/5',
    },
  };

  const currentTheme = themeConfig[theme] || themeConfig.pleia;
  const fontClasses: any = {
    inter: 'font-sans',
    space_grotesk: 'font-mono tracking-tight',
    sf_pro: 'font-sans',
  };

  const isPleiaTheme = theme === 'pleia';

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text} transition-all duration-500`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Header */}
        <div className="text-center mb-20 relative">
          {isPleiaTheme && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/40 rounded-full mb-8 backdrop-blur-md">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="text-sm font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                PLEIA Board
              </span>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-8 max-w-4xl mx-auto">
              <div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => onDisplayNameChange(e.target.value)}
                  maxLength={50}
                  className={`w-full text-4xl sm:text-5xl lg:text-6xl font-bold text-center ${currentTheme.inputBg} border-b-2 ${currentTheme.inputBorder} focus:border-green-500 focus:outline-none ${fontClasses[fontTitle]} ${currentTheme.text} pb-3 transition-colors px-2`}
                  style={{ letterSpacing: '-0.02em' }}
                  placeholder="Tu nombre"
                />
                <div className="mt-4">
                  <select
                    value={fontTitle}
                    onChange={(e) => onFontTitleChange(e.target.value)}
                    className={`text-xs ${currentTheme.textSecondary} ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-lg px-3 py-1.5`}
                  >
                    {FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <textarea
                  value={statusText}
                  onChange={(e) => onStatusTextChange(e.target.value)}
                  maxLength={120}
                  className={`w-full text-xl sm:text-2xl lg:text-3xl ${currentTheme.textSecondary} text-center ${currentTheme.inputBg} border-b-2 ${currentTheme.inputBorder} focus:border-green-500 focus:outline-none resize-none ${fontClasses[fontStatus]} pb-3 transition-colors rounded-t-lg px-2`}
                  style={{ lineHeight: '1.5' }}
                  placeholder="Tu frase aquí..."
                  rows={2}
                />
                <div className="mt-4">
                  <select
                    value={fontStatus}
                    onChange={(e) => onFontStatusChange(e.target.value)}
                    className={`text-xs ${currentTheme.textSecondary} ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-lg px-3 py-1.5`}
                  >
                    {FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <h1
                className={`text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 ${fontClasses[fontTitle]} ${currentTheme.accent}`}
                style={{ letterSpacing: '-0.03em', lineHeight: '1.1' }}
              >
                {displayName || 'Tu nombre'}
              </h1>
              {statusText && (
                <p
                  className={`text-2xl sm:text-3xl lg:text-4xl ${currentTheme.textSecondary} max-w-4xl mx-auto ${fontClasses[fontStatus]}`}
                  style={{ lineHeight: '1.4' }}
                >
                  {statusText}
                </p>
              )}
            </>
          )}
        </div>

        {/* Playlists Grid */}
        {playlists.length === 0 ? (
          <div className={`text-center py-24 ${currentTheme.textSecondary}`}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-6 opacity-50">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
            <p className="text-xl font-medium">Aún no hay playlists públicas</p>
            <p className="text-sm mt-2 opacity-60">Asegúrate de que tus playlists tengan la opción &quot;Pública&quot; activada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-20">
            {playlists.map((playlist: any, idx: number) => (
              <PlaylistCard
                key={playlist.playlist_id || playlist.spotify_playlist_id || `playlist-${idx}`}
                playlist={playlist}
                theme={currentTheme}
                isEditing={isEditing}
                onClick={() => isEditing && onPlaylistClick(playlist)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className={`text-center pt-16 border-t ${currentTheme.border}`}>
          <Link
            href="/"
            className={`inline-flex items-center gap-2 text-sm ${currentTheme.textSecondary} hover:opacity-100 transition-opacity font-medium`}
          >
            <span>Made with</span>
            <span className="font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              PLEIA
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function PlaylistCard({ playlist, theme, isEditing, onClick }: any) {
  const playlistName = playlist.playlist_name || playlist.name || 'Sin nombre';
  const coverImage = playlist.preview_tracks?.[0]?.album?.images?.[0]?.url || '/pleia-logo.png';
  const spotifyUrl = playlist.spotify_playlist_url || playlist.url;

  return (
    <div
      className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer ${theme.card} ${isEditing ? 'ring-2 ring-green-500/60' : ''} ${theme.cardHover}`}
      onClick={onClick}
    >
      <div className="aspect-square bg-gray-800 overflow-hidden relative group">
        <img
          src={coverImage}
          alt={playlistName}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {isEditing && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-white text-base font-semibold flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Editar playlist
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className={`font-bold text-lg mb-2 line-clamp-2 ${theme.text}`}>{playlistName}</h3>
        {playlist.mood && (
          <p className={`text-sm mb-4 line-clamp-1 ${theme.textSecondary}`}>{playlist.mood}</p>
        )}
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block w-full px-4 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-xl font-bold text-sm text-center transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            Abrir en Spotify
          </a>
        )}
      </div>
    </div>
  );
}

function PlaylistEditModal({ playlist, onClose, onSave }: any) {
  const [name, setName] = useState(playlist.playlist_name || playlist.name || '');
  const [coverUrl, setCoverUrl] = useState(
    playlist.preview_tracks?.[0]?.album?.images?.[0]?.url || ''
  );
  const [spotifyUrl, setSpotifyUrl] = useState(playlist.spotify_playlist_url || playlist.url || '');

  const handleSave = () => {
    onSave({
      playlist_name: name,
      spotify_playlist_url: spotifyUrl,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-white/20 max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Editar Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="Nombre de la playlist"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">URL de Spotify</label>
            <input
              type="url"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="https://open.spotify.com/playlist/..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">URL de Portada (opcional)</label>
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="https://..."
            />
            {coverUrl && (
              <img
                src={coverUrl}
                alt="Preview"
                className="mt-3 w-full h-40 object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 rounded-xl text-white font-bold transition-colors shadow-lg"
          >
            Guardar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
