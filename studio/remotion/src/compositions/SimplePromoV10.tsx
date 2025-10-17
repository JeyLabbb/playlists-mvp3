import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio, Easing } from 'remotion';

interface SimplePromoV10Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV10: React.FC<SimplePromoV10Props> = ({
  headline,
  prompt: initialPrompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const prompt = "playlist underground español para activarme"; // Prompt específico para demo

  // Timing optimizado: 20 segundos con pausas de 3s por canción
  const scenes = {
    hook: { start: 0, duration: 45 },        // 0:00-0:01.5 - Hook más rápido
    typing: { start: 45, duration: 45 },     // 0:01.5-0:03 - Escribir más rápido
    generating: { start: 90, duration: 30 }, // 0:03-0:04 - Generación más rápida
    preview: { start: 120, duration: 180 },  // 0:04-0:10 - 6 canciones x 3s cada una
    spotify: { start: 300, duration: 60 },   // 0:10-0:12 - Spotify más rápido
    explore: { start: 360, duration: 60 },   // 0:12-0:14 - Mis Playlists más rápido
    cta: { start: 420, duration: 60 },       // 0:14-0:16 - CTA más rápido
    loop: { start: 480, duration: 120 },     // 0:16-0:20 - Loop perfecto
  };

  // Canciones exactas con timing de 3 segundos cada una
  const exactTracks = [
    { title: 'Do you remember', artist: 'Xiyo & Fernandez', hasAudio: true, duration: 90 }, // 3s = 90 frames
    { title: 'Pa q me escribes', artist: 'Vreno Yg', hasAudio: true, duration: 90 },
    { title: 'Suena COOL', artist: 'mvrk & L\'haine', hasAudio: true, duration: 90 },
    { title: 'El precio del amor', artist: 'Guxo', hasAudio: false, duration: 90 },
    { title: 'Nuevos Deals', artist: 'West SRK', hasAudio: false, duration: 90 },
  ];

  // Easing functions más agresivos para movimientos más rápidos
  const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
  const easeInOutQuart = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

  // Colores reales de la app
  const colors = {
    blackBase: '#0B0B0B',
    blackSurface: '#121212',
    grayDark: '#232323',
    textPrimary: '#EDEDED',
    textSecondary: '#B3B3B3',
    spotifyGreen: '#1DB954',
    accentCyan: '#22D3EE',
    overlay: 'rgba(255, 255, 255, 0.04)',
  };

  // Componente de logo Spotify SVG más grande
  const SpotifyLogo = ({ size = 40, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.45c-.2.32-.63.42-.95.22-2.59-1.58-5.84-1.94-9.67-1.06-.37.07-.74-.15-.81-.52-.07-.37.15-.74.52-.81 4.19-.93 7.79-.51 10.7 1.21.32.2.42.63.22.95zm1.29-3c-.25.4-.78.52-1.18.28-2.96-1.82-7.47-2.35-10.97-1.28-.45.14-.93-.12-1.07-.57-.14-.45.12-.93.57-1.07 3.99-1.22 8.89-.63 12.23 1.46.4.25.52.78.28 1.18zm.1-3.05C15.25 8.48 8.87 8.26 5.82 9.31c-.54.16-1.11-.14-1.27-.68-.16-.54.14-1.11.68-1.27 3.56-1.18 10.52-.93 14.12 1.39.47.29.62.93.33 1.4-.29.47-.93.62-1.4.33z"
        fill="#1DB954"
      />
    </svg>
  );

  // Componente de logo JeyLabbb SVG más grande
  const JeyLabbbLogo = ({ size = 48, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ opacity }}>
      <circle cx="16" cy="16" r="16" fill="#22D3EE" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#0B0B0B"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
      >
        JL
      </text>
    </svg>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.blackBase, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Scene 1: Hook dramático más rápido y grande (0:00-0:01.5) */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px', // Menos padding para más espacio
            }}
          >
            {/* Caja de prompt MUCHO más grande */}
            <div
              style={{
                width: '95%', // Casi toda la pantalla
                height: '200px', // Más alta
                backgroundColor: colors.blackSurface,
                borderRadius: '24px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                padding: '40px', // Más padding interno
                transform: `scale(${interpolate(
                  frame - scenes.hook.start,
                  [0, scenes.hook.duration],
                  [0.3, 1.2], // Zoom más dramático
                  { extrapolateRight: 'clamp', easing: easeOutQuart }
                )})`,
                opacity: interpolate(
                  frame - scenes.hook.start,
                  [0, 20],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '36px', // Más grande
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '30px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.hook.start,
                    [20, 45],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.hook.start,
                    [20, 45],
                    [30, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Escribe tu prompt y crea tu playlist personalizada
              </h2>
              
              <textarea
                rows={3}
                placeholder="Ej: playlist underground español para activarme"
                style={{
                  width: '100%',
                  height: '80px', // Más alto
                  backgroundColor: colors.blackSurface,
                  border: `2px solid ${colors.grayDark}`,
                  borderRadius: '16px',
                  padding: '20px 24px', // Más padding
                  color: colors.textPrimary,
                  fontSize: '24px', // Más grande
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  opacity: interpolate(
                    frame - scenes.hook.start,
                    [30, 45],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.hook.start,
                    [30, 45],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
                readOnly
              />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Escribir prompt más rápido y grande (0:01.5-0:03) */}
      <Sequence from={scenes.typing.start} durationInFrames={scenes.typing.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '95%',
                height: '200px',
                backgroundColor: colors.blackSurface,
                borderRadius: '24px',
                border: `3px solid ${colors.accentCyan}`, // Borde más grueso
                boxShadow: `0 12px 48px rgba(34, 211, 238, 0.3)`,
                padding: '40px',
                transform: 'scale(1.3)', // Zoom más agresivo
              }}
            >
              <h2
                style={{
                  fontSize: '36px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '30px',
                  textAlign: 'center',
                }}
              >
                Escribe tu prompt y crea tu playlist personalizada
              </h2>
              
              <textarea
                rows={3}
                value={prompt.slice(0, Math.floor(interpolate(
                  frame - scenes.typing.start,
                  [0, scenes.typing.duration],
                  [0, prompt.length],
                  { extrapolateRight: 'clamp' }
                )))}
                style={{
                  width: '100%',
                  height: '80px',
                  backgroundColor: colors.blackSurface,
                  border: `3px solid ${colors.accentCyan}`,
                  borderRadius: '16px',
                  padding: '20px 24px',
                  color: colors.textPrimary,
                  fontSize: '24px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  boxShadow: `0 0 0 4px rgba(34, 211, 238, 0.3)`,
                }}
                readOnly
              />
              
              {/* Cursor parpadeante más grande */}
              <div
                style={{
                  position: 'absolute',
                  right: '64px',
                  bottom: '60px',
                  width: '3px',
                  height: '32px',
                  backgroundColor: colors.accentCyan,
                  opacity: Math.sin(frame * 0.4) > 0 ? 1 : 0, // Parpadeo más rápido
                  transition: 'opacity 0.05s',
                }}
              />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Generación más rápida (0:03-0:04) */}
      <Sequence from={scenes.generating.start} durationInFrames={scenes.generating.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '95%',
                height: '200px',
                backgroundColor: colors.blackSurface,
                borderRadius: '24px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                padding: '40px',
                transform: `scale(${interpolate(
                  frame - scenes.generating.start,
                  [0, scenes.generating.duration],
                  [1.3, 0.9], // Zoom out más rápido
                  { extrapolateRight: 'clamp', easing: easeInOutQuart }
                )})`,
              }}
            >
              {/* Loading indicator más grande */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '30px',
                  opacity: interpolate(
                    frame - scenes.generating.start,
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <div
                  style={{
                    width: '80px', // Más grande
                    height: '80px',
                    border: `4px solid ${colors.grayDark}`,
                    borderTop: `4px solid ${colors.spotifyGreen}`,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', // Más rápido
                  }}
                />
                <p
                  style={{
                    fontSize: '28px', // Más grande
                    color: colors.textPrimary,
                    fontWeight: '600',
                    margin: 0,
                  }}
                >
                  Generando tu playlist...
                </p>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Preview de canciones con 3 segundos cada una (0:04-0:10) */}
      <Sequence from={scenes.preview.start} durationInFrames={scenes.preview.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '95%',
                height: '90%', // Casi toda la altura
                backgroundColor: colors.blackSurface,
                borderRadius: '24px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                overflow: 'hidden',
              }}
            >
              {/* Header con logo JeyLabbb más grande */}
              <div
                style={{
                  padding: '30px 40px 20px 40px', // Más padding
                  borderBottom: `2px solid ${colors.grayDark}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  opacity: interpolate(
                    frame - scenes.preview.start,
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.preview.start,
                    [0, 20],
                    [30, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                <JeyLabbbLogo size={48} opacity={1} />
                <h3
                  style={{
                    fontSize: '32px', // Más grande
                    fontWeight: '600',
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  🎵 Tu playlist generada
                </h3>
              </div>
              
              {/* Lista de canciones con preview de 3 segundos cada una */}
              <div style={{ padding: '20px 40px 40px 40px', height: 'calc(100% - 120px)', overflow: 'hidden' }}>
                {exactTracks.map((track, index) => {
                  const trackStart = scenes.preview.start + (index * 90); // 90 frames = 3 segundos
                  const trackProgress = frame - trackStart;
                  const isActive = trackProgress >= 0 && trackProgress < 90;
                  const isPlaying = trackProgress >= 20 && trackProgress < 70; // 1.7s de preview
                  
                  return (
                    <div
                      key={index}
                      style={{
                        borderBottom: index < exactTracks.length - 1 ? `2px solid ${colors.grayDark}` : 'none',
                        backgroundColor: isActive ? colors.overlay : 'transparent',
                        borderRadius: '16px',
                        padding: isActive ? '25px 30px' : '20px 0',
                        transform: isActive ? `scale(1.05) translateY(-5px)` : `scale(1) translateY(0px)`,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', // Más rápido
                        position: 'relative',
                        boxShadow: isActive ? `0 8px 24px rgba(34, 211, 238, 0.2)` : 'none',
                        height: '120px', // Altura fija para cada canción
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        opacity: isActive ? 1 : 0.3,
                      }}
                    >
                      {/* Indicador de reproducción más grande */}
                      {isPlaying && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '15px',
                            right: '30px',
                            width: '50px', // Más grande
                            height: '50px',
                            backgroundColor: colors.spotifyGreen,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px', // Más grande
                            color: 'white',
                            animation: 'pulse 0.8s infinite',
                            transform: `scale(${interpolate(
                              trackProgress,
                              [20, 40],
                              [0.8, 1.1],
                              { extrapolateRight: 'clamp' }
                            )}) rotate(${interpolate(
                              trackProgress,
                              [20, 40],
                              [0, 360],
                              { extrapolateRight: 'clamp' }
                            )}deg)`,
                            boxShadow: `0 0 20px rgba(29, 185, 84, 0.5)`,
                          }}
                        >
                          ▶
                        </div>
                      )}
                      
                      <div
                        style={{
                          fontSize: '28px', // Más grande
                          fontWeight: '700',
                          color: colors.textPrimary,
                          marginBottom: '8px',
                          transform: `translateY(${interpolate(
                            trackProgress,
                            [0, 20],
                            [30, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
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
                          fontSize: '22px', // Más grande
                          color: colors.textSecondary,
                          fontWeight: '500',
                          transform: `translateY(${interpolate(
                            trackProgress,
                            [0, 20],
                            [30, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
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

      {/* Scene 5: Añadir a Spotify más rápido y grande (0:10-0:12) */}
      <Sequence from={scenes.spotify.start} durationInFrames={scenes.spotify.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '95%',
                height: '300px', // Más alto
                backgroundColor: colors.blackSurface,
                borderRadius: '24px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                padding: '50px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Botón Añadir a Spotify MÁS GRANDE */}
              <button
                style={{
                  width: '80%',
                  height: '100px', // Más alto
                  backgroundColor: colors.spotifyGreen,
                  color: 'white',
                  border: 'none',
                  borderRadius: '24px',
                  fontSize: '28px', // Más grande
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '20px',
                  boxShadow: `0 12px 32px rgba(29, 185, 84, 0.4)`,
                  transform: `scale(${spring({
                    frame: frame - scenes.spotify.start,
                    fps,
                    config: { damping: 300, stiffness: 300 }, // Más rápido
                  })}) translateY(${interpolate(
                    frame - scenes.spotify.start,
                    [0, 20],
                    [30, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                  opacity: interpolate(
                    frame - scenes.spotify.start,
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <SpotifyLogo size={40} opacity={1} />
                Añadir a Spotify
              </button>
              
              {/* Mensaje de confirmación más grande */}
              <div
                style={{
                  marginTop: '30px',
                  fontSize: '24px', // Más grande
                  color: colors.textPrimary,
                  fontWeight: '600',
                  opacity: interpolate(
                    frame - scenes.spotify.start,
                    [30, 50],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.spotify.start,
                    [30, 50],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                ✅ Playlist creada con éxito
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: Mis Playlists más rápido (0:12-0:14) */}
      <Sequence from={scenes.explore.start} durationInFrames={scenes.explore.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '95%',
                height: '90%',
                backgroundColor: colors.blackSurface,
                borderRadius: '24px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                transform: `scale(${interpolate(
                  frame - scenes.explore.start,
                  [0, scenes.explore.duration],
                  [0.9, 1.0],
                  { extrapolateRight: 'clamp', easing: easeOutQuart }
                )})`,
              }}
            >
              {/* Header con logo JeyLabbb más grande */}
              <div
                style={{
                  padding: '30px 40px 20px 40px',
                  borderBottom: `2px solid ${colors.grayDark}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  opacity: interpolate(
                    frame - scenes.explore.start,
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.explore.start,
                    [0, 20],
                    [30, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                <JeyLabbbLogo size={48} opacity={1} />
                <h3
                  style={{
                    fontSize: '32px',
                    fontWeight: '600',
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  🎧 Mis Playlists
                </h3>
              </div>
              
              {/* Lista de playlists más grande */}
              <div style={{ padding: '20px 40px 40px 40px' }}>
                {[
                  { name: 'Underground Español', tracks: 12, color: colors.spotifyGreen },
                  { name: 'Música para Trabajar', tracks: 8, color: colors.accentCyan },
                  { name: 'Lo Mejor del Rap', tracks: 15, color: '#FF6B35' },
                ].map((playlist, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '20px 0',
                      borderBottom: index < 2 ? `2px solid ${colors.grayDark}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '25px',
                      height: '100px', // Altura fija
                      transform: `translateX(${interpolate(
                        frame - scenes.explore.start,
                        [index * 15, (index * 15) + 25],
                        [60, 0],
                        { extrapolateRight: 'clamp' }
                      )}px) scale(${interpolate(
                        frame - scenes.explore.start,
                        [index * 15, (index * 15) + 25],
                        [0.9, 1],
                        { extrapolateRight: 'clamp' }
                      )})`,
                      opacity: interpolate(
                        frame - scenes.explore.start,
                        [index * 15, (index * 15) + 25],
                        [0, 1],
                        { extrapolateRight: 'clamp' }
                      ),
                    }}
                  >
                    <div
                      style={{
                        width: '80px', // Más grande
                        height: '80px',
                        borderRadius: '16px',
                        backgroundColor: playlist.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px', // Más grande
                        boxShadow: `0 8px 20px ${playlist.color}50`,
                        transform: `scale(${interpolate(
                          frame - scenes.explore.start,
                          [index * 15, (index * 15) + 25],
                          [0.8, 1],
                          { extrapolateRight: 'clamp' }
                        )}) rotate(${interpolate(
                          frame - scenes.explore.start,
                          [index * 15, (index * 15) + 25],
                          [180, 0],
                          { extrapolateRight: 'clamp' }
                        )}deg)`,
                      }}
                    >
                      🎵
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '24px', // Más grande
                          fontWeight: '700',
                          color: colors.textPrimary,
                          marginBottom: '6px',
                          transform: `translateY(${interpolate(
                            frame - scenes.explore.start,
                            [index * 15, (index * 15) + 25],
                            [15, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.explore.start,
                            [index * 15, (index * 15) + 25],
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                        }}
                      >
                        {playlist.name}
                      </div>
                      <div
                        style={{
                          fontSize: '20px', // Más grande
                          color: colors.textSecondary,
                          fontWeight: '500',
                          transform: `translateY(${interpolate(
                            frame - scenes.explore.start,
                            [index * 15, (index * 15) + 25],
                            [15, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.explore.start,
                            [index * 15, (index * 15) + 25],
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                        }}
                      >
                        {playlist.tracks} canciones
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 7: CTA más rápido y grande (0:14-0:16) */}
      <Sequence from={scenes.cta.start} durationInFrames={scenes.cta.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            {/* CTA Principal más grande */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '50px',
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start,
                  fps,
                  config: { damping: 300, stiffness: 300 }, // Más rápido
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
                  fontSize: '64px', // Mucho más grande
                  fontWeight: 'bold',
                  color: colors.textPrimary,
                  margin: 0,
                  marginBottom: '20px',
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [0, 20],
                    [30, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Pruébalo ahora
              </h2>
              <div
                style={{
                  fontSize: '36px', // Más grande
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
                playlists.jeylabbb.com
              </div>
            </div>

            {/* Cursor animado más grande */}
            <div
              style={{
                position: 'relative',
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start - 20,
                  fps,
                  config: { damping: 300, stiffness: 300 },
                })})`,
              }}
            >
              <div
                style={{
                  width: '32px', // Más grande
                  height: '32px',
                  backgroundColor: colors.accentCyan,
                  borderRadius: '50%',
                  boxShadow: `0 0 20px rgba(34, 211, 238, 0.8)`,
                  opacity: interpolate(
                    frame - scenes.cta.start,
                    [20, 35],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [20, 35],
                    [15, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 8: Loop perfecto (0:16-0:20) */}
      <Sequence from={scenes.loop.start} durationInFrames={scenes.loop.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            {/* Volver al hook inicial */}
            <div
              style={{
                width: '95%',
                height: '200px',
                backgroundColor: colors.blackSurface,
                borderRadius: '24px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                padding: '40px',
                transform: `scale(${interpolate(
                  frame - scenes.loop.start,
                  [0, scenes.loop.duration],
                  [0.3, 1.2],
                  { extrapolateRight: 'clamp', easing: easeOutQuart }
                )})`,
                opacity: interpolate(
                  frame - scenes.loop.start,
                  [0, 30],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '36px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '30px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.loop.start,
                    [30, 60],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.loop.start,
                    [30, 60],
                    [30, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Escribe tu prompt y crea tu playlist personalizada
              </h2>
              
              <textarea
                rows={3}
                placeholder="Ej: playlist underground español para activarme"
                style={{
                  width: '100%',
                  height: '80px',
                  backgroundColor: colors.blackSurface,
                  border: `2px solid ${colors.grayDark}`,
                  borderRadius: '16px',
                  padding: '20px 24px',
                  color: colors.textPrimary,
                  fontSize: '24px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  opacity: interpolate(
                    frame - scenes.loop.start,
                    [60, 90],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.loop.start,
                    [60, 90],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
                readOnly
              />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </AbsoluteFill>
  );
};
