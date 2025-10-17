import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio, Easing } from 'remotion';

interface SimplePromoV11Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV11: React.FC<SimplePromoV11Props> = ({
  headline,
  prompt: initialPrompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const prompt = "playlist underground español para activarme"; // Prompt específico para demo

  // Timing optimizado: 18 segundos más rápido
  const scenes = {
    hook: { start: 0, duration: 36 },        // 0:00-0:01.2 - Hook más rápido
    typing: { start: 36, duration: 36 },     // 0:01.2-0:02.4 - Escribir más rápido
    generating: { start: 72, duration: 24 }, // 0:02.4-0:03.2 - Generación más rápida
    preview: { start: 96, duration: 144 },   // 0:03.2-0:08 - 3 canciones x 3s + 2 sin pausa
    spotify: { start: 240, duration: 48 },   // 0:08-0:09.6 - Spotify más rápido
    explore: { start: 288, duration: 48 },   // 0:09.6-0:11.2 - Mis Playlists más rápido
    cta: { start: 336, duration: 48 },       // 0:11.2-0:12.8 - CTA más rápido
    click: { start: 384, duration: 72 },     // 0:12.8-0:15.2 - Click en link y transición
    loop: { start: 456, duration: 84 },      // 0:15.2-0:18 - Vuelta al inicio
  };

  // Canciones exactas - solo las 3 primeras tienen pausa de 3 segundos
  const exactTracks = [
    { title: 'Do you remember', artist: 'Xiyo & Fernandez', hasAudio: true, hasPause: true },
    { title: 'Pa q me escribes', artist: 'Vreno Yg', hasAudio: true, hasPause: true },
    { title: 'Suena COOL', artist: 'mvrk & L\'haine', hasAudio: true, hasPause: true },
    { title: 'El precio del amor', artist: 'Guxo', hasAudio: false, hasPause: false },
    { title: 'Nuevos Deals', artist: 'West SRK', hasAudio: false, hasPause: false },
  ];

  // Easing functions más agresivos
  const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
  const easeInOutQuart = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

  // Colores más llamativos y estéticos
  const colors = {
    blackBase: '#0A0A0A',
    blackSurface: '#1A1A1A',
    grayDark: '#2A2A2A',
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    spotifyGreen: '#1ED760',
    accentCyan: '#00E5FF',
    overlay: 'rgba(255, 255, 255, 0.08)',
    gradientStart: '#1A1A1A',
    gradientEnd: '#2A2A2A',
  };

  // Componente de logo Spotify SVG más estético
  const SpotifyLogo = ({ size = 36, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.45c-.2.32-.63.42-.95.22-2.59-1.58-5.84-1.94-9.67-1.06-.37.07-.74-.15-.81-.52-.07-.37.15-.74.52-.81 4.19-.93 7.79-.51 10.7 1.21.32.2.42.63.22.95zm1.29-3c-.25.4-.78.52-1.18.28-2.96-1.82-7.47-2.35-10.97-1.28-.45.14-.93-.12-1.07-.57-.14-.45.12-.93.57-1.07 3.99-1.22 8.89-.63 12.23 1.46.4.25.52.78.28 1.18zm.1-3.05C15.25 8.48 8.87 8.26 5.82 9.31c-.54.16-1.11-.14-1.27-.68-.16-.54.14-1.11.68-1.27 3.56-1.18 10.52-.93 14.12 1.39.47.29.62.93.33 1.4-.29.47-.93.62-1.4.33z"
        fill="#1ED760"
      />
    </svg>
  );

  // Componente de logo JeyLabbb SVG más estético
  const JeyLabbbLogo = ({ size = 40, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ opacity }}>
      <circle cx="16" cy="16" r="16" fill="url(#gradient)" />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#00BFFF" />
        </linearGradient>
      </defs>
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill="#0A0A0A"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
      >
        JL
      </text>
    </svg>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.blackBase, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Scene 1: Hook dramático más rápido y mejor encuadrado (0:00-0:01.2) */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px', // Márgenes adecuados
            }}
          >
            {/* Caja de prompt con márgenes correctos */}
            <div
              style={{
                width: '90%', // 90% para márgenes adecuados
                height: '160px',
                background: `linear-gradient(135deg, ${colors.blackSurface} 0%, ${colors.gradientEnd} 100%)`,
                borderRadius: '20px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
                padding: '32px',
                transform: `scale(${interpolate(
                  frame - scenes.hook.start,
                  [0, scenes.hook.duration],
                  [0.4, 1.1],
                  { extrapolateRight: 'clamp', easing: easeOutQuart }
                )})`,
                opacity: interpolate(
                  frame - scenes.hook.start,
                  [0, 24],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: colors.textPrimary,
                  marginBottom: '24px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.hook.start,
                    [24, 36],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.hook.start,
                    [24, 36],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Escribe tu prompt y crea tu playlist personalizada
              </h2>
              
              <textarea
                rows={2}
                placeholder="Ej: playlist underground español para activarme"
                style={{
                  width: '100%',
                  height: '60px',
                  background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientStart} 100%)`,
                  border: `2px solid ${colors.grayDark}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: colors.textPrimary,
                  fontSize: '20px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  opacity: interpolate(
                    frame - scenes.hook.start,
                    [30, 36],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.hook.start,
                    [30, 36],
                    [15, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
                readOnly
              />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Escribir prompt más rápido (0:01.2-0:02.4) */}
      <Sequence from={scenes.typing.start} durationInFrames={scenes.typing.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            <div
              style={{
                width: '90%',
                height: '160px',
                background: `linear-gradient(135deg, ${colors.blackSurface} 0%, ${colors.gradientEnd} 100%)`,
                borderRadius: '20px',
                border: `3px solid ${colors.accentCyan}`,
                boxShadow: `0 16px 64px rgba(0, 229, 255, 0.4)`,
                padding: '32px',
                transform: 'scale(1.2)',
              }}
            >
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: colors.textPrimary,
                  marginBottom: '24px',
                  textAlign: 'center',
                }}
              >
                Escribe tu prompt y crea tu playlist personalizada
              </h2>
              
              <textarea
                rows={2}
                value={prompt.slice(0, Math.floor(interpolate(
                  frame - scenes.typing.start,
                  [0, scenes.typing.duration],
                  [0, prompt.length],
                  { extrapolateRight: 'clamp' }
                )))}
                style={{
                  width: '100%',
                  height: '60px',
                  background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientStart} 100%)`,
                  border: `3px solid ${colors.accentCyan}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: colors.textPrimary,
                  fontSize: '20px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  boxShadow: `0 0 0 4px rgba(0, 229, 255, 0.3)`,
                }}
                readOnly
              />
              
              {/* Cursor parpadeante más rápido */}
              <div
                style={{
                  position: 'absolute',
                  right: '52px',
                  bottom: '48px',
                  width: '3px',
                  height: '28px',
                  backgroundColor: colors.accentCyan,
                  opacity: Math.sin(frame * 0.5) > 0 ? 1 : 0,
                  transition: 'opacity 0.05s',
                }}
              />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Generación más rápida (0:02.4-0:03.2) */}
      <Sequence from={scenes.generating.start} durationInFrames={scenes.generating.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            <div
              style={{
                width: '90%',
                height: '160px',
                background: `linear-gradient(135deg, ${colors.blackSurface} 0%, ${colors.gradientEnd} 100%)`,
                borderRadius: '20px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
                padding: '32px',
                transform: `scale(${interpolate(
                  frame - scenes.generating.start,
                  [0, scenes.generating.duration],
                  [1.2, 0.9],
                  { extrapolateRight: 'clamp', easing: easeInOutQuart }
                )})`,
              }}
            >
              {/* Loading indicator más estético */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '24px',
                  opacity: interpolate(
                    frame - scenes.generating.start,
                    [0, 16],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    border: `4px solid ${colors.grayDark}`,
                    borderTop: `4px solid ${colors.spotifyGreen}`,
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                <p
                  style={{
                    fontSize: '24px',
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

      {/* Scene 4: Preview de canciones - solo 3 con pausa (0:03.2-0:08) */}
      <Sequence from={scenes.preview.start} durationInFrames={scenes.preview.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            <div
              style={{
                width: '90%',
                height: '85%',
                background: `linear-gradient(135deg, ${colors.blackSurface} 0%, ${colors.gradientEnd} 100%)`,
                borderRadius: '20px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
                overflow: 'hidden',
              }}
            >
              {/* Header más estético */}
              <div
                style={{
                  padding: '24px 32px 16px 32px',
                  borderBottom: `2px solid ${colors.grayDark}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  opacity: interpolate(
                    frame - scenes.preview.start,
                    [0, 16],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.preview.start,
                    [0, 16],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                <JeyLabbbLogo size={40} opacity={1} />
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  🎵 Tu playlist generada
                </h3>
              </div>
              
              {/* Lista de canciones con pausa solo en las 3 primeras */}
              <div style={{ padding: '16px 32px 32px 32px', height: 'calc(100% - 100px)', overflow: 'hidden' }}>
                {exactTracks.map((track, index) => {
                  // Solo las 3 primeras tienen pausa de 3 segundos
                  let trackStart, trackDuration;
                  if (track.hasPause) {
                    // Las 3 primeras: 3 segundos cada una
                    trackStart = scenes.preview.start + (index * 90); // 90 frames = 3 segundos
                    trackDuration = 90;
                  } else {
                    // Las 2 últimas: 1 segundo cada una
                    trackStart = scenes.preview.start + (3 * 90) + ((index - 3) * 30); // 30 frames = 1 segundo
                    trackDuration = 30;
                  }
                  
                  const trackProgress = frame - trackStart;
                  const isActive = trackProgress >= 0 && trackProgress < trackDuration;
                  const isPlaying = trackProgress >= 20 && trackProgress < (trackDuration - 10);
                  
                  return (
                    <div
                      key={index}
                      style={{
                        borderBottom: index < exactTracks.length - 1 ? `2px solid ${colors.grayDark}` : 'none',
                        backgroundColor: isActive ? colors.overlay : 'transparent',
                        borderRadius: '12px',
                        padding: isActive ? '20px 24px' : '16px 0',
                        transform: isActive ? `scale(1.03) translateY(-3px)` : `scale(1) translateY(0px)`,
                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        boxShadow: isActive ? `0 6px 20px rgba(0, 229, 255, 0.3)` : 'none',
                        height: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        opacity: isActive ? 1 : 0.4,
                      }}
                    >
                      {/* Indicador de reproducción solo para las 3 primeras */}
                      {isPlaying && track.hasPause && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '24px',
                            width: '40px',
                            height: '40px',
                            backgroundColor: colors.spotifyGreen,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
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
                            boxShadow: `0 0 16px rgba(30, 215, 96, 0.6)`,
                          }}
                        >
                          ▶
                        </div>
                      )}
                      
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '700',
                          color: colors.textPrimary,
                          marginBottom: '6px',
                          transform: `translateY(${interpolate(
                            trackProgress,
                            [0, 16],
                            [15, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            trackProgress,
                            [0, 16],
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
                          color: colors.textSecondary,
                          fontWeight: '500',
                          transform: `translateY(${interpolate(
                            trackProgress,
                            [0, 16],
                            [15, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            trackProgress,
                            [0, 16],
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

      {/* Scene 5: Añadir a Spotify más rápido (0:08-0:09.6) */}
      <Sequence from={scenes.spotify.start} durationInFrames={scenes.spotify.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            <div
              style={{
                width: '90%',
                height: '240px',
                background: `linear-gradient(135deg, ${colors.blackSurface} 0%, ${colors.gradientEnd} 100%)`,
                borderRadius: '20px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
                padding: '40px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Botón más estético */}
              <button
                style={{
                  width: '75%',
                  height: '80px',
                  background: `linear-gradient(135deg, ${colors.spotifyGreen} 0%, #1ED760 100%)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '24px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  boxShadow: `0 12px 32px rgba(30, 215, 96, 0.5)`,
                  transform: `scale(${spring({
                    frame: frame - scenes.spotify.start,
                    fps,
                    config: { damping: 400, stiffness: 400 },
                  })}) translateY(${interpolate(
                    frame - scenes.spotify.start,
                    [0, 16],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                  opacity: interpolate(
                    frame - scenes.spotify.start,
                    [0, 16],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <SpotifyLogo size={36} opacity={1} />
                Añadir a Spotify
              </button>
              
              {/* Mensaje de confirmación */}
              <div
                style={{
                  marginTop: '20px',
                  fontSize: '20px',
                  color: colors.textPrimary,
                  fontWeight: '600',
                  opacity: interpolate(
                    frame - scenes.spotify.start,
                    [24, 40],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.spotify.start,
                    [24, 40],
                    [15, 0],
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

      {/* Scene 6: Mis Playlists más rápido (0:09.6-0:11.2) */}
      <Sequence from={scenes.explore.start} durationInFrames={scenes.explore.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            <div
              style={{
                width: '90%',
                height: '85%',
                background: `linear-gradient(135deg, ${colors.blackSurface} 0%, ${colors.gradientEnd} 100%)`,
                borderRadius: '20px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                transform: `scale(${interpolate(
                  frame - scenes.explore.start,
                  [0, scenes.explore.duration],
                  [0.95, 1.0],
                  { extrapolateRight: 'clamp', easing: easeOutQuart }
                )})`,
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '24px 32px 16px 32px',
                  borderBottom: `2px solid ${colors.grayDark}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  opacity: interpolate(
                    frame - scenes.explore.start,
                    [0, 16],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.explore.start,
                    [0, 16],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                <JeyLabbbLogo size={40} opacity={1} />
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  🎧 Mis Playlists
                </h3>
              </div>
              
              {/* Lista de playlists */}
              <div style={{ padding: '16px 32px 32px 32px' }}>
                {[
                  { name: 'Underground Español', tracks: 12, color: colors.spotifyGreen },
                  { name: 'Música para Trabajar', tracks: 8, color: colors.accentCyan },
                  { name: 'Lo Mejor del Rap', tracks: 15, color: '#FF6B35' },
                ].map((playlist, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px 0',
                      borderBottom: index < 2 ? `2px solid ${colors.grayDark}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      height: '80px',
                      transform: `translateX(${interpolate(
                        frame - scenes.explore.start,
                        [index * 12, (index * 12) + 20],
                        [40, 0],
                        { extrapolateRight: 'clamp' }
                      )}px) scale(${interpolate(
                        frame - scenes.explore.start,
                        [index * 12, (index * 12) + 20],
                        [0.95, 1],
                        { extrapolateRight: 'clamp' }
                      )})`,
                      opacity: interpolate(
                        frame - scenes.explore.start,
                        [index * 12, (index * 12) + 20],
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
                        background: `linear-gradient(135deg, ${playlist.color} 0%, ${playlist.color}CC 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        boxShadow: `0 6px 16px ${playlist.color}50`,
                        transform: `scale(${interpolate(
                          frame - scenes.explore.start,
                          [index * 12, (index * 12) + 20],
                          [0.8, 1],
                          { extrapolateRight: 'clamp' }
                        )}) rotate(${interpolate(
                          frame - scenes.explore.start,
                          [index * 12, (index * 12) + 20],
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
                          fontSize: '20px',
                          fontWeight: '700',
                          color: colors.textPrimary,
                          marginBottom: '4px',
                          transform: `translateY(${interpolate(
                            frame - scenes.explore.start,
                            [index * 12, (index * 12) + 20],
                            [10, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.explore.start,
                            [index * 12, (index * 12) + 20],
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                        }}
                      >
                        {playlist.name}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          color: colors.textSecondary,
                          fontWeight: '500',
                          transform: `translateY(${interpolate(
                            frame - scenes.explore.start,
                            [index * 12, (index * 12) + 20],
                            [10, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.explore.start,
                            [index * 12, (index * 12) + 20],
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

      {/* Scene 7: CTA más rápido (0:11.2-0:12.8) */}
      <Sequence from={scenes.cta.start} durationInFrames={scenes.cta.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            {/* CTA Principal */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '40px',
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start,
                  fps,
                  config: { damping: 400, stiffness: 400 },
                })})`,
                opacity: interpolate(
                  frame - scenes.cta.start,
                  [0, 16],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: colors.textPrimary,
                  margin: 0,
                  marginBottom: '16px',
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [0, 16],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Pruébalo ahora
              </h2>
              <div
                style={{
                  fontSize: '32px',
                  color: colors.accentCyan,
                  fontWeight: '600',
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [8, 24],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                  opacity: interpolate(
                    frame - scenes.cta.start,
                    [8, 24],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                playlists.jeylabbb.com
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 8: Cursor clickeando el link (0:12.8-0:15.2) */}
      <Sequence from={scenes.click.start} durationInFrames={scenes.click.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            {/* CTA con link clickeable */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '40px',
                opacity: interpolate(
                  frame - scenes.click.start,
                  [0, 16],
                  [1, 0.8],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: colors.textPrimary,
                  margin: 0,
                  marginBottom: '16px',
                }}
              >
                Pruébalo ahora
              </h2>
              <div
                style={{
                  fontSize: '32px',
                  color: colors.accentCyan,
                  fontWeight: '600',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                playlists.jeylabbb.com
              </div>
            </div>

            {/* Cursor animado moviéndose hacia el link */}
            <div
              style={{
                position: 'absolute',
                transform: `translate(${interpolate(
                  frame - scenes.click.start,
                  [0, 40],
                  [0, 0],
                  { extrapolateRight: 'clamp' }
                )}px, ${interpolate(
                  frame - scenes.click.start,
                  [0, 40],
                  [0, -80],
                  { extrapolateRight: 'clamp' }
                )}px)`,
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: colors.accentCyan,
                  borderRadius: '50%',
                  boxShadow: `0 0 16px rgba(0, 229, 255, 0.8)`,
                  opacity: interpolate(
                    frame - scenes.click.start,
                    [0, 16],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              />
            </div>

            {/* Efecto de click */}
            {frame >= scenes.click.start + 40 && frame < scenes.click.start + 50 && (
              <div
                style={{
                  position: 'absolute',
                  width: '40px',
                  height: '40px',
                  border: `3px solid ${colors.accentCyan}`,
                  borderRadius: '50%',
                  opacity: interpolate(
                    frame - (scenes.click.start + 40),
                    [0, 10],
                    [1, 0],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `scale(${interpolate(
                    frame - (scenes.click.start + 40),
                    [0, 10],
                    [0, 2],
                    { extrapolateRight: 'clamp' }
                  )})`,
                }}
              />
            )}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 9: Transición de vuelta al inicio (0:15.2-0:18) */}
      <Sequence from={scenes.loop.start} durationInFrames={scenes.loop.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientEnd} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            {/* Volver al hook inicial */}
            <div
              style={{
                width: '90%',
                height: '160px',
                background: `linear-gradient(135deg, ${colors.blackSurface} 0%, ${colors.gradientEnd} 100%)`,
                borderRadius: '20px',
                border: `2px solid ${colors.grayDark}`,
                boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
                padding: '32px',
                transform: `scale(${interpolate(
                  frame - scenes.loop.start,
                  [0, scenes.loop.duration],
                  [0.4, 1.1],
                  { extrapolateRight: 'clamp', easing: easeOutQuart }
                )})`,
                opacity: interpolate(
                  frame - scenes.loop.start,
                  [0, 24],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: colors.textPrimary,
                  marginBottom: '24px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.loop.start,
                    [24, 48],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.loop.start,
                    [24, 48],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Escribe tu prompt y crea tu playlist personalizada
              </h2>
              
              <textarea
                rows={2}
                placeholder="Ej: playlist underground español para activarme"
                style={{
                  width: '100%',
                  height: '60px',
                  background: `linear-gradient(135deg, ${colors.blackBase} 0%, ${colors.gradientStart} 100%)`,
                  border: `2px solid ${colors.grayDark}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: colors.textPrimary,
                  fontSize: '20px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  opacity: interpolate(
                    frame - scenes.loop.start,
                    [48, 72],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.loop.start,
                    [48, 72],
                    [15, 0],
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
