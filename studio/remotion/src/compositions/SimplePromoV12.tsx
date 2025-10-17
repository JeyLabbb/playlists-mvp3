import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio, Easing } from 'remotion';

interface SimplePromoV12Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV12: React.FC<SimplePromoV12Props> = ({
  headline,
  prompt: initialPrompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const prompt = "Underground español para activarme"; // Prompt específico para demo

  // Timing optimizado: 24 segundos como especificaste
  const scenes = {
    hook: { start: 0, duration: 60 },           // 0:00-0:02 - Hook inicial
    prompt: { start: 60, duration: 120 },       // 0:02-0:06 - Prompt y entrada
    generation: { start: 180, duration: 180 },  // 0:06-0:12 - Generación de canciones
    playlist: { start: 360, duration: 120 },    // 0:12-0:16 - Añadir canciones
    final: { start: 480, duration: 120 },       // 0:16-0:20 - Playlist final
    cta: { start: 600, duration: 120 },         // 0:20-0:24 - CTA y loop
  };

  // Canciones exactas como especificaste
  const exactTracks = [
    { title: 'Do you remember', artist: 'Xiyo & Fernandez', hasAudio: true },
    { title: 'Pa q me escribes', artist: 'Vreno Yg', hasAudio: true },
    { title: 'Suena COOL', artist: 'mvrk & l\'haine', hasAudio: true },
    { title: 'El precio del amor', artist: 'Guxo', hasAudio: false },
    { title: 'Nuevos Deals', artist: 'West SRK', hasAudio: false },
  ];

  // Colores reales de la UI de JeyLabbb (limpios, sin neón)
  const colors = {
    blackBase: '#0B0B0B',
    blackSurface: '#121212',
    grayDark: '#232323',
    textPrimary: '#EDEDED',
    textSecondary: '#B3B3B3',
    spotifyGreen: '#1DB954',
    accentCyan: '#22D3EE',
    overlay: 'rgba(255, 255, 255, 0.04)',
    white: '#FFFFFF',
    lightGray: '#F5F5F7',
  };

  // Easing suaves y naturales
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Componente de logo Spotify real
  const SpotifyLogo = ({ size = 32, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.45c-.2.32-.63.42-.95.22-2.59-1.58-5.84-1.94-9.67-1.06-.37.07-.74-.15-.81-.52-.07-.37.15-.74.52-.81 4.19-.93 7.79-.51 10.7 1.21.32.2.42.63.22.95zm1.29-3c-.25.4-.78.52-1.18.28-2.96-1.82-7.47-2.35-10.97-1.28-.45.14-.93-.12-1.07-.57-.14-.45.12-.93.57-1.07 3.99-1.22 8.89-.63 12.23 1.46.4.25.52.78.28 1.18zm.1-3.05C15.25 8.48 8.87 8.26 5.82 9.31c-.54.16-1.11-.14-1.27-.68-.16-.54.14-1.11.68-1.27 3.56-1.18 10.52-.93 14.12 1.39.47.29.62.93.33 1.4-.29.47-.93.62-1.4.33z"
        fill="#1DB954"
      />
    </svg>
  );

  // Componente de logo JeyLabbb limpio
  const JeyLabbbLogo = ({ size = 36, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ opacity }}>
      <circle cx="16" cy="16" r="16" fill="#22D3EE" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill="#0B0B0B"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
      >
        JL
      </text>
    </svg>
  );

  return (
    <AbsoluteFill style={{ 
      backgroundColor: colors.lightGray, // Fondo claro como especificaste
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif' 
    }}>
      
      {/* Scene 1: Hook inicial (0:00-0:02) - Pantalla casi vacía, fondo claro */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.lightGray} 0%, ${colors.white} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* Logo JeyLabbb discreto en esquina */}
            <div
              style={{
                position: 'absolute',
                top: '40px',
                left: '40px',
                opacity: interpolate(
                  frame - scenes.hook.start,
                  [0, 20],
                  [0, 0.6],
                  { extrapolateRight: 'clamp' }
                ),
                transform: `scale(${interpolate(
                  frame - scenes.hook.start,
                  [0, 20],
                  [0.8, 1],
                  { extrapolateRight: 'clamp' }
                )})`,
              }}
            >
              <JeyLabbbLogo size={32} opacity={0.6} />
            </div>

            {/* Texto principal centrado */}
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '700',
                color: colors.blackBase,
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.2,
                opacity: interpolate(
                  frame - scenes.hook.start,
                  [20, 50],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
                transform: `translateY(${interpolate(
                  frame - scenes.hook.start,
                  [20, 50],
                  [30, 0],
                  { extrapolateRight: 'clamp', easing: easeOutCubic }
                )}px)`,
              }}
            >
              ¡Escribe tu prompt y generamos tu playlist perfecta!
            </h1>

            {/* Transición whoosh al final */}
            {frame >= scenes.hook.start + 45 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(45deg, transparent 0%, ${colors.lightGray} 50%, transparent 100%)`,
                  transform: `translateX(${interpolate(
                    frame - (scenes.hook.start + 45),
                    [0, 15],
                    [-100, 100],
                    { extrapolateRight: 'clamp' }
                  )}%)`,
                  opacity: interpolate(
                    frame - (scenes.hook.start + 45),
                    [0, 15],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              />
            )}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Prompt y entrada del usuario (0:02-0:06) */}
      <Sequence from={scenes.prompt.start} durationInFrames={scenes.prompt.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: colors.lightGray,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* Caja del prompt - UI real ocupando 70% de la pantalla */}
            <div
              style={{
                width: '70%',
                maxWidth: '600px',
                background: colors.white,
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid rgba(0,0,0,0.08)',
                transform: `scale(${interpolate(
                  frame - scenes.prompt.start,
                  [0, 30],
                  [0.3, 1],
                  { extrapolateRight: 'clamp', easing: easeOutCubic }
                )})`,
                opacity: interpolate(
                  frame - scenes.prompt.start,
                  [0, 30],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              {/* Título */}
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '600',
                  color: colors.blackBase,
                  marginBottom: '24px',
                  opacity: interpolate(
                    frame - scenes.prompt.start,
                    [30, 50],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                ¿Qué quieres escuchar?
              </h2>
              
              {/* Textarea del prompt */}
              <textarea
                rows={3}
                value={prompt.slice(0, Math.floor(interpolate(
                  frame - scenes.prompt.start,
                  [60, 120],
                  [0, prompt.length],
                  { extrapolateRight: 'clamp' }
                )))}
                style={{
                  width: '100%',
                  background: colors.white,
                  border: '2px solid #E5E5E7',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: colors.blackBase,
                  fontSize: '18px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  marginBottom: '20px',
                  opacity: interpolate(
                    frame - scenes.prompt.start,
                    [50, 70],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
                readOnly
              />
              
              {/* Cursor parpadeante */}
              <div
                style={{
                  position: 'absolute',
                  right: '52px',
                  bottom: '88px',
                  width: '2px',
                  height: '24px',
                  backgroundColor: colors.accentCyan,
                  opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                  transition: 'opacity 0.1s',
                }}
              />

              {/* Botón de envío */}
              <button
                style={{
                  background: colors.spotifyGreen,
                  color: 'white',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '14px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  opacity: interpolate(
                    frame - scenes.prompt.start,
                    [90, 120],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.prompt.start,
                    [90, 120],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Generar Playlist
              </button>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Generación de canciones (0:06-0:12) */}
      <Sequence from={scenes.generation.start} durationInFrames={scenes.generation.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: colors.lightGray,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* Contenedor de resultados */}
            <div
              style={{
                width: '85%',
                maxWidth: '700px',
                background: colors.white,
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
                transform: `scale(${interpolate(
                  frame - scenes.generation.start,
                  [0, 30],
                  [0.9, 1],
                  { extrapolateRight: 'clamp', easing: easeOutCubic }
                )})`,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px',
                  opacity: interpolate(
                    frame - scenes.generation.start,
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <JeyLabbbLogo size={32} opacity={1} />
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: colors.blackBase,
                    margin: 0,
                  }}
                >
                  Tu playlist generada
                </h3>
              </div>

              {/* Lista de canciones */}
              <div style={{ maxHeight: '60vh', overflow: 'hidden' }}>
                {exactTracks.map((track, index) => {
                  const trackStart = scenes.generation.start + (index * 36); // 3 segundos cada una
                  const trackProgress = frame - trackStart;
                  const isActive = trackProgress >= 0 && trackProgress < 90; // 3 segundos
                  const isPlaying = trackProgress >= 20 && trackProgress < 70; // 1.7s de preview
                  
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '16px 0',
                        borderBottom: index < exactTracks.length - 1 ? '1px solid #E5E5E7' : 'none',
                        backgroundColor: isActive ? 'rgba(29, 185, 84, 0.05)' : 'transparent',
                        borderRadius: '12px',
                        padding: isActive ? '20px 16px' : '16px 0',
                        transform: isActive ? `scale(1.02) translateY(-2px)` : `scale(1) translateY(0px)`,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        boxShadow: isActive ? '0 4px 16px rgba(29, 185, 84, 0.1)' : 'none',
                      }}
                    >
                      {/* Indicador de reproducción */}
                      {isPlaying && track.hasAudio && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            width: '32px',
                            height: '32px',
                            backgroundColor: colors.spotifyGreen,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: 'white',
                            animation: 'pulse 0.8s infinite',
                            transform: `scale(${interpolate(
                              trackProgress,
                              [20, 40],
                              [0.8, 1.1],
                              { extrapolateRight: 'clamp' }
                            )})`,
                          }}
                        >
                          ▶
                        </div>
                      )}
                      
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          color: colors.blackBase,
                          marginBottom: '4px',
                          opacity: interpolate(
                            trackProgress,
                            [0, 20],
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          color: '#6B7280',
                          fontWeight: '500',
                          opacity: interpolate(
                            trackProgress,
                            [0, 20],
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Añadir canciones a playlist (0:12-0:16) */}
      <Sequence from={scenes.playlist.start} durationInFrames={scenes.playlist.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: colors.lightGray,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '85%',
                maxWidth: '700px',
                background: colors.white,
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
                transform: `scale(${interpolate(
                  frame - scenes.playlist.start,
                  [0, 20],
                  [0.95, 1],
                  { extrapolateRight: 'clamp' }
                )})`,
              }}
            >
              <h3
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: colors.blackBase,
                  marginBottom: '24px',
                  opacity: interpolate(
                    frame - scenes.playlist.start,
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                Selecciona canciones para tu playlist
              </h3>

              {/* Lista con selección */}
              <div>
                {exactTracks.slice(0, 3).map((track, index) => {
                  const selectStart = scenes.playlist.start + (index * 20);
                  const isSelected = frame >= selectStart + 10;
                  
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '16px 0',
                        borderBottom: index < 2 ? '1px solid #E5E5E7' : 'none',
                        backgroundColor: isSelected ? 'rgba(29, 185, 84, 0.1)' : 'transparent',
                        borderRadius: '12px',
                        padding: isSelected ? '20px 16px' : '16px 0',
                        transform: isSelected ? `scale(1.02)` : `scale(1)`,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            width: '24px',
                            height: '24px',
                            backgroundColor: colors.spotifyGreen,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            color: 'white',
                          }}
                        >
                          ✓
                        </div>
                      )}
                      
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          color: colors.blackBase,
                          marginBottom: '4px',
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          color: '#6B7280',
                          fontWeight: '500',
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón crear playlist */}
              <div
                style={{
                  marginTop: '32px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.playlist.start,
                    [60, 90],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <button
                  style={{
                    background: colors.spotifyGreen,
                    color: 'white',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '16px 40px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '0 auto',
                    boxShadow: '0 4px 16px rgba(29, 185, 84, 0.3)',
                  }}
                >
                  <SpotifyLogo size={24} opacity={1} />
                  Añadir a Spotify
                </button>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Playlist final y otras recomendaciones (0:16-0:20) */}
      <Sequence from={scenes.final.start} durationInFrames={scenes.final.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: colors.lightGray,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '85%',
                maxWidth: '700px',
                background: colors.white,
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <h3
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: colors.blackBase,
                  marginBottom: '24px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.final.start,
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                🎉 ¡Playlist creada exitosamente!
              </h3>

              {/* Playlists sugeridas */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                {[
                  { name: 'Underground Español', tracks: 12, color: colors.spotifyGreen },
                  { name: 'Música para Trabajar', tracks: 8, color: colors.accentCyan },
                  { name: 'Lo Mejor del Rap', tracks: 15, color: '#FF6B35' },
                ].map((playlist, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '20px',
                      textAlign: 'center',
                      border: '1px solid #E5E5E7',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      transform: `translateY(${interpolate(
                        frame - scenes.final.start,
                        [index * 15, (index * 15) + 20],
                        [20, 0],
                        { extrapolateRight: 'clamp' }
                      )}px)`,
                      opacity: interpolate(
                        frame - scenes.final.start,
                        [index * 15, (index * 15) + 20],
                        [0, 1],
                        { extrapolateRight: 'clamp' }
                      ),
                    }}
                  >
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: playlist.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        margin: '0 auto 12px auto',
                        boxShadow: `0 4px 12px ${playlist.color}40`,
                      }}
                    >
                      🎵
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: colors.blackBase,
                        marginBottom: '4px',
                      }}
                    >
                      {playlist.name}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: '#6B7280',
                      }}
                    >
                      {playlist.tracks} canciones
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmación con logo Spotify */}
              <div
                style={{
                  marginTop: '24px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.final.start,
                    [60, 90],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '16px',
                    color: colors.blackBase,
                    fontWeight: '500',
                  }}
                >
                  <SpotifyLogo size={20} opacity={1} />
                  Abriendo en Spotify...
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: CTA final y loop (0:20-0:24) */}
      <Sequence from={scenes.cta.start} durationInFrames={scenes.cta.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.lightGray} 0%, ${colors.white} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* CTA principal */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '40px',
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
                opacity: interpolate(
                  frame - scenes.cta.start,
                  [0, 20],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  color: colors.blackBase,
                  margin: 0,
                  marginBottom: '16px',
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [0, 20],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                ¿Listo para tu playlist?
              </h2>
              <div
                style={{
                  fontSize: '28px',
                  color: colors.accentCyan,
                  fontWeight: '600',
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [10, 30],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                  opacity: interpolate(
                    frame - scenes.cta.start,
                    [10, 30],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                Pruébalo ya 👇
              </div>
            </div>

            {/* Enlace clickeable */}
            <div
              style={{
                position: 'relative',
                opacity: interpolate(
                  frame - scenes.cta.start,
                  [30, 50],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  color: colors.spotifyGreen,
                  fontWeight: '600',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '16px 32px',
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  border: '2px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                playlists.jeylabbb.com
              </div>

              {/* Cursor animado */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(${interpolate(
                    frame - scenes.cta.start,
                    [60, 90],
                    [0, -100],
                    { extrapolateRight: 'clamp' }
                  )}px, ${interpolate(
                    frame - scenes.cta.start,
                    [60, 90],
                    [0, -50],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: colors.accentCyan,
                    borderRadius: '50%',
                    boxShadow: `0 0 12px rgba(34, 211, 238, 0.6)`,
                    opacity: interpolate(
                      frame - scenes.cta.start,
                      [60, 75],
                      [0, 1],
                      { extrapolateRight: 'clamp' }
                    ),
                  }}
                />
              </div>

              {/* Efecto de click */}
              {frame >= scenes.cta.start + 90 && frame < scenes.cta.start + 100 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '30px',
                    height: '30px',
                    border: `2px solid ${colors.accentCyan}`,
                    borderRadius: '50%',
                    opacity: interpolate(
                      frame - (scenes.cta.start + 90),
                      [0, 10],
                      [1, 0],
                      { extrapolateRight: 'clamp' }
                    ),
                    transform: `translate(-50%, -50%) scale(${interpolate(
                      frame - (scenes.cta.start + 90),
                      [0, 10],
                      [0, 2],
                      { extrapolateRight: 'clamp' }
                    )})`,
                  }}
                />
              )}
            </div>

            {/* Carga rápida */}
            {frame >= scenes.cta.start + 100 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: colors.white,
                  opacity: interpolate(
                    frame - (scenes.cta.start + 100),
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              />
            )}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </AbsoluteFill>
  );
};
