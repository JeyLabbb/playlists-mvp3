'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
}

interface Playlist {
  name: string;
  description?: string;
  tracks: Track[];
  coverImage?: string;
}

interface PlaylistPreviewProps {
  playlist: Playlist;
  onUpdate: (playlist: Playlist) => void;
  onCreatePlaylist: () => void;
  isCreating: boolean;
}

export default function PlaylistPreview({ 
  playlist, 
  onUpdate, 
  onCreatePlaylist,
  isCreating 
}: PlaylistPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(playlist.name);
  const [coverImageUrl, setCoverImageUrl] = useState(playlist.coverImage || '');
  const [showImageInput, setShowImageInput] = useState(false);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    const totalMs = playlist.tracks.reduce((sum, track) => sum + track.duration_ms, 0);
    const minutes = Math.floor(totalMs / 60000);
    return `${minutes} min`;
  };

  const handleRemoveTrack = (trackId: string) => {
    const updatedPlaylist = {
      ...playlist,
      tracks: playlist.tracks.filter(track => track.id !== trackId)
    };
    onUpdate(updatedPlaylist);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      onUpdate({ ...playlist, name: editedName });
      setIsEditingName(false);
    }
  };

  const handleSaveCoverImage = () => {
    if (coverImageUrl.trim()) {
      onUpdate({ ...playlist, coverImage: coverImageUrl });
      setShowImageInput(false);
    }
  };

  return (
    <div 
      className="h-full flex flex-col relative overflow-hidden"
      style={{ 
        background: 'radial-gradient(ellipse at top right, rgba(91, 140, 255, 0.1), transparent 50%), var(--color-night)'
      }}
    >
      {/* Subtle animated background */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 animate-pulse" 
        style={{ 
          background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
          animationDuration: '5s'
        }}
      />

      {/* Header con glassmorphism */}
      <div 
        className="relative z-10 p-6 border-b backdrop-blur-sm"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="flex items-start gap-6">
          {/* Cover Image - Premium Design */}
          <div className="relative group flex-shrink-0">
            <div className="w-40 h-40 relative">
              {/* Glow effect */}
              <div 
                className="absolute inset-0 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)' }}
              />
              
              {/* Main cover */}
              <div className="relative w-full h-full rounded-3xl overflow-hidden border-2 shadow-2xl"
                style={{ 
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                {playlist.coverImage || coverImageUrl ? (
                  <Image
                    src={playlist.coverImage || coverImageUrl}
                    alt={playlist.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-5xl relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #47C8D1 0%, #5B8CFF 50%, #7B68EE 100%)' }}
                  >
                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: 'linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.3) 50%, transparent 55%)',
                        backgroundSize: '20px 20px'
                      }}
                    />
                    <span className="relative z-10 filter drop-shadow-lg">🎵</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Edit button - Floating & Metallic */}
            <button
              onClick={() => setShowImageInput(!showImageInput)}
              className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl"
              style={{ 
                background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                boxShadow: '0 10px 30px rgba(71, 200, 209, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Playlist Info - Premium Typography */}
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl backdrop-blur-sm border text-xl font-bold focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: 'var(--color-cloud)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                    fontFamily: 'var(--font-primary)'
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="px-5 py-3 rounded-2xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                    color: 'white',
                    boxShadow: '0 8px 20px rgba(71, 200, 209, 0.4)'
                  }}
                >
                  ✓
                </button>
              </div>
            ) : (
              <h2 
                className="text-3xl font-bold mb-3 cursor-pointer group flex items-center gap-3 transition-all hover:translate-x-1"
                style={{ 
                  color: 'var(--color-cloud)', 
                  fontFamily: 'var(--font-primary)',
                  letterSpacing: '-0.02em'
                }}
                onClick={() => setIsEditingName(true)}
              >
                <span className="truncate">{playlist.name}</span>
                <svg 
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--color-aurora)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </h2>
            )}
            
            {/* Stats con diseño premium */}
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="px-4 py-2 rounded-xl backdrop-blur-sm"
                style={{
                  background: 'rgba(71, 200, 209, 0.1)',
                  border: '1px solid rgba(71, 200, 209, 0.2)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--color-aurora)' }}>
                  {playlist.tracks.length} canciones
                </span>
              </div>
              <div 
                className="px-4 py-2 rounded-xl backdrop-blur-sm"
                style={{
                  background: 'rgba(91, 140, 255, 0.1)',
                  border: '1px solid rgba(91, 140, 255, 0.2)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--color-electric)' }}>
                  {getTotalDuration()}
                </span>
              </div>
            </div>

            {playlist.description && (
              <p 
                className="text-sm leading-relaxed opacity-80"
                style={{ color: 'var(--color-mist)' }}
              >
                {playlist.description}
              </p>
            )}
          </div>
        </div>

        {/* Cover Image Input - Premium Design */}
        {showImageInput && (
          <div 
            className="mt-6 p-5 rounded-3xl backdrop-blur-md border shadow-xl animate-slide-in"
            style={{
              background: 'linear-gradient(135deg, rgba(71, 200, 209, 0.08), rgba(91, 140, 255, 0.08))',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-aurora)' }}>
              🖼️ URL de la imagen de portada
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-3 rounded-2xl backdrop-blur-sm border focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: 'var(--color-cloud)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)'
                }}
              />
              <button
                onClick={handleSaveCoverImage}
                className="px-6 py-3 rounded-2xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(71, 200, 209, 0.4)'
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Create Playlist Button - Ultra Premium */}
        <button
          onClick={onCreatePlaylist}
          disabled={isCreating || playlist.tracks.length === 0}
          className="group relative w-full mt-6 py-4 rounded-3xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #47C8D1 0%, #5B8CFF 50%, #7B68EE 100%)',
            color: 'white',
            boxShadow: '0 20px 60px rgba(71, 200, 209, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Shine effect on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            }}
          />
          
          <div className="relative z-10 flex items-center justify-center gap-3">
            {isCreating ? (
              <>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Creando en Spotify...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>Crear Playlist en Spotify</span>
                {playlist.tracks.length > 0 && (
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-bold"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {playlist.tracks.length}
                  </span>
                )}
              </>
            )}
          </div>
        </button>
      </div>

      {/* Tracks List - Premium Design */}
      <div className="flex-1 overflow-y-auto relative z-10 pleia-scrollbar">
        <div className="p-6">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="group flex items-center justify-between w-full mb-6 p-4 rounded-2xl backdrop-blur-sm border transition-all hover:scale-[1.01]"
            style={{ 
              background: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                  boxShadow: '0 4px 15px rgba(71, 200, 209, 0.3)'
                }}
              >
                <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <span className="text-lg font-semibold" style={{ color: 'var(--color-cloud)' }}>
                Canciones
              </span>
            </div>
            <svg
              className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-aurora)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Tracks Grid */}
          {isExpanded && (
            <div className="space-y-2">
              {playlist.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="group flex items-center gap-4 p-4 rounded-2xl backdrop-blur-sm border transition-all hover:scale-[1.01] hover:shadow-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {/* Track Number */}
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ 
                      background: 'rgba(71, 200, 209, 0.1)',
                      color: 'var(--color-aurora)',
                      border: '1px solid rgba(71, 200, 209, 0.2)'
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Album Art */}
                  <div className="relative w-12 h-12 flex-shrink-0 group/img">
                    <div 
                      className="absolute inset-0 rounded-xl blur-lg opacity-0 group-hover/img:opacity-50 transition-opacity"
                      style={{ background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)' }}
                    />
                    <Image
                      src={track.album?.images?.[0]?.url || '/placeholder-album.png'}
                      alt={track.name}
                      fill
                      className="object-cover rounded-xl relative z-10 shadow-lg"
                      style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    />
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate mb-1" style={{ color: 'var(--color-cloud)' }}>
                      {track.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-mist)' }}>
                      {track.artists.map(a => a.name).join(', ')}
                    </p>
                  </div>

                  {/* Duration */}
                  <span 
                    className="text-xs font-medium px-3 py-1 rounded-lg flex-shrink-0"
                    style={{ 
                      color: 'var(--color-mist)',
                      background: 'rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    {formatDuration(track.duration_ms)}
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveTrack(track.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 p-2 rounded-xl flex-shrink-0"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                    title="Eliminar canción"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

