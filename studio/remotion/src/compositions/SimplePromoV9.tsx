import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio, Easing } from 'remotion';

interface SimplePromoV9Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV9: React.FC<SimplePromoV9Props> = ({
  headline,
  prompt: initialPrompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const prompt = "playlist underground español para activarme"; // Prompt específico para demo

  // Timing profesional: 20 segundos con loop perfecto
  const scenes = {
    hook: { start: 0, duration: 60 },        // 0:00-0:02 - Hook dramático
    typing: { start: 60, duration: 60 },     // 0:02-0:04 - Escribir prompt
    generating: { start: 120, duration: 60 }, // 0:04-0:06 - Generación con loading
    preview: { start: 180, duration: 180 },  // 0:06-0:12 - Preview canciones
    spotify: { start: 360, duration: 90 },   // 0:12-0:15 - Añadir a Spotify
    explore: { start: 450, duration: 90 },   // 0:15-0:18 - Mis Playlists
    cta: { start: 540, duration: 60 },       // 0:18-0:20 - CTA y Loop
  };

  // Canciones exactas con audio real
  const exactTracks = [
    { title: 'Do you remember', artist: 'Xiyo & Fernandez', hasAudio: true },
    { title: 'Pa q me escribes', artist: 'Vreno Yg', hasAudio: true },
    { title: 'Suena COOL', artist: 'mvrk & L\'haine', hasAudio: true },
    { title: 'El precio del amor', artist: 'Guxo', hasAudio: false },
    { title: 'Nuevos Deals', artist: 'West SRK', hasAudio: false },
  ];

  // Easing functions profesionales
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Colores reales de la app (Spotify-inspired dark theme)
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

  // Componente de logo Spotify SVG
  const SpotifyLogo = ({ size = 24, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.45c-.2.32-.63.42-.95.22-2.59-1.58-5.84-1.94-9.67-1.06-.37.07-.74-.15-.81-.52-.07-.37.15-.74.52-.81 4.19-.93 7.79-.51 10.7 1.21.32.2.42.63.22.95zm1.29-3c-.25.4-.78.52-1.18.28-2.96-1.82-7.47-2.35-10.97-1.28-.45.14-.93-.12-1.07-.57-.14-.45.12-.93.57-1.07 3.99-1.22 8.89-.63 12.23 1.46.4.25.52.78.28 1.18zm.1-3.05C15.25 8.48 8.87 8.26 5.82 9.31c-.54.16-1.11-.14-1.27-.68-.16-.54.14-1.11.68-1.27 3.56-1.18 10.52-.93 14.12 1.39.47.29.62.93.33 1.4-.29.47-.93.62-1.4.33z"
        fill="#1DB954"
      />
    </svg>
  );

  // Componente de logo JeyLabbb SVG
  const JeyLabbbLogo = ({ size = 32, opacity = 1 }) => (
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
    <AbsoluteFill style={{ backgroundColor: colors.blackBase, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Scene 1: Hook dramático (0:00-0:02) */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill>
          {/* Fondo con gradiente sutil */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.blackBase} 0%, #1a1a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* Caja de prompt con zoom dramático */}
            <div
              style={{
                width: '100%',
                maxWidth: '700px',
                backgroundColor: colors.blackSurface,
                borderRadius: '20px',
                border: `1px solid ${colors.grayDark}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                padding: '32px',
                transform: `scale(${interpolate(
                  frame - scenes.hook.start,
                  [0, scenes.hook.duration],
                  [0.5, 1],
                  { extrapolateRight: 'clamp', easing: easeOutCubic }
                )})`,
                opacity: interpolate(
                  frame - scenes.hook.start,
                  [0, 30],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '24px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.hook.start,
                    [30, 60],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.hook.start,
                    [30, 60],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Escribe tu prompt y crea tu playlist personalizada
              </h2>
              
              <textarea
                rows={4}
                placeholder="Ej: playlist underground español para activarme"
                style={{
                  width: '100%',
                  backgroundColor: colors.blackSurface,
                  border: `1px solid ${colors.grayDark}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: colors.textPrimary,
                  fontSize: '18px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  opacity: interpolate(
                    frame - scenes.hook.start,
                    [40, 60],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.hook.start,
                    [40, 60],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
                readOnly
              />
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonido de whoosh al inicio - Comentado temporalmente */}
        {/* <Audio src="/studio/audio/whoosh.wav" startFrom={0} volume={0.6} endAt={15} /> */}
      </Sequence>

      {/* Scene 2: Escribir prompt (0:02-0:04) */}
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
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '700px',
                backgroundColor: colors.blackSurface,
                borderRadius: '20px',
                border: `1px solid ${colors.grayDark}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                padding: '32px',
                transform: 'scale(1.1)', // Zoom in para escribir
              }}
            >
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '24px',
                  textAlign: 'center',
                }}
              >
                Escribe tu prompt y crea tu playlist personalizada
              </h2>
              
              <textarea
                rows={4}
                value={prompt.slice(0, Math.floor(interpolate(
                  frame - scenes.typing.start,
                  [0, scenes.typing.duration],
                  [0, prompt.length],
                  { extrapolateRight: 'clamp' }
                )))}
                style={{
                  width: '100%',
                  backgroundColor: colors.blackSurface,
                  border: `2px solid ${colors.accentCyan}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: colors.textPrimary,
                  fontSize: '18px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  boxShadow: `0 0 0 2px rgba(34, 211, 238, 0.2)`,
                }}
                readOnly
              />
              
              {/* Cursor parpadeante */}
              <div
                style={{
                  position: 'absolute',
                  right: '52px',
                  bottom: '48px',
                  width: '2px',
                  height: '24px',
                  backgroundColor: colors.accentCyan,
                  opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                  transition: 'opacity 0.1s',
                }}
              />
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonido de teclado - Comentado temporalmente */}
        {/* <Audio src="/studio/audio/keyboard clicks.wav" startFrom={0} volume={0.4} endAt={scenes.typing.duration} /> */}
      </Sequence>

      {/* Scene 3: Generación con loading (0:04-0:06) */}
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
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '700px',
                backgroundColor: colors.blackSurface,
                borderRadius: '20px',
                border: `1px solid ${colors.grayDark}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                padding: '32px',
                transform: `scale(${interpolate(
                  frame - scenes.generating.start,
                  [0, scenes.generating.duration],
                  [1.1, 0.95],
                  { extrapolateRight: 'clamp', easing: easeInOutCubic }
                )})`,
              }}
            >
              {/* Loading indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '20px',
                  opacity: interpolate(
                    frame - scenes.generating.start,
                    [0, 30],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    border: `3px solid ${colors.grayDark}`,
                    borderTop: `3px solid ${colors.spotifyGreen}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p
                  style={{
                    fontSize: '20px',
                    color: colors.textPrimary,
                    fontWeight: '500',
                    margin: 0,
                  }}
                >
                  Generando tu playlist...
                </p>
              </div>
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonido de generación - Comentado temporalmente */}
        {/* <Audio src="/studio/audio/swoosh.mp3" startFrom={0} volume={0.5} endAt={20} /> */}
      </Sequence>

      {/* Scene 4: Preview de canciones (0:06-0:12) */}
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
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '700px',
                backgroundColor: colors.blackSurface,
                borderRadius: '20px',
                border: `1px solid ${colors.grayDark}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                overflow: 'hidden',
              }}
            >
              {/* Header con logo JeyLabbb */}
              <div
                style={{
                  padding: '24px 32px 16px 32px',
                  borderBottom: `1px solid ${colors.grayDark}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  opacity: interpolate(
                    frame - scenes.preview.start,
                    [0, 30],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.preview.start,
                    [0, 30],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                <JeyLabbbLogo size={32} opacity={1} />
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  🎵 Tu playlist generada
                </h3>
              </div>
              
              {/* Lista de canciones con preview */}
              <div style={{ padding: '16px 32px 32px 32px' }}>
                {exactTracks.map((track, index) => {
                  const hoverProgress = interpolate(
                    frame - scenes.preview.start,
                    [index * 36, (index * 36) + 36],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  );
                  
                  const isHovered = hoverProgress > 0.2 && hoverProgress < 0.8;
                  const isPlaying = hoverProgress > 0.3 && hoverProgress < 0.7;
                  
                  return (
                    <div
                      key={index}
                      style={{
                        borderBottom: index < exactTracks.length - 1 ? `1px solid ${colors.grayDark}` : 'none',
                        backgroundColor: isHovered ? colors.overlay : 'transparent',
                        borderRadius: '12px',
                        padding: isHovered ? '16px 20px' : '16px 0',
                        transform: isHovered ? `scale(1.02) translateY(-2px)` : `scale(1) translateY(0px)`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        boxShadow: isHovered ? `0 4px 12px rgba(34, 211, 238, 0.15)` : 'none',
                      }}
                    >
                      {/* Indicador de reproducción */}
                      {isPlaying && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '20px',
                            width: '32px',
                            height: '32px',
                            backgroundColor: colors.spotifyGreen,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            color: 'white',
                            animation: 'pulse 1s infinite',
                            transform: `scale(${interpolate(
                              frame - scenes.preview.start,
                              [index * 36, (index * 36) + 20],
                              [0.8, 1],
                              { extrapolateRight: 'clamp' }
                            )}) rotate(${interpolate(
                              frame - scenes.preview.start,
                              [index * 36, (index * 36) + 20],
                              [180, 0],
                              { extrapolateRight: 'clamp' }
                            )}deg)`,
                            opacity: interpolate(
                              frame - scenes.preview.start,
                              [index * 36, (index * 36) + 20],
                              [0, 1],
                              { extrapolateRight: 'clamp' }
                            ),
                          }}
                        >
                          ▶
                        </div>
                      )}
                      
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          color: colors.textPrimary,
                          marginBottom: '6px',
                          transform: `translateY(${interpolate(
                            frame - scenes.preview.start,
                            [index * 36, (index * 36) + 20],
                            [10, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.preview.start,
                            [index * 36, (index * 36) + 20],
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
                          color: colors.textSecondary,
                          transform: `translateY(${interpolate(
                            frame - scenes.preview.start,
                            [index * 36, (index * 36) + 20],
                            [10, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.preview.start,
                            [index * 36, (index * 36) + 20],
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
        
        {/* Sonidos de preview de canciones - Comentados temporalmente */}
        {/*
        {exactTracks.map((track, index) => {
          const previewStart = scenes.preview.start + (index * 36);
          const isPlaying = frame >= previewStart + 11 && frame < previewStart + 26;
          
          const audioFiles = [
            '/studio/audio/Do You Remember-Xiyo Fernandezz Eix.m4a',
            '/studio/audio/Pa Q Me Escribes-Vreno Yg.m4a',
            '/studio/audio/Suena Cool-Mvrk Lhaine.m4a',
            '', // Sin audio para Guxo
            ''  // Sin audio para West SRK
          ];
          
          return isPlaying && track.hasAudio && audioFiles[index] ? (
            <Audio
              key={index}
              src={audioFiles[index]}
              startFrom={previewStart + 11 - scenes.preview.start}
              volume={0.6}
              endAt={previewStart + 26 - scenes.preview.start}
            />
          ) : null;
        })}
        */}
      </Sequence>

      {/* Scene 5: Añadir a Spotify (0:12-0:15) */}
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
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '600px',
                backgroundColor: colors.blackSurface,
                borderRadius: '20px',
                border: `1px solid ${colors.grayDark}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                padding: '40px',
                textAlign: 'center',
              }}
            >
              {/* Botón Añadir a Spotify */}
              <button
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  backgroundColor: colors.spotifyGreen,
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '20px 32px',
                  fontSize: '20px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  boxShadow: `0 8px 24px rgba(29, 185, 84, 0.3)`,
                  transform: `scale(${spring({
                    frame: frame - scenes.spotify.start,
                    fps,
                    config: { damping: 200, stiffness: 200 },
                  })}) translateY(${interpolate(
                    frame - scenes.spotify.start,
                    [0, 30],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                  opacity: interpolate(
                    frame - scenes.spotify.start,
                    [0, 30],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <SpotifyLogo size={28} opacity={1} />
                Añadir a Spotify
              </button>
              
              {/* Mensaje de confirmación */}
              <div
                style={{
                  marginTop: '24px',
                  fontSize: '20px',
                  color: colors.textPrimary,
                  opacity: interpolate(
                    frame - scenes.spotify.start,
                    [45, 75],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.spotify.start,
                    [45, 75],
                    [10, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                ✅ Playlist creada con éxito
              </div>
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonidos de interacción - Comentados temporalmente */}
        {/* <Audio src="/studio/audio/button click.wav" startFrom={0} volume={0.7} endAt={15} /> */}
        {/* <Audio src="/studio/audio/success.wav" startFrom={45} volume={0.6} endAt={75} /> */}
      </Sequence>

      {/* Scene 6: Mis Playlists (0:15-0:18) */}
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
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '700px',
                backgroundColor: colors.blackSurface,
                borderRadius: '20px',
                border: `1px solid ${colors.grayDark}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                transform: `scale(${interpolate(
                  frame - scenes.explore.start,
                  [0, scenes.explore.duration],
                  [0.95, 1.0],
                  { extrapolateRight: 'clamp', easing: easeOutCubic }
                )})`,
              }}
            >
              {/* Header con logo JeyLabbb */}
              <div
                style={{
                  padding: '24px 32px 16px 32px',
                  borderBottom: `1px solid ${colors.grayDark}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  opacity: interpolate(
                    frame - scenes.explore.start,
                    [0, 30],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.explore.start,
                    [0, 30],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                <JeyLabbbLogo size={32} opacity={1} />
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
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
                      borderBottom: index < 2 ? `1px solid ${colors.grayDark}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      transform: `translateX(${interpolate(
                        frame - scenes.explore.start,
                        [index * 20, (index * 20) + 30],
                        [50, 0],
                        { extrapolateRight: 'clamp' }
                      )}px) scale(${interpolate(
                        frame - scenes.explore.start,
                        [index * 20, (index * 20) + 30],
                        [0.95, 1],
                        { extrapolateRight: 'clamp' }
                      )})`,
                      opacity: interpolate(
                        frame - scenes.explore.start,
                        [index * 20, (index * 20) + 30],
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
                        backgroundColor: playlist.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        boxShadow: `0 4px 12px ${playlist.color}40`,
                        transform: `scale(${interpolate(
                          frame - scenes.explore.start,
                          [index * 20, (index * 20) + 30],
                          [0.8, 1],
                          { extrapolateRight: 'clamp' }
                        )}) rotate(${interpolate(
                          frame - scenes.explore.start,
                          [index * 20, (index * 20) + 30],
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
                          fontWeight: '600',
                          color: colors.textPrimary,
                          marginBottom: '4px',
                          transform: `translateY(${interpolate(
                            frame - scenes.explore.start,
                            [index * 20, (index * 20) + 30],
                            [10, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.explore.start,
                            [index * 20, (index * 20) + 30],
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
                          transform: `translateY(${interpolate(
                            frame - scenes.explore.start,
                            [index * 20, (index * 20) + 30],
                            [10, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.explore.start,
                            [index * 20, (index * 20) + 30],
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

      {/* Scene 7: CTA y Loop (0:18-0:20) */}
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
              padding: '40px',
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
                  config: { damping: 200, stiffness: 200 },
                })})`,
                opacity: interpolate(
                  frame - scenes.cta.start,
                  [0, 30],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <h2
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: colors.textPrimary,
                  margin: 0,
                  marginBottom: '16px',
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [0, 30],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                Pruébalo ahora
              </h2>
              <div
                style={{
                  fontSize: '28px',
                  color: colors.accentCyan,
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [15, 45],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                  opacity: interpolate(
                    frame - scenes.cta.start,
                    [15, 45],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                playlists.jeylabbb.com
              </div>
            </div>

            {/* Cursor animado */}
            <div
              style={{
                position: 'relative',
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start - 30,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: colors.accentCyan,
                  borderRadius: '50%',
                  boxShadow: `0 0 15px rgba(34, 211, 238, 0.6)`,
                  opacity: interpolate(
                    frame - scenes.cta.start,
                    [30, 45],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.cta.start,
                    [30, 45],
                    [10, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              />
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonido de clic final - Comentado temporalmente */}
        {/* <Audio src="/studio/audio/button click.wav" startFrom={30} volume={0.7} endAt={45} /> */}
      </Sequence>

      {/* Transición de loop - Parpadeo y vuelta al inicio */}
      <Sequence from={scenes.cta.start + 50} durationInFrames={10}>
        <AbsoluteFill
          style={{
            backgroundColor: colors.blackBase,
            opacity: interpolate(
              frame - (scenes.cta.start + 50),
              [0, 5, 10],
              [0, 1, 0],
              { extrapolateRight: 'clamp' }
            ),
          }}
        />
      </Sequence>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </AbsoluteFill>
  );
};
