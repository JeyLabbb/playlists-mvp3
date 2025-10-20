/**
 * VideoV3.5 - Versión con continuidad total y cámara viva
 * Nada aparece "por la cara": todo nace de la escena anterior
 */

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// Configuración del video
const VIDEO_DURATION = 25; // segundos
const FPS = 30;

// Colores y estilos
const colors = {
  bg: '#0E1116',
  bgSecondary: '#11141A',
  text: '#F5F7FA',
  pleiaGreen: '#36E2B4',
  pleiaBlue: '#5B8CFF',
  spotifyGreen: '#1ED760',
  linkBlue: '#007AFF',
  cardBg: '#14181E',
  border: 'rgba(255,255,255,0.08)',
  white: '#F9FAFB',
};

// Safe zone padding
const SAFE_ZONE = 80;

// Secuencias de tiempo (en segundos)
const SEQUENCES = {
  inicio: { start: 0, duration: 0.3 },
  canciones: { start: 0.3, duration: 2.7 },
  spotify: { start: 3.0, duration: 1.0 },
  estrella: { start: 4.0, duration: 1.5 },
  logoFrases: { start: 5.5, duration: 1.5 },
  consejos: { start: 7.0, duration: 2.0 },
  nuevaPlaylist: { start: 9.0, duration: 3.0 },
  misPlaylists: { start: 12.0, duration: 2.0 },
  navegador: { start: 14.0, duration: 2.0 },
  loopFinal: { start: 16.0, duration: 2.0 },
};

export const VideoV35: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Animaciones de cámara continua
  const cameraY = interpolate(
    frame,
    [0, 3.0 * fps, 9.0 * fps, 12.0 * fps, 16.0 * fps],
    [0, 90, 300, 390, 450],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const cameraRotationY = interpolate(
    frame,
    [4.0 * fps, 5.5 * fps, 12.0 * fps],
    [0, 18, -5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const cameraZoom = interpolate(
    frame,
    [7.0 * fps, 9.0 * fps],
    [1, 0.9],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const cameraCircular = interpolate(
    frame,
    [5.5 * fps, 7.0 * fps],
    [0, 2],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: SAFE_ZONE,
        transform: `
          translateY(${-cameraY}px) 
          rotateY(${cameraRotationY}deg) 
          scale(${cameraZoom})
          rotateZ(${Math.sin(frame * 0.01) * cameraCircular}deg)
        `,
      }}
    >
      {/* Fondo con gradiente */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bgSecondary} 50%, ${colors.bg} 100%)`,
        }}
      />
      
      {/* INICIO - Solo caja de prompt */}
      <Sequence from={SEQUENCES.inicio.start * fps} durationInFrames={SEQUENCES.inicio.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          {/* Caja de prompt */}
          <div
            style={{
              width: 900,
              height: 140,
              backgroundColor: colors.cardBg,
              border: `2px solid ${colors.border}`,
              borderRadius: 24,
              padding: '0 32px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
              transform: `scale(${interpolate(
                frame,
                [(SEQUENCES.inicio.start + 0.2) * fps, (SEQUENCES.inicio.start + 0.3) * fps],
                [0.97, 1.03],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )})`,
            }}
          >
            <div
              style={{
                fontSize: 54,
                color: colors.text,
                fontWeight: 500,
              }}
            >
              reggaetón para salir de fiesta
            </div>
          </div>
          
          {/* Botón Crear playlist */}
          <div
            style={{
              width: 300,
              height: 80,
              background: `linear-gradient(135deg, ${colors.pleiaBlue} 0%, ${colors.pleiaGreen} 100%)`,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              fontWeight: 600,
              color: colors.bg,
              cursor: 'pointer',
            }}
          >
            Crear playlist
          </div>
          
          {/* Cursor */}
          <div
            style={{
              position: 'absolute',
              left: interpolate(
                frame,
                [(SEQUENCES.inicio.start + 0.1) * fps, (SEQUENCES.inicio.start + 0.2) * fps],
                [1080, 540],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              top: 1240,
              width: 24,
              height: 24,
              backgroundColor: colors.pleiaGreen,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${colors.pleiaGreen}`,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* CANCIONES - Expansión desde la caja */}
      <Sequence from={SEQUENCES.canciones.start * fps} durationInFrames={SEQUENCES.canciones.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 200,
            gap: 50,
          }}
        >
          {/* Caja expandida */}
          <div
            style={{
              width: 900,
              height: 140,
              backgroundColor: colors.cardBg,
              border: `2px solid ${colors.border}`,
              borderRadius: 24,
              padding: '0 32px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
              transform: `scaleY(${interpolate(
                frame,
                [SEQUENCES.canciones.start * fps, (SEQUENCES.canciones.start + 0.3) * fps],
                [1, 1.2],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )})`,
            }}
          >
            <div
              style={{
                fontSize: 54,
                color: colors.text,
                fontWeight: 500,
              }}
            >
              reggaetón para salir de fiesta
            </div>
          </div>
          
          {/* SongCards emergiendo */}
          {[
            { title: "Dale Don Dale", artist: "Don Omar", duration: "3:24" },
            { title: "Gasolina", artist: "Daddy Yankee", duration: "3:12" },
            { title: "Sensualidad", artist: "Bad Bunny", duration: "4:28" },
            { title: "Con Calma", artist: "Daddy Yankee", duration: "3:45" },
            { title: "Taki Taki", artist: "DJ Snake", duration: "3:33" },
          ].map((song, index) => (
            <div
              key={index}
              style={{
                width: 900,
                height: 160,
                backgroundColor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 24,
                padding: '24px 32px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
                transform: `translateY(${interpolate(
                  frame,
                  [(SEQUENCES.canciones.start + 0.2 + index * 0.15) * fps, (SEQUENCES.canciones.start + 0.5 + index * 0.15) * fps],
                  [50, 0],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}px)`,
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.canciones.start + 0.2 + index * 0.15) * fps, (SEQUENCES.canciones.start + 0.5 + index * 0.15) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
                boxShadow: frame > (SEQUENCES.canciones.start + 0.8 + index * 0.7) * fps && 
                  frame < (SEQUENCES.canciones.start + 1.5 + index * 0.7) * fps && index < 3 ? 
                  `0 0 40px rgba(54,226,180,0.25)` : '0 12px 40px rgba(54,226,180,0.25)',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: colors.pleiaGreen,
                  marginRight: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: colors.bg,
                }}
              >
                {song.artist.charAt(0).toUpperCase()}
              </div>
              
              {/* Info */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 60,
                    fontWeight: 700,
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  {song.title}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 400,
                    color: colors.text,
                    opacity: 0.8,
                  }}
                >
                  {song.artist}
                </div>
              </div>
              
              {/* Play button - solo en las 3 primeras */}
              {index < 3 && frame > (SEQUENCES.canciones.start + 0.8 + index * 0.7) * fps && 
               frame < (SEQUENCES.canciones.start + 1.5 + index * 0.7) * fps && (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: colors.pleiaGreen,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    color: colors.bg,
                  }}
                >
                  ▶︎
                </div>
              )}
              
              {/* Duración */}
              <div
                style={{
                  fontSize: 36,
                  color: colors.text,
                  opacity: 0.6,
                  marginLeft: 24,
                }}
              >
                {song.duration}
              </div>
            </div>
          ))}
          
          {/* Cursor hover - solo en las 3 primeras */}
          <div
            style={{
              position: 'absolute',
              left: 540,
              top: interpolate(
                frame,
                [(SEQUENCES.canciones.start + 0.8) * fps, (SEQUENCES.canciones.start + 2.1) * fps],
                [400, 700],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              width: 24,
              height: 24,
              backgroundColor: colors.pleiaGreen,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${colors.pleiaGreen}`,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* SPOTIFY - Flujo real desde las canciones */}
      <Sequence from={SEQUENCES.spotify.start * fps} durationInFrames={SEQUENCES.spotify.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          {/* Botón Abrir en Spotify */}
          <div
            style={{
              width: 420,
              height: 100,
              backgroundColor: colors.spotifyGreen,
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              fontWeight: 600,
              color: 'white',
              marginBottom: 40,
              boxShadow: `0 8px 20px rgba(0,0,0,0.4)`,
              transform: `scale(${interpolate(
                frame,
                [(SEQUENCES.spotify.start + 0.3) * fps, (SEQUENCES.spotify.start + 0.5) * fps],
                [1, 0.8],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )})`,
            }}
          >
            Abrir en Spotify
          </div>
          
          {/* Logo Spotify limpio */}
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: '50%',
              backgroundColor: colors.spotifyGreen,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 40px rgba(30,215,96,0.4)`,
              transform: `scale(${interpolate(
                frame,
                [(SEQUENCES.spotify.start + 0.5) * fps, (SEQUENCES.spotify.start + 0.8) * fps],
                [0.4, 1.2],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )})`,
              opacity: interpolate(
                frame,
                [(SEQUENCES.spotify.start + 0.8) * fps, (SEQUENCES.spotify.start + 1.0) * fps],
                [1, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            <svg width="120" height="120" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.5c-.15.24-.42.32-.66.18-1.83-1.12-4.13-1.37-6.84-.75-.27.05-.55-.11-.6-.38-.05-.27.11-.55.38-.6 3.05-.68 5.65-.4 7.8.87.24.15.32.42.18.66zm1.2-2.1c-.18.29-.51.38-.8.21-2.09-1.28-5.28-1.65-7.76-.9-.33.1-.68-.08-.78-.41-.1-.33.08-.68.41-.78 2.8-.85 6.3-.45 8.7 1.03.29.18.38.51.21.8zm.1-2.2C15.25 8.5 8.87 8.16 5.29 9.08c-.4.12-.82-.12-.94-.52-.12-.4.12-.82.52-.94 4.05-1.22 10.95-.82 15.1 1.19.37.22.49.68.27 1.05-.22.37-.68.49-1.05.27z"/>
            </svg>
          </div>
          
          {/* Estrella oficial empezando a aparecer por detrás */}
          <div
            style={{
              position: 'absolute',
              left: 540,
              top: interpolate(
                frame,
                [(SEQUENCES.spotify.start + 0.7) * fps, (SEQUENCES.spotify.start + 1.0) * fps],
                [1920, 1200],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.pleiaGreen} 0%, ${colors.pleiaBlue} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 80,
              color: colors.bg,
              opacity: interpolate(
                frame,
                [(SEQUENCES.spotify.start + 0.7) * fps, (SEQUENCES.spotify.start + 1.0) * fps],
                [0, 0.8],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              zIndex: -1,
            }}
          >
            ★
          </div>
          
          {/* Cursor */}
          <div
            style={{
              position: 'absolute',
              left: 540,
              top: 1780,
              width: 24,
              height: 24,
              backgroundColor: colors.pleiaGreen,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${colors.pleiaGreen}`,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* ESTRELLA - Movimiento frontal con giro de cámara */}
      <Sequence from={SEQUENCES.estrella.start * fps} durationInFrames={SEQUENCES.estrella.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Estrella oficial PLEIA */}
          <div
            style={{
              position: 'absolute',
              left: interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 1.0) * fps],
                [540, 700],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              top: interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 1.0) * fps],
                [-200, 960],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.pleiaGreen} 0%, ${colors.pleiaBlue} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 80,
              color: colors.bg,
              filter: `blur(${interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 1.0) * fps],
                [0, 25],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              boxShadow: `0 0 40px rgba(54,226,180,0.5)`,
            }}
          >
            ★
          </div>
          
          {/* Estela gradiente */}
          <div
            style={{
              position: 'absolute',
              left: interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 1.0) * fps],
                [540, 700],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              top: interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 1.0) * fps],
                [-200, 960],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(54,226,180,0.3) 0%, rgba(91,140,255,0.2) 50%, transparent 100%)`,
              filter: 'blur(20px)',
            }}
          />
          
          {/* Flash verde-azulado */}
          <div
            style={{
              position: 'absolute',
              left: 540,
              top: 960,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(54,226,180,0.3) 0%, transparent 70%)`,
              opacity: interpolate(
                frame,
                [(SEQUENCES.estrella.start + 0.8) * fps, (SEQUENCES.estrella.start + 1.0) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          />
          
          {/* Logo PLEIA apareciendo gradualmente */}
          <div
            style={{
              transform: `translateY(${interpolate(
                frame,
                [(SEQUENCES.estrella.start + 1.0) * fps, (SEQUENCES.estrella.start + 1.5) * fps],
                [40, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              opacity: interpolate(
                frame,
                [(SEQUENCES.estrella.start + 1.0) * fps, (SEQUENCES.estrella.start + 1.5) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            <h1
              style={{
                fontSize: 160,
                fontWeight: 700,
                color: colors.text,
                textAlign: 'center',
                lineHeight: 1.1,
                marginBottom: 20,
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
                margin: '0 auto',
                marginTop: -10,
                boxShadow: `0 0 20px ${colors.pleiaGreen}`,
              }}
            >
              ★
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* LOGO + FRASES DINÁMICAS */}
      <Sequence from={SEQUENCES.logoFrases.start * fps} durationInFrames={SEQUENCES.logoFrases.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          {/* Logo PLEIA */}
          <h1
            style={{
              fontSize: 160,
              fontWeight: 700,
              color: colors.text,
              textAlign: 'center',
              lineHeight: 1.1,
              marginBottom: 20,
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
              margin: '0 auto',
              marginTop: -10,
              marginBottom: 40,
              boxShadow: `0 0 20px ${colors.pleiaGreen}`,
            }}
          >
            ★
          </div>
          
          {/* Texto dinámico palabra a palabra */}
          <div
            style={{
              fontSize: 100,
              fontWeight: 700,
              color: colors.text,
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            <span
              style={{
                opacity: interpolate(
                  frame,
                  [SEQUENCES.logoFrases.start * fps, (SEQUENCES.logoFrases.start + 0.1) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              Primera IA generadora de playlists
            </span>
            <br />
            <span
              style={{
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.logoFrases.start + 0.6) * fps, (SEQUENCES.logoFrases.start + 0.7) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
                textShadow: frame > (SEQUENCES.logoFrases.start + 0.6) * fps ? 
                  `0 0 20px ${colors.pleiaGreen}` : 'none',
              }}
            >
              en tiempo real.
            </span>
          </div>
          
          {/* Cambio lateral */}
          <div
            style={{
              fontSize: 100,
              fontWeight: 700,
              color: colors.text,
              textAlign: 'center',
              lineHeight: 1.1,
              transform: `translateX(${interpolate(
                frame,
                [(SEQUENCES.logoFrases.start + 1.0) * fps, (SEQUENCES.logoFrases.start + 1.4) * fps],
                [100, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              opacity: interpolate(
                frame,
                [(SEQUENCES.logoFrases.start + 1.0) * fps, (SEQUENCES.logoFrases.start + 1.4) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            <span
              style={{
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.logoFrases.start + 1.2) * fps, (SEQUENCES.logoFrases.start + 1.3) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              Canciones
            </span>
            <span
              style={{
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.logoFrases.start + 1.3) * fps, (SEQUENCES.logoFrases.start + 1.4) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              {' '}nuevas{' '}
            </span>
            <span
              style={{
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.logoFrases.start + 1.4) * fps, (SEQUENCES.logoFrases.start + 1.5) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              al momento
            </span>
          </div>
          
          {/* Fondo gradiente */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(45deg, rgba(54,226,180,0.2) 0%, rgba(91,140,255,0.2) 100%)`,
              opacity: interpolate(
                frame,
                [SEQUENCES.logoFrases.start * fps, (SEQUENCES.logoFrases.start + 0.5) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* CONSEJOS - Sin corte, zoom out */}
      <Sequence from={SEQUENCES.consejos.start * fps} durationInFrames={SEQUENCES.consejos.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          <h2
            style={{
              fontSize: 70,
              fontWeight: 700,
              color: colors.text,
              marginBottom: 60,
              textAlign: 'center',
            }}
          >
            Consejos para pedir tu playlist
          </h2>
          
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 40,
              maxWidth: 800,
            }}
          >
            {[
              "Usa tu mood del momento.",
              "Añade un artista o género.",
              "Incluye el plan o lugar.",
              "playlists para calentar para el festival Riverland",
            ].map((tip, index) => (
              <div
                key={index}
                style={{
                  width: 700,
                  height: 160,
                  backgroundColor: colors.cardBg,
                  borderRadius: 24,
                  padding: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 44,
                  color: colors.text,
                  textAlign: 'center',
                  boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
                  transform: index === 3 ? `scale(${interpolate(
                    frame,
                    [(SEQUENCES.consejos.start + 1.5) * fps, (SEQUENCES.consejos.start + 1.8) * fps],
                    [1, 1.1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                  )})` : 'scale(1)',
                }}
              >
                {tip}
              </div>
            ))}
          </div>
          
          {/* Creando playlist */}
          <div
            style={{
              fontSize: 90,
              fontWeight: 700,
              color: colors.text,
              marginTop: 60,
              textAlign: 'center',
              opacity: interpolate(
                frame,
                [(SEQUENCES.consejos.start + 1.8) * fps, (SEQUENCES.consejos.start + 2.0) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            Creando playlist…
          </div>
          
          {/* Cursor */}
          <div
            style={{
              position: 'absolute',
              left: 540,
              top: 1500,
              width: 24,
              height: 24,
              backgroundColor: colors.pleiaGreen,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${colors.pleiaGreen}`,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* NUEVA PLAYLIST - De la card expandida */}
      <Sequence from={SEQUENCES.nuevaPlaylist.start * fps} durationInFrames={SEQUENCES.nuevaPlaylist.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          {Array.from({ length: 10 }, (_, index) => (
            <div
              key={index}
              style={{
                width: 900,
                height: 160,
                backgroundColor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 24,
                padding: '24px 32px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
                transform: `translateY(${interpolate(
                  frame,
                  [(SEQUENCES.nuevaPlaylist.start + 0.3 + index * 0.12) * fps, (SEQUENCES.nuevaPlaylist.start + 0.6 + index * 0.12) * fps],
                  [50, 0],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}px)`,
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.nuevaPlaylist.start + 0.3 + index * 0.12) * fps, (SEQUENCES.nuevaPlaylist.start + 0.6 + index * 0.12) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: colors.pleiaGreen,
                  marginRight: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: colors.bg,
                }}
              >
                {String.fromCharCode(65 + index)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 60,
                    fontWeight: 700,
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  Canción {index + 1}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 400,
                    color: colors.text,
                    opacity: 0.8,
                  }}
                >
                  Artista {index + 1}
                </div>
              </div>
              
              <div
                style={{
                  fontSize: 36,
                  color: colors.text,
                  opacity: 0.6,
                }}
              >
                {Math.floor(Math.random() * 3) + 2}:{Math.floor(Math.random() * 60).toString().padStart(2, '0')}
              </div>
            </div>
          ))}
          
          {/* Cursor hover - solo en las primeras 4 */}
          <div
            style={{
              position: 'absolute',
              left: 540,
              top: interpolate(
                frame,
                [(SEQUENCES.nuevaPlaylist.start + 0.8) * fps, (SEQUENCES.nuevaPlaylist.start + 2.0) * fps],
                [400, 1000],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              width: 24,
              height: 24,
              backgroundColor: colors.pleiaGreen,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${colors.pleiaGreen}`,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* MIS PLAYLISTS - Sin corte */}
      <Sequence from={SEQUENCES.misPlaylists.start * fps} durationInFrames={SEQUENCES.misPlaylists.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            padding: 30,
          }}
        >
          {/* Barra Mis playlists */}
          <div
            style={{
              width: 200,
              height: 60,
              backgroundColor: colors.cardBg,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              color: colors.text,
              fontWeight: 600,
              marginBottom: 40,
              boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
            }}
          >
            Mis playlists
          </div>
          
          {[
            { name: "Fiesta Reggaeton", creator: "PLEIA", songs: 24 },
            { name: "Chill Vibes", creator: "PLEIA", songs: 18 },
            { name: "Workout Energy", creator: "PLEIA", songs: 32 },
          ].map((playlist, index) => (
            <div
              key={index}
              style={{
                width: 960,
                height: 500,
                backgroundColor: colors.cardBg,
                borderRadius: 30,
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
                transform: `translateY(${interpolate(
                  frame,
                  [(SEQUENCES.misPlaylists.start + 0.5 + index * 0.2) * fps, (SEQUENCES.misPlaylists.start + 1.0 + index * 0.2) * fps],
                  [100, 0],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}px)`,
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.misPlaylists.start + 0.5 + index * 0.2) * fps, (SEQUENCES.misPlaylists.start + 1.0 + index * 0.2) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
                boxShadow: index === 1 && frame > (SEQUENCES.misPlaylists.start + 1.0) * fps ? 
                  `0 0 40px rgba(54,226,180,0.25)` : '0 12px 40px rgba(54,226,180,0.25)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 70,
                    fontWeight: 700,
                    color: colors.text,
                    marginBottom: 16,
                  }}
                >
                  {playlist.name}
                </div>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 400,
                    color: colors.text,
                    opacity: 0.8,
                  }}
                >
                  {playlist.creator}
                </div>
              </div>
              
              <div
                style={{
                  fontSize: 40,
                  color: colors.text,
                  opacity: 0.6,
                }}
              >
                {playlist.songs} canciones
              </div>
            </div>
          ))}
          
          {/* Cursor */}
          <div
            style={{
              position: 'absolute',
              left: 960,
              top: 180,
              width: 24,
              height: 24,
              backgroundColor: colors.pleiaGreen,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${colors.pleiaGreen}`,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* NAVEGADOR + LINK */}
      <Sequence from={SEQUENCES.navegador.start * fps} durationInFrames={SEQUENCES.navegador.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 100,
          }}
        >
          {/* Barra navegador Safari */}
          <div
            style={{
              width: 1000,
              height: 80,
              backgroundColor: colors.white,
              borderRadius: 14,
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontSize: 60,
                color: colors.linkBlue,
                fontWeight: 500,
              }}
            >
              playlists.jeylabbb.com
            </div>
            
            {/* Subrayado animado */}
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: 24,
                width: `${interpolate(
                  frame,
                  [(SEQUENCES.navegador.start + 0.5) * fps, (SEQUENCES.navegador.start + 0.9) * fps],
                  [0, 100],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}%`,
                height: 3,
                backgroundColor: colors.linkBlue,
                borderRadius: 2,
              }}
            />
          </div>
          
          {/* Barra de carga */}
          <div
            style={{
              width: 600,
              height: 8,
              backgroundColor: colors.border,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${interpolate(
                  frame,
                  [(SEQUENCES.navegador.start + 1.0) * fps, (SEQUENCES.navegador.start + 1.6) * fps],
                  [0, 100],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}%`,
                height: '100%',
                backgroundColor: colors.pleiaGreen,
                borderRadius: 4,
              }}
            />
          </div>
          
          {/* Cursor */}
          <div
            style={{
              position: 'absolute',
              left: 540,
              top: 200,
              width: 24,
              height: 24,
              backgroundColor: colors.pleiaGreen,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${colors.pleiaGreen}`,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* LOOP FINAL */}
      <Sequence from={SEQUENCES.loopFinal.start * fps} durationInFrames={SEQUENCES.loopFinal.duration * fps}>
        <AbsoluteFill
          style={{
            backgroundColor: frame > (SEQUENCES.loopFinal.start + 0.3) * fps ? 
              (frame > (SEQUENCES.loopFinal.start + 0.45) * fps ? colors.bg : '#FFFFFF') : 'transparent',
            opacity: frame > (SEQUENCES.loopFinal.start + 0.2) * fps ? 1 : 0,
            transform: `scale(${interpolate(
              frame,
              [(SEQUENCES.loopFinal.start + 0.1) * fps, (SEQUENCES.loopFinal.start + 0.3) * fps],
              [1, 1.5],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}) blur(${interpolate(
              frame,
              [(SEQUENCES.loopFinal.start + 0.1) * fps, (SEQUENCES.loopFinal.start + 0.3) * fps],
              [0, 20],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}px)`,
          }}
        >
          {/* Frame inicial para loop perfecto */}
          {frame > (SEQUENCES.loopFinal.start + 1.5) * fps && (
            <AbsoluteFill
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 40,
              }}
            >
              {/* Caja de prompt inicial */}
              <div
                style={{
                  width: 900,
                  height: 140,
                  backgroundColor: colors.cardBg,
                  border: `2px solid ${colors.border}`,
                  borderRadius: 24,
                  padding: '0 32px',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
                }}
              >
                <div
                  style={{
                    fontSize: 54,
                    color: colors.text,
                    fontWeight: 500,
                  }}
                >
                  reggaetón para salir de fiesta
                </div>
              </div>
              
              {/* Botón Crear playlist */}
              <div
                style={{
                  width: 300,
                  height: 80,
                  background: `linear-gradient(135deg, ${colors.pleiaBlue} 0%, ${colors.pleiaGreen} 100%)`,
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 44,
                  fontWeight: 600,
                  color: colors.bg,
                }}
              >
                Crear playlist
              </div>
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

