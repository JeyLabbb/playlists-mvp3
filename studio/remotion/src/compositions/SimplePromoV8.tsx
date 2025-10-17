import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio } from 'remotion';

interface SimplePromoV8Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV8: React.FC<SimplePromoV8Props> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing exacto: 20 segundos con loop perfecto
  const scenes = {
    hook: { start: 0, duration: 60 },        // 0:00-0:02 - Inicio con Hook
    typing: { start: 60, duration: 60 },     // 0:02-0:04 - Escribir el Prompt
    zoomOut: { start: 120, duration: 60 },   // 0:04-0:06 - Zoom out y generación
    preview: { start: 180, duration: 180 },  // 0:06-0:12 - Preview de canciones
    spotify: { start: 360, duration: 90 },   // 0:12-0:15 - Añadir a Spotify
    explore: { start: 450, duration: 90 },   // 0:15-0:18 - Explorar Playlists
    cta: { start: 540, duration: 60 },       // 0:18-0:20 - CTA y Loop
  };

  // Canciones exactas disponibles (3 con audio real)
  const exactTracks = [
    { title: 'Do you remember', artist: 'Xiyo y Fernández', hasAudio: true },
    { title: 'Pa q me escribes', artist: 'Vreno Yg', hasAudio: true },
    { title: 'Suena COOL', artist: 'mvrk y L\'haine', hasAudio: true },
    { title: 'El precio del amor', artist: 'Guxo', hasAudio: false },
    { title: 'Nuevos Deals', artist: 'West SRK', hasAudio: false },
  ];

  // Easing functions para movimientos naturales
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  return (
    <AbsoluteFill style={{ backgroundColor: '#F5F5F7' }}>
      {/* Scene 1: Hook - Zoom drástico a caja de prompt (0:00-0:02) */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill>
          {/* Fondo neutro claro estilo Apple */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Caja de prompt con zoom drástico */}
            <div
              style={{
                width: '400px',
                height: '120px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                transform: `scale(${interpolate(
                  frame - scenes.hook.start,
                  [0, scenes.hook.duration],
                  [0.3, 1.2],
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
              <input
                type="text"
                placeholder="Escribe aquí lo que buscas…"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '24px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                  color: '#1D1D1F',
                  backgroundColor: 'transparent',
                  opacity: interpolate(
                    frame - scenes.hook.start,
                    [30, 60],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.hook.start,
                    [30, 60],
                    [10, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
                readOnly
              />
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonido de whoosh al inicio - Comentado para evitar errores 404 */}
        {/* <Audio src="/studio/audio/whoosh.wav" startFrom={0} volume={0.6} endAt={15} /> */}
      </Sequence>

      {/* Scene 2: Escribir el Prompt (0:02-0:04) */}
      <Sequence from={scenes.typing.start} durationInFrames={scenes.typing.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '400px',
                height: '120px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                transform: 'scale(1.2)',
              }}
            >
              <input
                type="text"
                value={prompt.slice(0, Math.floor(interpolate(
                  frame - scenes.typing.start,
                  [0, scenes.typing.duration],
                  [0, prompt.length],
                  { extrapolateRight: 'clamp' }
                )))}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '24px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                  color: '#1D1D1F',
                  backgroundColor: 'transparent',
                  opacity: interpolate(
                    frame - scenes.typing.start,
                    [0, 30],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.typing.start,
                    [0, 30],
                    [5, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
                readOnly
              />
              {/* Cursor parpadeante */}
              <div
                style={{
                  width: '2px',
                  height: '32px',
                  backgroundColor: '#007AFF',
                  opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                  transition: 'opacity 0.1s',
                  transform: `translateY(${interpolate(
                    frame - scenes.typing.start,
                    [0, 30],
                    [5, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              />
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonido de teclado por letra - Comentado para evitar errores 404 */}
        {/* <Audio src="/studio/audio/keyboard clicks.wav" startFrom={0} volume={0.4} endAt={scenes.typing.duration} /> */}
      </Sequence>

      {/* Scene 3: Zoom out y generación (0:04-0:06) */}
      <Sequence from={scenes.zoomOut.start} durationInFrames={scenes.zoomOut.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* Lista de resultados generados */}
            <div
              style={{
                width: '100%',
                maxWidth: '600px',
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
                transform: `scale(${interpolate(
                  frame - scenes.zoomOut.start,
                  [0, scenes.zoomOut.duration],
                  [1.2, 0.9],
                  { extrapolateRight: 'clamp', easing: easeInOutQuad }
                )})`,
                opacity: interpolate(
                  frame - scenes.zoomOut.start,
                  [0, 30],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              {/* Header simplificado */}
              <div
                style={{
                  padding: '24px 24px 16px 24px',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  opacity: interpolate(
                    frame - scenes.zoomOut.start,
                    [0, 30],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  ),
                  transform: `translateY(${interpolate(
                    frame - scenes.zoomOut.start,
                    [0, 30],
                    [20, 0],
                    { extrapolateRight: 'clamp' }
                  )}px)`,
                }}
              >
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1D1D1F',
                    margin: 0,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  🎵 Resultados generados
                </h3>
              </div>
              
              {/* Lista de canciones simplificada */}
              <div style={{ padding: '16px 24px 24px 24px' }}>
                {exactTracks.map((track, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px 0',
                      borderBottom: index < exactTracks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      transform: `translateY(${interpolate(
                        frame - scenes.zoomOut.start,
                        [index * 8, (index * 8) + 20],
                        [20, 0],
                        { extrapolateRight: 'clamp' }
                      )}px) scale(${interpolate(
                        frame - scenes.zoomOut.start,
                        [index * 8, (index * 8) + 20],
                        [0.95, 1],
                        { extrapolateRight: 'clamp' }
                      )})`,
                      opacity: interpolate(
                        frame - scenes.zoomOut.start,
                        [index * 8, (index * 8) + 20],
                        [0, 1],
                        { extrapolateRight: 'clamp' }
                      ),
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: '500',
                        color: '#1D1D1F',
                        marginBottom: '4px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                        transform: `translateY(${interpolate(
                          frame - scenes.zoomOut.start,
                          [index * 8, (index * 8) + 20],
                          [10, 0],
                          { extrapolateRight: 'clamp' }
                        )}px)`,
                        opacity: interpolate(
                          frame - scenes.zoomOut.start,
                          [index * 8, (index * 8) + 20],
                          [0, 1],
                          { extrapolateRight: 'clamp' }
                        ),
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {track.title}
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        color: '#86868B',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                        transform: `translateY(${interpolate(
                          frame - scenes.zoomOut.start,
                          [index * 8, (index * 8) + 20],
                          [10, 0],
                          { extrapolateRight: 'clamp' }
                        )}px)`,
                        opacity: interpolate(
                          frame - scenes.zoomOut.start,
                          [index * 8, (index * 8) + 20],
                          [0, 1],
                          { extrapolateRight: 'clamp' }
                        ),
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {track.artist}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonido de swoosh al zoom out - Comentado para evitar errores 404 */}
        {/* <Audio src="/studio/audio/swoosh.mp3" startFrom={0} volume={0.5} endAt={20} /> */}
      </Sequence>

      {/* Scene 4: Preview de canciones (0:06-0:12) */}
      <Sequence from={scenes.preview.start} durationInFrames={scenes.preview.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 100%)',
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
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              {/* Header con logo JeyLabbb */}
              <div
                style={{
                  padding: '24px 24px 16px 24px',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
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
                <img
                  src="/studio/images/logo%20jeylabbb.png"
                  alt="JeyLabbb"
                  style={{ 
                    width: '32px', 
                    height: '32px',
                    opacity: interpolate(
                      frame - scenes.preview.start,
                      [0, 20],
                      [0, 1],
                      { extrapolateRight: 'clamp' }
                    ),
                    transform: `scale(${interpolate(
                      frame - scenes.preview.start,
                      [0, 20],
                      [0.8, 1],
                      { extrapolateRight: 'clamp' }
                    )})`
                  }}
                />
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1D1D1F',
                    margin: 0,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  🎵 Resultados generados
                </h3>
              </div>
              
              {/* Lista con previews */}
              <div style={{ padding: '16px 24px 24px 24px' }}>
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
                        borderBottom: index < exactTracks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                        backgroundColor: isHovered ? 'rgba(0,122,255,0.05)' : 'transparent',
                        borderRadius: '12px',
                        padding: isHovered ? '16px 12px' : '16px 0',
                        transform: isHovered ? `scale(1.02) translateY(-2px)` : `scale(1) translateY(0px)`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        boxShadow: isHovered ? '0 4px 12px rgba(0,122,255,0.15)' : '0 0 0 rgba(0,122,255,0)',
                      }}
                    >
                      {/* Indicador de reproducción */}
                      {isPlaying && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '12px',
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#007AFF',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
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
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          ▶
                        </div>
                      )}
                      
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: '500',
                          color: '#1D1D1F',
                          marginBottom: '4px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
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
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          color: '#86868B',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
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
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
        
        {/* Sonidos de preview de canciones - Comentado para evitar errores 404 */}
        {/*
        {exactTracks.map((track, index) => {
          const previewStart = scenes.preview.start + (index * 36);
          const isPlaying = frame >= previewStart + 11 && frame < previewStart + 26; // 0.5s de preview
          
          const audioFiles = [
            '/studio/audio/Do You Remember-Xiyo Fernandezz Eix.m4a',
            '/studio/audio/Pa Q Me Escribes-Vreno Yg.m4a',
            '/studio/audio/Suena Cool-Mvrk Lhaine.m4a',
            '', // Sin audio para Guxo
            ''  // Sin audio para West SRK
          ];
          
          // Solo reproducir audio si la canción tiene audio disponible
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
              background: 'linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 100%)',
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
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
                padding: '40px',
                textAlign: 'center',
              }}
            >
              {/* Botón Añadir a Spotify */}
              <button
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  backgroundColor: '#1DB954',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '20px 32px',
                  fontSize: '20px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(29,185,84,0.3)',
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
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                }}
              >
                <img
                  src="/studio/images/logo%20transicionado%20spotify.png"
                  alt="Spotify"
                  style={{ 
                    width: '24px', 
                    height: '24px',
                    opacity: interpolate(
                      frame - scenes.spotify.start,
                      [0, 30],
                      [0, 1],
                      { extrapolateRight: 'clamp' }
                    ),
                    transform: `scale(${interpolate(
                      frame - scenes.spotify.start,
                      [0, 30],
                      [0.8, 1],
                      { extrapolateRight: 'clamp' }
                    )}) rotate(${interpolate(
                      frame - scenes.spotify.start,
                      [0, 30],
                      [180, 0],
                      { extrapolateRight: 'clamp' }
                    )}deg)`
                  }}
                />
                Añadir a Spotify
              </button>
              
              {/* Mensaje de confirmación */}
              <div
                style={{
                  marginTop: '24px',
                  fontSize: '18px',
                  color: '#1D1D1F',
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
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                }}
              >
                ✅ Playlist creada
              </div>
            </div>
          </div>
        </AbsoluteFill>
        {/* Sonido de clic en botón - Comentado para evitar errores 404 */}
        {/* <Audio src="/studio/audio/button click.wav" startFrom={0} volume={0.7} endAt={15} /> */}
        {/* Sonido de éxito - Comentado para evitar errores 404 */}
        {/* <Audio src="/studio/audio/success.wav" startFrom={45} volume={0.6} endAt={75} /> */}
      </Sequence>

      {/* Scene 6: Explorar Playlists (0:15-0:18) */}
      <Sequence from={scenes.explore.start} durationInFrames={scenes.explore.duration}>
        <AbsoluteFill>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 100%)',
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
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
                transform: `scale(${interpolate(
                  frame - scenes.explore.start,
                  [0, scenes.explore.duration],
                  [0.9, 1.0],
                  { extrapolateRight: 'clamp', easing: easeOutCubic }
                )})`,
              }}
            >
              {/* Header con logo JeyLabbb */}
              <div
                style={{
                  padding: '24px 24px 16px 24px',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
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
                <img
                  src="/studio/images/logo%20jeylabbb.png"
                  alt="JeyLabbb"
                  style={{ 
                    width: '32px', 
                    height: '32px',
                    opacity: interpolate(
                      frame - scenes.explore.start,
                      [0, 20],
                      [0, 1],
                      { extrapolateRight: 'clamp' }
                    ),
                    transform: `scale(${interpolate(
                      frame - scenes.explore.start,
                      [0, 20],
                      [0.8, 1],
                      { extrapolateRight: 'clamp' }
                    )})`
                  }}
                />
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1D1D1F',
                    margin: 0,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  🎧 Mis Playlists
                </h3>
              </div>
              
              {/* Lista de playlists */}
              <div style={{ padding: '16px 24px 24px 24px' }}>
                {[
                  { name: 'Underground Español', tracks: 12, color: '#1DB954' },
                  { name: 'Música para Trabajar', tracks: 8, color: '#007AFF' },
                  { name: 'Lo Mejor del Rap', tracks: 15, color: '#FF6B35' },
                ].map((playlist, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px 0',
                      borderBottom: index < 2 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transform: `translateX(${interpolate(
                        frame - scenes.explore.start,
                        [index * 15, (index * 15) + 30],
                        [50, 0],
                        { extrapolateRight: 'clamp' }
                      )}px) scale(${interpolate(
                        frame - scenes.explore.start,
                        [index * 15, (index * 15) + 30],
                        [0.95, 1],
                        { extrapolateRight: 'clamp' }
                      )})`,
                      opacity: interpolate(
                        frame - scenes.explore.start,
                        [index * 15, (index * 15) + 30],
                        [0, 1],
                        { extrapolateRight: 'clamp' }
                      ),
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                          [index * 15, (index * 15) + 30],
                          [0.8, 1],
                          { extrapolateRight: 'clamp' }
                        )}) rotate(${interpolate(
                          frame - scenes.explore.start,
                          [index * 15, (index * 15) + 30],
                          [180, 0],
                          { extrapolateRight: 'clamp' }
                        )}deg)`,
                        opacity: interpolate(
                          frame - scenes.explore.start,
                          [index * 15, (index * 15) + 30],
                          [0, 1],
                          { extrapolateRight: 'clamp' }
                        ),
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      🎵
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: '500',
                          color: '#1D1D1F',
                          marginBottom: '4px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                          transform: `translateY(${interpolate(
                            frame - scenes.explore.start,
                            [index * 15, (index * 15) + 30],
                            [10, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.explore.start,
                            [index * 15, (index * 15) + 30],
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {playlist.name}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          color: '#86868B',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                          transform: `translateY(${interpolate(
                            frame - scenes.explore.start,
                            [index * 15, (index * 15) + 30],
                            [10, 0],
                            { extrapolateRight: 'clamp' }
                          )}px)`,
                          opacity: interpolate(
                            frame - scenes.explore.start,
                            [index * 15, (index * 15) + 30],
                            [0, 1],
                            { extrapolateRight: 'clamp' }
                          ),
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              background: 'linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 100%)',
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
                  color: '#1D1D1F',
                  margin: 0,
                  marginBottom: '16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
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
                  fontSize: '24px',
                  color: '#007AFF',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
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
                https://playlists.jeylabbb.com
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
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#007AFF',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgba(0,122,255,0.5)',
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
        {/* Sonido de clic final - Comentado para evitar errores 404 */}
        {/* <Audio src="/studio/audio/button click.wav" startFrom={30} volume={0.7} endAt={45} /> */}
      </Sequence>

      {/* Transición de loop - Parpadeo y vuelta al inicio */}
      <Sequence from={scenes.cta.start + 50} durationInFrames={10}>
        <AbsoluteFill
          style={{
            backgroundColor: '#FFFFFF',
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
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </AbsoluteFill>
  );
};
