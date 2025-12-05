/**
 * VideoV3 - Versión premium con foco en ritmo, claridad y estética Apple-Spotify
 * Mantiene loop perfecto con frame inicial del primer video
 */

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// Configuración del video
const VIDEO_DURATION = 25; // segundos
const FPS = 30;

// Colores y estilos premium
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

// Secuencias de tiempo (en segundos)
const SEQUENCES = {
  intro: { start: 0, duration: 0.4 },
  resultados: { start: 0.4, duration: 3.4 },
  spotify: { start: 3.8, duration: 1.0 },
  estrella: { start: 4.8, duration: 1.2 },
  logo: { start: 6.0, duration: 1.0 },
  texto: { start: 7.0, duration: 2.0 },
  consejos: { start: 9.0, duration: 1.4 },
  nuevaPlaylist: { start: 10.4, duration: 2.6 },
  misPlaylists: { start: 13.0, duration: 2.0 },
  linkFinal: { start: 15.0, duration: 2.0 },
  loopFinal: { start: 17.0, duration: 1.0 },
};

export const VideoV3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Animaciones base
  const blurProgress = interpolate(
    frame,
    [0, 0.3 * fps],
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
      {/* Fondo con gradiente radial sutil */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${colors.bgSecondary} 0%, ${colors.bg} 100%)`,
        }}
      />
      
      {/* INTRO DIRECTA - Solo caja de prompt */}
      <Sequence from={SEQUENCES.intro.start * fps} durationInFrames={SEQUENCES.intro.duration * fps}>
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
                [(SEQUENCES.intro.start + 0.2) * fps, (SEQUENCES.intro.start + 0.4) * fps],
                [1, 1.05],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )})`,
            }}
          >
            <div
              style={{
                fontSize: 46,
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
              fontSize: 46,
              fontWeight: 600,
              color: colors.bg,
              cursor: 'pointer',
              transform: `scale(${interpolate(
                frame,
                [(SEQUENCES.intro.start + 0.25) * fps, (SEQUENCES.intro.start + 0.35) * fps],
                [0.95, 1.05],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )})`,
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
                [(SEQUENCES.intro.start + 0.1) * fps, (SEQUENCES.intro.start + 0.2) * fps],
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
      
      {/* RESULTADOS - SongCards en cascada */}
      <Sequence from={SEQUENCES.resultados.start * fps} durationInFrames={SEQUENCES.resultados.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 50,
            transform: `scale(${interpolate(
              frame,
              [SEQUENCES.resultados.start * fps, (SEQUENCES.resultados.start + 0.3) * fps],
              [1, 0.9],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}) translateY(${interpolate(
              frame,
              [SEQUENCES.resultados.start * fps, (SEQUENCES.resultados.start + 3.4) * fps],
              [0, -50],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}px)`,
          }}
        >
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
                transform: `translateX(${interpolate(
                  frame,
                  [(SEQUENCES.resultados.start + 0.2 + index * 0.15) * fps, (SEQUENCES.resultados.start + 0.5 + index * 0.15) * fps],
                  [100, 0],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )}px)`,
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.resultados.start + 0.2 + index * 0.15) * fps, (SEQUENCES.resultados.start + 0.5 + index * 0.15) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
                boxShadow: frame > (SEQUENCES.resultados.start + 0.8 + index * 0.7) * fps && 
                  frame < (SEQUENCES.resultados.start + 1.5 + index * 0.7) * fps ? 
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
              {index < 3 && frame > (SEQUENCES.resultados.start + 0.8 + index * 0.7) * fps && 
               frame < (SEQUENCES.resultados.start + 1.5 + index * 0.7) * fps && (
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
                [(SEQUENCES.resultados.start + 0.8) * fps, (SEQUENCES.resultados.start + 2.9) * fps],
                [400, 800],
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
      
      {/* SPOTIFY - Envío */}
      <Sequence from={SEQUENCES.spotify.start * fps} durationInFrames={SEQUENCES.spotify.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translateY(${interpolate(
              frame,
              [SEQUENCES.spotify.start * fps, (SEQUENCES.spotify.start + 0.5) * fps],
              [0, -40],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}px)`,
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
              fontSize: 46,
              fontWeight: 600,
              color: 'white',
              marginBottom: 40,
              boxShadow: `0 8px 20px rgba(0,0,0,0.4)`,
            }}
          >
            Abrir en Spotify
          </div>
          
          {/* Logo Spotify */}
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: '50%',
              backgroundColor: colors.spotifyGreen,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 20px rgba(0,0,0,0.4)`,
              transform: `scale(${interpolate(
                frame,
                [(SEQUENCES.spotify.start + 0.3) * fps, (SEQUENCES.spotify.start + 0.6) * fps],
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
      
      {/* ESTRELLA - Movimiento diagonal */}
      <Sequence from={SEQUENCES.estrella.start * fps} durationInFrames={SEQUENCES.estrella.duration * fps}>
        <AbsoluteFill
          style={{
            transform: `rotateY(${interpolate(
              frame,
              [(SEQUENCES.estrella.start + 0.3) * fps, (SEQUENCES.estrella.start + 0.9) * fps],
              [0, 18],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}deg)`,
          }}
        >
          {/* Estrella oficial PLEIA */}
          <div
            style={{
              position: 'absolute',
              left: interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 0.6) * fps],
                [-200, 800],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              top: interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 0.6) * fps],
                [-200, 1100],
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
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 0.6) * fps],
                [0, 30],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              boxShadow: `0 0 40px rgba(54,226,180,0.5)`,
            }}
          >
            ★
          </div>
          
          {/* Estela glow */}
          <div
            style={{
              position: 'absolute',
              left: interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 0.6) * fps],
                [-200, 800],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              top: interpolate(
                frame,
                [SEQUENCES.estrella.start * fps, (SEQUENCES.estrella.start + 0.6) * fps],
                [-200, 1100],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(54,226,180,0.3) 0%, rgba(91,140,255,0.2) 50%, transparent 100%)`,
              filter: 'blur(20px)',
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* LOGO PLEIA */}
      <Sequence from={SEQUENCES.logo.start * fps} durationInFrames={SEQUENCES.logo.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Logo PLEIA */}
          <div
            style={{
              transform: `translateY(${interpolate(
                frame,
                [SEQUENCES.logo.start * fps, (SEQUENCES.logo.start + 0.5) * fps],
                [40, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              opacity: interpolate(
                frame,
                [SEQUENCES.logo.start * fps, (SEQUENCES.logo.start + 0.5) * fps],
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
          
          {/* Fondo gradiente azul-verde */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(45deg, rgba(54,226,180,0.2) 0%, rgba(91,140,255,0.2) 100%)`,
              opacity: interpolate(
                frame,
                [SEQUENCES.logo.start * fps, (SEQUENCES.logo.start + 0.5) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* TEXTO DOPAMINÉRICO */}
      <Sequence from={SEQUENCES.texto.start * fps} durationInFrames={SEQUENCES.texto.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            transform: `translateX(${interpolate(
              frame,
              [SEQUENCES.texto.start * fps, (SEQUENCES.texto.start + 2.0) * fps],
              [-50, 50],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}px)`,
          }}
        >
          {/* Bloque 1 */}
          <div
            style={{
              fontSize: 90,
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
                  [SEQUENCES.texto.start * fps, (SEQUENCES.texto.start + 0.15) * fps],
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
                  [(SEQUENCES.texto.start + 0.6) * fps, (SEQUENCES.texto.start + 0.75) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
                textShadow: frame > (SEQUENCES.texto.start + 0.6) * fps ? 
                  `0 0 20px ${colors.pleiaGreen}` : 'none',
              }}
            >
              en tiempo real
            </span>
          </div>
          
          {/* Bloque 2 */}
          <div
            style={{
              fontSize: 90,
              fontWeight: 700,
              color: colors.text,
              textAlign: 'center',
              lineHeight: 1.1,
              transform: `translateX(${interpolate(
                frame,
                [(SEQUENCES.texto.start + 0.4) * fps, (SEQUENCES.texto.start + 0.8) * fps],
                [100, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
              opacity: interpolate(
                frame,
                [(SEQUENCES.texto.start + 0.4) * fps, (SEQUENCES.texto.start + 0.8) * fps],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
            }}
          >
            <span
              style={{
                opacity: interpolate(
                  frame,
                  [(SEQUENCES.texto.start + 1.0) * fps, (SEQUENCES.texto.start + 1.1) * fps],
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
                  [(SEQUENCES.texto.start + 1.1) * fps, (SEQUENCES.texto.start + 1.2) * fps],
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
                  [(SEQUENCES.texto.start + 1.2) * fps, (SEQUENCES.texto.start + 1.3) * fps],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              al momento
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* CONSEJOS */}
      <Sequence from={SEQUENCES.consejos.start * fps} durationInFrames={SEQUENCES.consejos.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${interpolate(
              frame,
              [SEQUENCES.consejos.start * fps, (SEQUENCES.consejos.start + 0.3) * fps],
              [1, 1.1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )})`,
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
                  fontSize: 46,
                  color: colors.text,
                  textAlign: 'center',
                  boxShadow: '0 12px 40px rgba(54,226,180,0.25)',
                  transform: index === 3 ? `scale(${interpolate(
                    frame,
                    [(SEQUENCES.consejos.start + 1.0) * fps, (SEQUENCES.consejos.start + 1.2) * fps],
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
                [(SEQUENCES.consejos.start + 1.2) * fps, (SEQUENCES.consejos.start + 1.4) * fps],
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
      
      {/* NUEVA PLAYLIST */}
      <Sequence from={SEQUENCES.nuevaPlaylist.start * fps} durationInFrames={SEQUENCES.nuevaPlaylist.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            transform: `scale(${interpolate(
              frame,
              [SEQUENCES.nuevaPlaylist.start * fps, (SEQUENCES.nuevaPlaylist.start + 2.6) * fps],
              [1, 1.05],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}) translateY(${interpolate(
              frame,
              [SEQUENCES.nuevaPlaylist.start * fps, (SEQUENCES.nuevaPlaylist.start + 2.6) * fps],
              [0, -100],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}px)`,
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
      
      {/* MIS PLAYLISTS */}
      <Sequence from={SEQUENCES.misPlaylists.start * fps} durationInFrames={SEQUENCES.misPlaylists.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            padding: 30,
          }}
        >
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
                transform: index === 1 ? `scale(${interpolate(
                  frame,
                  [(SEQUENCES.misPlaylists.start + 0.5) * fps, (SEQUENCES.misPlaylists.start + 1.0) * fps],
                  [1, 1.05],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )})` : 'scale(1)',
                boxShadow: index === 1 && frame > (SEQUENCES.misPlaylists.start + 0.5) * fps ? 
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
      
      {/* LINK FINAL + RECARGA */}
      <Sequence from={SEQUENCES.linkFinal.start * fps} durationInFrames={SEQUENCES.linkFinal.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 100,
            transform: `translateY(${interpolate(
              frame,
              [SEQUENCES.linkFinal.start * fps, (SEQUENCES.linkFinal.start + 1.0) * fps],
              [0, -50],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}px)`,
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
                  [(SEQUENCES.linkFinal.start + 0.5) * fps, (SEQUENCES.linkFinal.start + 0.9) * fps],
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
                  [(SEQUENCES.linkFinal.start + 1.0) * fps, (SEQUENCES.linkFinal.start + 1.6) * fps],
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
            backgroundColor: frame > (SEQUENCES.loopFinal.start + 0.15) * fps ? 
              (frame > (SEQUENCES.loopFinal.start + 0.3) * fps ? colors.bg : '#FFFFFF') : 'transparent',
            opacity: frame > (SEQUENCES.loopFinal.start + 0.1) * fps ? 1 : 0,
          }}
        >
          {/* Frame inicial para loop perfecto */}
          {frame > (SEQUENCES.loopFinal.start + 0.9) * fps && (
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
                    fontSize: 46,
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
                  fontSize: 46,
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

