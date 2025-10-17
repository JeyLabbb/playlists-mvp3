import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio, Easing } from 'remotion';

interface SimplePromoV13Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV13: React.FC<SimplePromoV13Props> = ({
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

  // Componente de cursor animado preciso
  const AnimatedCursor = ({ x, y, isClicking = false, delay = 0 }) => {
    const cursorFrame = frame - delay;
    const pulseScale = spring({
      frame: cursorFrame,
      fps,
      config: { damping: 200, stiffness: 200 },
    });
    
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: '20px',
          height: '20px',
          backgroundColor: colors.accentCyan,
          borderRadius: '50%',
          boxShadow: `0 0 12px rgba(34, 211, 238, 0.6)`,
          transform: `scale(${isClicking ? 0.8 : pulseScale})`,
          opacity: interpolate(
            cursorFrame,
            [0, 10, 20],
            [0, 1, 1],
            { extrapolateRight: 'clamp' }
          ),
          zIndex: 1000,
        }}
      >
        {isClicking && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '40px',
              height: '40px',
              border: `2px solid ${colors.accentCyan}`,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: interpolate(
                cursorFrame,
                [0, 10],
                [1, 0],
                { extrapolateRight: 'clamp' }
              ),
            }}
          />
        )}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ 
      backgroundColor: colors.lightGray,
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
              padding: '30px', // Márgenes más finos
            }}
          >
            {/* Logo JeyLabbb discreto en esquina */}
            <div
              style={{
                position: 'absolute',
                top: '30px',
                left: '30px',
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
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: colors.accentCyan,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: colors.blackBase,
                  opacity: 0.6,
                }}
              >
                JL
              </div>
            </div>

            {/* Texto principal centrado - más grande */}
            <h1
              style={{
                fontSize: '64px', // Más grande
                fontWeight: '700',
                color: colors.blackBase,
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.1, // Más compacto
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
        
        {/* Audio whoosh */}
        <Audio src="/studio/audio/whoosh.wav" startFrom={0} volume={0.6} endAt={15} />
      </Sequence>

      {/* Scene 2: Prompt y entrada del usuario (0:02-0:06) - ZOOM AUTÉNTICO */}
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
              padding: '20px', // Márgenes más finos
            }}
          >
            {/* Caja del prompt - UI real ocupando 80% de la pantalla (más grande) */}
            <div
              style={{
                width: '80%', // Más grande
                maxWidth: '700px', // Más grande
                background: colors.white,
                borderRadius: '20px', // Más redondeado
                padding: '40px', // Más padding
                boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
                transform: `scale(${interpolate(
                  frame - scenes.prompt.start,
                  [0, 30],
                  [0.2, 1], // Zoom más dramático
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
                  fontSize: '32px', // Más grande
                  fontWeight: '600',
                  color: colors.blackBase,
                  marginBottom: '32px', // Más espacio
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
              
              {/* Textarea del prompt - más grande */}
              <textarea
                rows={4} // Más filas
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
                  borderRadius: '16px', // Más redondeado
                  padding: '20px 24px', // Más padding
                  color: colors.blackBase,
                  fontSize: '20px', // Más grande
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  marginBottom: '24px',
                  minHeight: '120px', // Más alto
                  opacity: interpolate(
                    frame - scenes.prompt.start,
                    [50, 70],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
                readOnly
              />
              
              {/* Cursor parpadeante - más grande */}
              <div
                style={{
                  position: 'absolute',
                  right: '64px',
                  bottom: '144px',
                  width: '3px', // Más grueso
                  height: '28px', // Más alto
                  backgroundColor: colors.accentCyan,
                  opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                  transition: 'opacity 0.1s',
                  borderRadius: '2px',
                }}
              />

              {/* Botón de envío - más grande */}
              <button
                style={{
                  background: colors.spotifyGreen,
                  color: 'white',
                  border: 'none',
                  borderRadius: '28px', // Más redondeado
                  padding: '18px 40px', // Más grande
                  fontSize: '18px', // Más grande
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
                  boxShadow: '0 4px 16px rgba(29, 185, 84, 0.3)',
                }}
              >
                Generar Playlist
              </button>
            </div>
          </div>
        </AbsoluteFill>
        
        {/* Audio teclado */}
        <Audio src="/studio/audio/keyboard clicks.wav" startFrom={60} volume={0.4} endAt={120} />
      </Sequence>

      {/* Scene 3: Generación de canciones (0:06-0:12) - TRANSICIONES MÁS FLUIDAS */}
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
              padding: '20px', // Márgenes más finos
            }}
          >
            {/* Contenedor de resultados - más grande */}
            <div
              style={{
                width: '90%', // Más grande
                maxWidth: '800px', // Más grande
                background: colors.white,
                borderRadius: '24px', // Más redondeado
                padding: '40px', // Más padding
                boxShadow: '0 16px 64px rgba(0,0,0,0.2)',
                border: '1px solid rgba(0,0,0,0.08)',
                transform: `scale(${interpolate(
                  frame - scenes.generation.start,
                  [0, 20], // Transición más rápida
                  [0.95, 1],
                  { extrapolateRight: 'clamp', easing: easeOutCubic }
                )})`,
              }}
            >
              {/* Header con logo real */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '32px',
                  opacity: interpolate(
                    frame - scenes.generation.start,
                    [0, 20],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: colors.accentCyan,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: colors.blackBase,
                  }}
                >
                  JL
                </div>
                <h3
                  style={{
                    fontSize: '28px', // Más grande
                    fontWeight: '600',
                    color: colors.blackBase,
                    margin: 0,
                  }}
                >
                  Tu playlist generada
                </h3>
              </div>

              {/* Lista de canciones - más grande */}
              <div style={{ maxHeight: '65vh', overflow: 'hidden' }}>
                {exactTracks.map((track, index) => {
                  const trackStart = scenes.generation.start + (index * 36); // 3 segundos cada una
                  const trackProgress = frame - trackStart;
                  const isActive = trackProgress >= 0 && trackProgress < 90; // 3 segundos
                  const isPlaying = trackProgress >= 20 && trackProgress < 70; // 1.7s de preview
                  
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '20px 0', // Más padding
                        borderBottom: index < exactTracks.length - 1 ? '1px solid #E5E5E7' : 'none',
                        backgroundColor: isActive ? 'rgba(29, 185, 84, 0.08)' : 'transparent',
                        borderRadius: '16px', // Más redondeado
                        padding: isActive ? '24px 20px' : '20px 0',
                        transform: isActive ? `scale(1.03) translateY(-3px)` : `scale(1) translateY(0px)`,
                        transition: 'all 0.15s ease', // Transición más rápida
                        position: 'relative',
                        boxShadow: isActive ? '0 8px 24px rgba(29, 185, 84, 0.15)' : 'none',
                      }}
                    >
                      {/* Indicador de reproducción - más grande */}
                      {isPlaying && track.hasAudio && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '40px', // Más grande
                            height: '40px',
                            backgroundColor: colors.spotifyGreen,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px', // Más grande
                            color: 'white',
                            animation: 'pulse 0.8s infinite',
                            transform: `scale(${interpolate(
                              trackProgress,
                              [20, 40],
                              [0.9, 1.2],
                              { extrapolateRight: 'clamp' }
                            )})`,
                            boxShadow: '0 4px 16px rgba(29, 185, 84, 0.4)',
                          }}
                        >
                          ▶
                        </div>
                      )}
                      
                      <div
                        style={{
                          fontSize: '24px', // Más grande
                          fontWeight: '600',
                          color: colors.blackBase,
                          marginBottom: '6px',
                          opacity: interpolate(
                            trackProgress,
                            [0, 15], // Aparición más rápida
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '18px', // Más grande
                          color: '#6B7280',
                          fontWeight: '500',
                          opacity: interpolate(
                            trackProgress,
                            [0, 15],
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

        {/* Audio de las canciones */}
        {exactTracks.map((track, index) => {
          const trackStart = scenes.generation.start + (index * 36);
          const isPlaying = frame >= trackStart + 20 && frame < trackStart + 70 && track.hasAudio;
          
          const audioFiles = [
            '/studio/audio/Do You Remember-Xiyo Fernandezz Eix.m4a',
            '/studio/audio/Pa Q Me Escribes-Vreno Yg.m4a',
            '/studio/audio/Suena Cool-Mvrk Lhaine.m4a',
            '', // Sin audio para Guxo
            ''  // Sin audio para West SRK
          ];

          return isPlaying && audioFiles[index] ? (
            <Audio
              key={index}
              src={audioFiles[index]}
              startFrom={trackStart + 20 - scenes.generation.start}
              volume={0.7}
              endAt={trackStart + 70 - scenes.generation.start}
            />
          ) : null;
        })}
        
        {/* Audio swoosh */}
        <Audio src="/studio/audio/swoosh.mp3" startFrom={0} volume={0.5} endAt={20} />
      </Sequence>

      {/* Scene 4: Añadir canciones a playlist (0:12-0:16) - CURSOR PRECISO */}
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
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '90%',
                maxWidth: '800px',
                background: colors.white,
                borderRadius: '24px',
                padding: '40px',
                boxShadow: '0 16px 64px rgba(0,0,0,0.2)',
                border: '1px solid rgba(0,0,0,0.08)',
                transform: `scale(${interpolate(
                  frame - scenes.playlist.start,
                  [0, 15],
                  [0.98, 1],
                  { extrapolateRight: 'clamp' }
                )})`,
              }}
            >
              <h3
                style={{
                  fontSize: '28px',
                  fontWeight: '600',
                  color: colors.blackBase,
                  marginBottom: '32px',
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

              {/* Lista con selección - más grande */}
              <div>
                {exactTracks.slice(0, 3).map((track, index) => {
                  const selectStart = scenes.playlist.start + (index * 25);
                  const isSelected = frame >= selectStart + 10;
                  
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '20px 0',
                        borderBottom: index < 2 ? '1px solid #E5E5E7' : 'none',
                        backgroundColor: isSelected ? 'rgba(29, 185, 84, 0.12)' : 'transparent',
                        borderRadius: '16px',
                        padding: isSelected ? '24px 20px' : '20px 0',
                        transform: isSelected ? `scale(1.03)` : `scale(1)`,
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxShadow: isSelected ? '0 8px 24px rgba(29, 185, 84, 0.2)' : 'none',
                      }}
                    >
                      {/* Cursor clickeando cada canción */}
                      {frame >= selectStart + 5 && frame < selectStart + 15 && (
                        <AnimatedCursor
                          x="90%"
                          y="50%"
                          isClicking={frame >= selectStart + 10 && frame < selectStart + 12}
                          delay={selectStart + 5}
                        />
                      )}
                      
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '32px',
                            height: '32px',
                            backgroundColor: colors.spotifyGreen,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: 'white',
                            boxShadow: '0 4px 16px rgba(29, 185, 84, 0.4)',
                          }}
                        >
                          ✓
                        </div>
                      )}
                      
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '600',
                          color: colors.blackBase,
                          marginBottom: '6px',
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
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

              {/* Botón crear playlist - más grande */}
              <div
                style={{
                  marginTop: '40px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.playlist.start,
                    [75, 105],
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
                    borderRadius: '28px',
                    padding: '20px 48px', // Más grande
                    fontSize: '20px', // Más grande
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    margin: '0 auto',
                    boxShadow: '0 8px 24px rgba(29, 185, 84, 0.4)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: colors.spotifyGreen,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    ♫
                  </div>
                  Añadir a Spotify
                </button>
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        {/* Audio clicks */}
        {exactTracks.slice(0, 3).map((_, index) => (
          <Audio
            key={index}
            src="/studio/audio/button click.wav"
            startFrom={scenes.playlist.start + (index * 25) + 10}
            volume={0.7}
            endAt={scenes.playlist.start + (index * 25) + 15}
          />
        ))}
      </Sequence>

      {/* Scene 5: Playlist final y otras recomendaciones (0:16-0:20) - TRES PLAYLISTS GRANDES */}
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
              padding: '15px', // Márgenes más finos
            }}
          >
            <div
              style={{
                width: '95%', // Casi toda la pantalla
                maxWidth: '900px',
                background: colors.white,
                borderRadius: '24px',
                padding: '40px',
                boxShadow: '0 16px 64px rgba(0,0,0,0.2)',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <h3
                style={{
                  fontSize: '32px', // Más grande
                  fontWeight: '700',
                  color: colors.blackBase,
                  marginBottom: '32px',
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

              {/* Tres playlists ocupando casi toda la pantalla */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                {[
                  { name: 'Underground Español', tracks: 12, color: colors.spotifyGreen },
                  { name: 'Música para Trabajar', tracks: 8, color: colors.accentCyan },
                  { name: 'Lo Mejor del Rap', tracks: 15, color: '#FF6B35' },
                ].map((playlist, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'white',
                      borderRadius: '20px', // Más redondeado
                      padding: '32px', // Más grande
                      textAlign: 'center',
                      border: '1px solid #E5E5E7',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      flex: 1, // Ocupa el espacio disponible
                      transform: `translateY(${interpolate(
                        frame - scenes.final.start,
                        [index * 15, (index * 15) + 25],
                        [30, 0],
                        { extrapolateRight: 'clamp' }
                      )}px)`,
                      opacity: interpolate(
                        frame - scenes.final.start,
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
                        background: playlist.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px', // Más grande
                        margin: '0 auto 16px auto',
                        boxShadow: `0 8px 24px ${playlist.color}50`,
                      }}
                    >
                      🎵
                    </div>
                    <div
                      style={{
                        fontSize: '20px', // Más grande
                        fontWeight: '600',
                        color: colors.blackBase,
                        marginBottom: '8px',
                      }}
                    >
                      {playlist.name}
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        color: '#6B7280',
                      }}
                    >
                      {playlist.tracks} canciones
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmación con logo Spotify - más grande */}
              <div
                style={{
                  marginTop: '32px',
                  textAlign: 'center',
                  opacity: interpolate(
                    frame - scenes.final.start,
                    [75, 105],
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
                    gap: '12px',
                    fontSize: '20px', // Más grande
                    color: colors.blackBase,
                    fontWeight: '600',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: colors.spotifyGreen,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    ♫
                  </div>
                  Abriendo en Spotify...
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        {/* Audio success */}
        <Audio src="/studio/audio/success.wav" startFrom={75} volume={0.6} endAt={105} />
      </Sequence>

      {/* Scene 6: CTA final y loop (0:20-0:24) - CURSOR PRECISO EN LINK */}
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
              padding: '30px',
            }}
          >
            {/* CTA principal - más grande */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '50px',
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
                  fontSize: '56px', // Más grande
                  fontWeight: '700',
                  color: colors.blackBase,
                  margin: 0,
                  marginBottom: '20px',
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
                  fontSize: '32px', // Más grande
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

            {/* Enlace clickeable - más grande */}
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
                  fontSize: '28px', // Más grande
                  color: colors.spotifyGreen,
                  fontWeight: '600',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '20px 40px', // Más grande
                  background: 'white',
                  borderRadius: '20px', // Más redondeado
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  border: '2px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                playlists.jeylabbb.com
              </div>

              {/* Cursor animado - PRECISO en el enlace */}
              {frame >= scenes.cta.start + 70 && (
                <AnimatedCursor
                  x="50%"
                  y="50%"
                  isClicking={frame >= scenes.cta.start + 85 && frame < scenes.cta.start + 95}
                  delay={scenes.cta.start + 70}
                />
              )}
            </div>

            {/* Carga rápida - más suave */}
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
        
        {/* Audio click final */}
        <Audio src="/studio/audio/button click.wav" startFrom={85} volume={0.8} endAt={95} />
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
