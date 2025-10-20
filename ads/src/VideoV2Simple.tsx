/**
 * VideoV2 - Versión simplificada para renderizado
 */

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// Configuración del video
const VIDEO_DURATION = 25; // segundos
const FPS = 30;

// Colores básicos
const colors = {
  bg: '#0E1116',
  bgSecondary: '#11141A',
  text: '#F5F7FA',
  textSecondary: 'rgba(245, 247, 250, 0.7)',
  pleiaGreen: '#36E2B4',
  pleiaBlue: '#5B8CFF',
  border: 'rgba(255, 255, 255, 0.08)',
};

// Secuencias de tiempo (en segundos)
const SEQUENCES = {
  fadeIn: { start: 0, duration: 0.3 },
  promptUI: { start: 0.3, duration: 1.2 },
  buttonClick: { start: 1.5, duration: 1.0 },
  results: { start: 2.5, duration: 3.0 },
  spotifyTransition: { start: 5.5, duration: 1.3 },
  starMovement: { start: 6.8, duration: 1.2 },
  logoReveal: { start: 8.0, duration: 0.8 },
  phrases: { start: 8.8, duration: 1.2 },
  fadeOutText: { start: 10.0, duration: 0.5 },
  tipsZoom: { start: 10.5, duration: 0.5 },
  tipsCards: { start: 11.0, duration: 1.0 },
  exampleExpansion: { start: 12.0, duration: 3.0 },
  playlistsView: { start: 15.0, duration: 2.0 },
  playlistHover: { start: 17.0, duration: 1.0 },
  navigationBar: { start: 18.0, duration: 1.0 },
  linkClick: { start: 19.0, duration: 0.3 },
  loadingBar: { start: 19.3, duration: 0.7 },
  transitionOut: { start: 20.0, duration: 0.8 },
};

export const VideoV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Animaciones básicas
  const fadeInProgress = interpolate(
    frame,
    [SEQUENCES.fadeIn.start * fps, (SEQUENCES.fadeIn.start + SEQUENCES.fadeIn.duration) * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const blurProgress = interpolate(
    frame,
    [0, SEQUENCES.fadeIn.duration * fps],
    [20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        filter: `blur(${blurProgress}px)`,
      }}
    >
      {/* Fondo con gradiente sutil */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bgSecondary} 100%)`,
          opacity: fadeInProgress,
        }}
      />
      
      {/* Brillo radial verde-azulado */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(54, 226, 180, 0.1) 0%, transparent 70%)`,
          opacity: fadeInProgress * 0.5,
        }}
      />
      
      {/* SECCIÓN 0: PromptBox UI */}
      <Sequence from={SEQUENCES.promptUI.start * fps} durationInFrames={SEQUENCES.promptUI.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 64,
          }}
        >
          <div
            style={{
              width: 450,
              height: 64,
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                flex: 1,
                fontSize: 20,
                color: colors.text,
                fontWeight: 400,
              }}
            >
              reggaeton para salir de fiesta
            </div>
          </div>
          
          <div
            style={{
              width: 200,
              height: 56,
              backgroundColor: colors.pleiaGreen,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 500,
              color: colors.bg,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(54, 226, 180, 0.15)',
            }}
          >
            Crear playlist
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* SECCIÓN 1: Resultados - SongCards en cascada */}
      <Sequence from={SEQUENCES.results.start * fps} durationInFrames={SEQUENCES.results.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 64,
            gap: 16,
          }}
        >
          <h2
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: colors.text,
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            Tu playlist perfecta está lista
          </h2>
          
          {[
            { title: "Canción 1", artist: "Artista 1", duration: "3:24" },
            { title: "Canción 2", artist: "Artista 2", duration: "2:58" },
            { title: "Canción 3", artist: "Artista 3", duration: "4:12" },
            { title: "Canción 4", artist: "Artista 4", duration: "3:45" },
            { title: "Canción 5", artist: "Artista 5", duration: "3:33" },
          ].map((song, index) => (
            <div
              key={index}
              style={{
                width: 400,
                height: 80,
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transform: `translateX(${interpolate(
                  frame,
                  [(SEQUENCES.results.start + 0.5 + index * 0.15) * fps, (SEQUENCES.results.start + 1 + index * 0.15) * fps],
                  [40, 0],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}px)`,
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.results.start + 0.5 + index * 0.15) * fps, (SEQUENCES.results.start + 1 + index * 0.15) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: colors.pleiaGreen,
                  marginRight: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: colors.bg,
                }}
              >
                {song.artist.charAt(0).toUpperCase()}
              </div>
              
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 16,
                    color: colors.text,
                    fontWeight: 500,
                    marginBottom: 2,
                  }}
                >
                  {song.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                  }}
                >
                  {song.artist}
                </div>
              </div>
              
              <div
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginLeft: 12,
                }}
              >
                {song.duration}
              </div>
            </div>
          ))}
        </AbsoluteFill>
      </Sequence>
      
      {/* Transición a Spotify */}
      <Sequence from={SEQUENCES.spotifyTransition.start * fps} durationInFrames={SEQUENCES.spotifyTransition.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              backgroundColor: '#1DB954',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 40px rgba(29, 185, 84, 0.5)`,
              transform: `scale(${interpolate(
                frame,
                [SEQUENCES.spotifyTransition.start * fps, (SEQUENCES.spotifyTransition.start + 0.5) * fps],
                [0.8, 1.1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )})`,
            }}
          >
            <svg width="120" height="120" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.5c-.15.24-.42.32-.66.18-1.83-1.12-4.13-1.37-6.84-.75-.27.05-.55-.11-.6-.38-.05-.27.11-.55.38-.6 3.05-.68 5.65-.4 7.8.87.24.15.32.42.18.66zm1.2-2.1c-.18.29-.51.38-.8.21-2.09-1.28-5.28-1.65-7.76-.9-.33.1-.68-.08-.78-.41-.1-.33.08-.68.41-.78 2.8-.85 6.3-.45 8.7 1.03.29.18.38.51.21.8zm.1-2.2C15.25 8.5 8.87 8.16 5.29 9.08c-.4.12-.82-.12-.94-.52-.12-.4.12-.82.52-.94 4.05-1.22 10.95-.82 15.1 1.19.37.22.49.68.27 1.05-.22.37-.68.49-1.05.27z"/>
            </svg>
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* Logo PLEIA */}
      <Sequence from={SEQUENCES.logoReveal.start * fps} durationInFrames={SEQUENCES.logoReveal.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 64,
          }}
        >
          <h1
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: colors.text,
              textAlign: 'center',
              marginBottom: 16,
              lineHeight: 1.2,
              transform: `translateY(${interpolate(
                frame,
                [SEQUENCES.logoReveal.start * fps, (SEQUENCES.logoReveal.start + 0.5) * fps],
                [20, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              opacity: interpolate(
                frame,
                [SEQUENCES.logoReveal.start * fps, (SEQUENCES.logoReveal.start + 0.5) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            PLEIA
          </h1>
          
          {/* Estrellita */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: colors.pleiaGreen,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: colors.bg,
              marginTop: -8,
            }}
          >
            ★
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* Frases */}
      <Sequence from={SEQUENCES.phrases.start * fps} durationInFrames={SEQUENCES.phrases.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 64,
            gap: 16,
          }}
        >
          <p
            style={{
              fontSize: 20,
              color: colors.textSecondary,
              textAlign: 'center',
              maxWidth: 500,
              lineHeight: 1.5,
              transform: `translateY(${interpolate(
                frame,
                [SEQUENCES.phrases.start * fps, (SEQUENCES.phrases.start + 0.5) * fps],
                [20, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              opacity: interpolate(
                frame,
                [SEQUENCES.phrases.start * fps, (SEQUENCES.phrases.start + 0.5) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            La primera IA generadora de playlists en tiempo real.
          </p>
          
          <p
            style={{
              fontSize: 18,
              color: colors.textSecondary,
              textAlign: 'center',
              maxWidth: 500,
              lineHeight: 1.5,
              transform: `translateY(${interpolate(
                frame,
                [(SEQUENCES.phrases.start + 0.25) * fps, (SEQUENCES.phrases.start + 0.75) * fps],
                [20, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              opacity: interpolate(
                frame,
                [(SEQUENCES.phrases.start + 0.25) * fps, (SEQUENCES.phrases.start + 0.75) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            Canciones nuevas. Estilo propio. Actualización automática.
          </p>
        </AbsoluteFill>
      </Sequence>
      
      {/* Navegación y CTA */}
      <Sequence from={SEQUENCES.navigationBar.start * fps} durationInFrames={SEQUENCES.navigationBar.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: 64,
            paddingTop: 128,
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#007AFF',
              textAlign: 'center',
              textDecoration: 'underline',
              textDecorationColor: '#007AFF',
              textUnderlineOffset: '8px',
            }}
          >
            playlists.jeylabbb.com
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* Barra de carga */}
      <Sequence from={SEQUENCES.loadingBar.start * fps} durationInFrames={SEQUENCES.loadingBar.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 64,
          }}
        >
          <div
            style={{
              width: 300,
              height: 4,
              backgroundColor: colors.border,
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${interpolate(
                  frame,
                  [SEQUENCES.loadingBar.start * fps, (SEQUENCES.loadingBar.start + SEQUENCES.loadingBar.duration) * fps],
                  [0, 100],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}%`,
                height: '100%',
                backgroundColor: colors.pleiaGreen,
                borderRadius: '50%',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* Transición final - Loop */}
      <Sequence from={SEQUENCES.transitionOut.start * fps} durationInFrames={SEQUENCES.transitionOut.duration * fps}>
        <AbsoluteFill
          style={{
            backgroundColor: colors.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 64,
            opacity: interpolate(
              frame,
              [SEQUENCES.transitionOut.start * fps, (SEQUENCES.transitionOut.start + 0.5) * fps],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            ),
          }}
        >
          {/* Frame inicial del video anterior para loop perfecto */}
          <div
            style={{
              width: 450,
              height: 64,
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.8,
              filter: 'blur(2px)',
            }}
          >
            <div
              style={{
                flex: 1,
                fontSize: 20,
                color: colors.textSecondary,
                fontWeight: 400,
              }}
            >
              reggaeton para salir de fiesta
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

