import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

interface SimplePromoV6Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV6: React.FC<SimplePromoV6Props> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing viral: 15 segundos con loop perfecto
  const scenes = {
    hook: { start: 0, duration: 45 },        // 1.5s - Hook UI minimalista
    typing: { start: 45, duration: 60 },     // 2s - Escribiendo prompt
    generating: { start: 105, duration: 30 }, // 1s - Generando
    results: { start: 135, duration: 90 },   // 3s - Lista de canciones
    spotify: { start: 225, duration: 45 },   // 1.5s - Añadir a Spotify
    myPlaylists: { start: 270, duration: 60 }, // 2s - Mis playlists
    cta: { start: 330, duration: 60 },       // 2s - CTA final
    loop: { start: 390, duration: 60 },      // 2s - Transición al loop
  };

  // Canciones específicas que solicitas
  const specificTracks = [
    { title: 'Do You Remember', artist: 'Xiyo & Fernandez' },
    { title: 'Pa q me escribes', artist: 'Vreno Yg' },
    { title: 'Suena COOL', artist: 'mvrk & L\'haine' },
    { title: 'El precio del amor', artist: 'Guxo' },
    { title: 'Nuevos Deals', artist: 'West SRK' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* Scene 1: Hook UI Minimalista (0-1.5s) */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#0B0B0B',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#121212',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(${spring({
                  frame: frame - scenes.hook.start,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#EDEDED',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 🔋
                </div>
              </div>

              {/* Header minimalista */}
              <div
                style={{
                  height: '80px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EDEDED' }}>
                  Yela
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
                </div>
              </div>

              {/* Main content */}
              <div
                style={{
                  flex: 1,
                  padding: '40px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '600',
                    color: '#EDEDED',
                    marginBottom: '20px',
                    opacity: interpolate(frame, [scenes.hook.start, scenes.hook.start + 30], [0, 1]),
                  }}
                >
                  Escribe algo y te hacemos la playlist
                </div>
                
                <div
                  style={{
                    fontSize: '16px',
                    color: '#B3B3B3',
                    opacity: interpolate(frame, [scenes.hook.start + 15, scenes.hook.start + 45], [0, 1]),
                  }}
                >
                  La IA que entiende tu música
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Typing Animation (1.5-3.5s) */}
      <Sequence from={scenes.typing.start} durationInFrames={scenes.typing.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#0B0B0B',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#121212',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(1.1)`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#EDEDED',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 🔋
                </div>
              </div>

              {/* Header */}
              <div
                style={{
                  height: '80px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EDEDED' }}>
                  Yela
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
                </div>
              </div>

              {/* Prompt section */}
              <div
                style={{
                  flex: 1,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#EDEDED',
                    marginBottom: '15px',
                  }}
                >
                  ¿Qué quieres escuchar?
                </h2>
                
                <div
                  style={{
                    position: 'relative',
                  }}
                >
                  <textarea
                    style={{
                      background: '#121212',
                      border: `2px solid ${accentColor}`,
                      borderRadius: '12px',
                      padding: '16px',
                      color: accentColor,
                      fontSize: '16px',
                      width: '100%',
                      minHeight: '100px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                      resize: 'none',
                      outline: 'none',
                    }}
                    value={prompt.slice(0, Math.floor(interpolate(
                      frame - scenes.typing.start,
                      [0, scenes.typing.duration],
                      [0, prompt.length],
                      { extrapolateRight: 'clamp' }
                    )))}
                    readOnly
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '16px',
                      width: '2px',
                      height: '20px',
                      backgroundColor: accentColor,
                      opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
                      transition: 'opacity 0.1s',
                    }}
                  />
                </div>

                <button
                  style={{
                    background: '#1DB954',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)',
                    transform: `scale(${spring({
                      frame: frame - scenes.typing.start - 30,
                      fps,
                      config: { damping: 200, stiffness: 200 },
                    })})`,
                  }}
                >
                  🎵 Generar Playlist
                </button>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Generating (3.5-4.5s) */}
      <Sequence from={scenes.generating.start} durationInFrames={scenes.generating.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#0B0B0B',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#121212',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(1.05)`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#EDEDED',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 🔋
                </div>
              </div>

              {/* Header */}
              <div
                style={{
                  height: '80px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EDEDED' }}>
                  Yela
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
                </div>
              </div>

              {/* Loading content */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '30px',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    border: '4px solid #232323',
                    borderTop: `4px solid ${accentColor}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <div
                  style={{
                    fontSize: '24px',
                    color: '#EDEDED',
                    textAlign: 'center',
                    fontWeight: '600',
                  }}
                >
                  ✨ Generando tu playlist...
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Results with hover effects (4.5-7.5s) */}
      <Sequence from={scenes.results.start} durationInFrames={scenes.results.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#0B0B0B',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#121212',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(1.15)`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#EDEDED',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 🔋
                </div>
              </div>

              {/* Header */}
              <div
                style={{
                  height: '80px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EDEDED' }}>
                  Yela
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
                </div>
              </div>

              {/* Results content */}
              <div
                style={{
                  flex: 1,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#EDEDED',
                    textAlign: 'center',
                    marginBottom: '10px',
                  }}
                >
                  🎉 ¡Tu playlist está lista!
                </div>

                {specificTracks.map((track, index) => {
                  const hoverProgress = interpolate(
                    frame - scenes.results.start,
                    [index * 18, (index * 18) + 18],
                    [0, 1],
                    { extrapolateRight: 'clamp' }
                  );
                  
                  const isHovered = hoverProgress > 0.3 && hoverProgress < 0.8;
                  
                  return (
                    <div
                      key={index}
                      style={{
                        background: isHovered ? 'rgba(29, 185, 84, 0.1)' : 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: isHovered ? `2px solid ${accentColor}` : '1px solid rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transform: isHovered ? `scale(1.02)` : `scale(1)`,
                        transition: 'all 0.2s ease',
                        boxShadow: isHovered ? `0 4px 16px rgba(29, 185, 84, 0.2)` : '0 2px 4px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: isHovered ? accentColor : '#1DB954',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#0B0B0B',
                          transform: isHovered ? `scale(1.1)` : `scale(1)`,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#EDEDED',
                            marginBottom: '2px',
                          }}
                        >
                          {track.title}
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            color: '#B3B3B3',
                          }}
                        >
                          {track.artist}
                        </div>
                      </div>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: `2px solid ${isHovered ? accentColor : '#1DB954'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          transform: isHovered ? `scale(1.1)` : `scale(1)`,
                        }}
                      >
                        ▶️
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Spotify Integration (7.5-9s) */}
      <Sequence from={scenes.spotify.start} durationInFrames={scenes.spotify.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#0B0B0B',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#121212',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(1.2)`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#EDEDED',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 🔋
                </div>
              </div>

              {/* Header */}
              <div
                style={{
                  height: '80px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EDEDED' }}>
                  Yela
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
                </div>
              </div>

              {/* Spotify content */}
              <div
                style={{
                  flex: 1,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '30px',
                }}
              >
                {/* Logo de Spotify 3D */}
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1DB954 0%, #1ed760 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '50px',
                    boxShadow: '0 12px 32px rgba(29,185,84,0.4), 0 0 0 4px rgba(29,185,84,0.1)',
                    transform: `scale(${spring({
                      frame: frame - scenes.spotify.start,
                      fps,
                      config: { damping: 200, stiffness: 200 },
                    })})`,
                  }}
                >
                  🎵
                </div>
                
                <button
                  style={{
                    width: '100%',
                    backgroundColor: '#1DB954',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '20px',
                    fontSize: '20px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 24px rgba(29,185,84,0.4)',
                    transform: `scale(${spring({
                      frame: frame - scenes.spotify.start - 15,
                      fps,
                      config: { damping: 200, stiffness: 200 },
                    })})`,
                  }}
                >
                  🎵 Añadir a Spotify
                </button>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: My Playlists (9-11s) */}
      <Sequence from={scenes.myPlaylists.start} durationInFrames={scenes.myPlaylists.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#0B0B0B',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#121212',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(1.1)`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#EDEDED',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 🔋
                </div>
              </div>

              {/* Header */}
              <div
                style={{
                  height: '80px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EDEDED' }}>
                  Yela
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
                </div>
              </div>

              {/* My Playlists content */}
              <div
                style={{
                  flex: 1,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px',
                }}
              >
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#EDEDED',
                    marginBottom: '20px',
                  }}
                >
                  Mis Playlists
                </h3>

                {[
                  { name: 'Underground Español', tracks: 12, color: '#1DB954' },
                  { name: 'Música para Trabajar', tracks: 8, color: '#22D3EE' },
                  { name: 'Lo Mejor del Rap', tracks: 15, color: '#ff6b35' },
                ].map((playlist, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transform: `translateX(${spring({
                        frame: frame - scenes.myPlaylists.start - (index * 20),
                        fps,
                        config: { damping: 200, stiffness: 200 },
                      }) * 50}px)`,
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
                      }}
                    >
                      🎵
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#EDEDED',
                          marginBottom: '4px',
                        }}
                      >
                        {playlist.name}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#B3B3B3',
                        }}
                      >
                        {playlist.tracks} canciones
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '20px',
                        color: '#B3B3B3',
                      }}
                    >
                      ▶️
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 7: CTA Final (11-13s) */}
      <Sequence from={scenes.cta.start} durationInFrames={scenes.cta.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px',
              backgroundColor: brandColor,
            }}
          >
            <div
              style={{
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
                textAlign: 'center',
                marginBottom: '40px',
              }}
            >
              <h2
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: accentColor,
                  margin: 0,
                  textShadow: `0 0 20px ${accentColor}`,
                  lineHeight: 1.1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                }}
              >
                Pruébala ahora
              </h2>
            </div>

            <div
              style={{
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start - 15,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
              }}
            >
              <a
                href="https://playlists.jeylabbb.com"
                style={{
                  backgroundColor: accentColor,
                  color: '#000000',
                  fontSize: '24px',
                  fontWeight: '600',
                  padding: '24px 48px',
                  borderRadius: '20px',
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxShadow: `0 12px 32px ${accentColor}40`,
                  display: 'block',
                }}
              >
                playlists.jeylabbb.com
              </a>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 8: Loop Transition (13-15s) */}
      <Sequence from={scenes.loop.start} durationInFrames={scenes.loop.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#0B0B0B',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#121212',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(${interpolate(
                  frame - scenes.loop.start,
                  [0, scenes.loop.duration],
                  [1, 0.8],
                  { extrapolateRight: 'clamp' }
                )})`,
                opacity: interpolate(
                  frame - scenes.loop.start,
                  [0, scenes.loop.duration],
                  [1, 0],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#EDEDED',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 🔋
                </div>
              </div>

              {/* Header */}
              <div
                style={{
                  height: '80px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#EDEDED' }}>
                  Yela
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
                </div>
              </div>

              {/* Loop content - same as hook */}
              <div
                style={{
                  flex: 1,
                  padding: '40px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '600',
                    color: '#EDEDED',
                    marginBottom: '20px',
                  }}
                >
                  Escribe algo y te hacemos la playlist
                </div>
                
                <div
                  style={{
                    fontSize: '16px',
                    color: '#B3B3B3',
                  }}
                >
                  La IA que entiende tu música
                </div>
              </div>
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
      `}</style>
    </AbsoluteFill>
  );
};
