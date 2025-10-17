import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio } from 'remotion';
import { getAudioURL } from '../utils/audioGenerator';

interface SimplePromoV4Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV4: React.FC<SimplePromoV4Props> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timings - fast and dynamic
  const scenes = {
    hook: { start: 0, duration: 60 },        // 2s - Hook
    uiShow: { start: 60, duration: 45 },     // 1.5s - Show UI
    typing: { start: 105, duration: 60 },    // 2s - Typing
    loading: { start: 165, duration: 45 },   // 1.5s - Loading
    result: { start: 210, duration: 75 },    // 2.5s - Results
    spotify: { start: 285, duration: 45 },   // 1.5s - Spotify
    cta: { start: 330, duration: 60 },       // 2s - CTA
  };

  // Real tracks
  const realTracks = [
    { title: 'Atrévete-te-te', artist: 'Calle 13' },
    { title: 'Es Épico', artist: 'Canserbero' },
    { title: 'Mejor Que El Silencio', artist: 'Nach' },
    { title: 'Tras La Reja', artist: 'Porta' },
    { title: 'Caminando', artist: 'Violadores del Verso' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* Background music */}
      <Audio
        src={getAudioURL('success')}
        startFrom={0}
        volume={0.1}
        loop
      />

      {/* Scene 1: Hook (0-2s) */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px',
            }}
          >
            <div
              style={{
                transform: `scale(${spring({
                  frame: frame - scenes.hook.start,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0,
                  textShadow: `0 0 20px ${accentColor}`,
                  lineHeight: 1.1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {headline}
              </h1>
              <div
                style={{
                  fontSize: '20px',
                  color: 'white',
                  marginTop: '20px',
                  opacity: 0.9,
                }}
              >
                🎵 La mejor IA para amantes de la música
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        <Audio
          src={getAudioURL('whoosh')}
          startFrom={0}
          volume={0.6}
        />
      </Sequence>

      {/* Scene 2: Show UI (2-3.5s) */}
      <Sequence from={scenes.uiShow.start} durationInFrames={scenes.uiShow.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '20px',
            }}
          >
            {/* iPhone mockup */}
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#ffffff',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(${spring({
                  frame: frame - scenes.uiShow.start,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#000000',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
                  JeyLabbb
                </div>
                <div style={{ fontSize: '14px', color: '#666666', marginLeft: 'auto' }}>
                  IA Playlists
                </div>
              </div>

              {/* Main content */}
              <div
                style={{
                  flex: 1,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#000000',
                      marginBottom: '10px',
                      display: 'block',
                    }}
                  >
                    ¿Qué quieres escuchar?
                  </label>
                  <div
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      border: '2px solid #e9ecef',
                      padding: '15px',
                      fontSize: '16px',
                      color: '#666666',
                      minHeight: '50px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    Escribe tu estilo musical...
                  </div>
                </div>

                <button
                  style={{
                    backgroundColor: accentColor,
                    color: '#000000',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '15px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,229,168,0.3)',
                  }}
                >
                  🎵 Generar Playlist
                </button>
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        <Audio
          src={getAudioURL('click')}
          startFrom={0}
          volume={0.5}
        />
      </Sequence>

      {/* Scene 3: Typing (3.5-5.5s) */}
      <Sequence from={scenes.typing.start} durationInFrames={scenes.typing.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#ffffff',
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
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#000000',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
                  JeyLabbb
                </div>
                <div style={{ fontSize: '14px', color: '#666666', marginLeft: 'auto' }}>
                  IA Playlists
                </div>
              </div>

              {/* Main content */}
              <div
                style={{
                  flex: 1,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#000000',
                      marginBottom: '10px',
                      display: 'block',
                    }}
                  >
                    ¿Qué quieres escuchar?
                  </label>
                  <div
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      border: `2px solid ${accentColor}`,
                      padding: '15px',
                      fontSize: '16px',
                      color: accentColor,
                      minHeight: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily: 'monospace',
                    }}
                  >
                    <span>
                      {prompt.slice(0, Math.floor(interpolate(
                        frame - scenes.typing.start,
                        [0, scenes.typing.duration],
                        [0, prompt.length],
                        { extrapolateRight: 'clamp' }
                      )))}
                    </span>
                    <span style={{ marginLeft: '2px', opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }}>
                      |
                    </span>
                  </div>
                </div>

                <button
                  style={{
                    backgroundColor: accentColor,
                    color: '#000000',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '15px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,229,168,0.3)',
                  }}
                >
                  🎵 Generar Playlist
                </button>
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        {/* Typing sounds */}
        {Array.from({ length: Math.floor(prompt.length / 3) }, (_, i) => (
          <Audio
            key={i}
            src={getAudioURL('typing')}
            startFrom={0}
            volume={0.3}
          />
        ))}
      </Sequence>

      {/* Scene 4: Loading (5.5-7s) */}
      <Sequence from={scenes.loading.start} durationInFrames={scenes.loading.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#ffffff',
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
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#000000',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
                  JeyLabbb
                </div>
                <div style={{ fontSize: '14px', color: '#666666', marginLeft: 'auto' }}>
                  IA Playlists
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
                  gap: '20px',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #f0f0f0',
                    borderTop: `4px solid ${accentColor}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <div
                  style={{
                    fontSize: '18px',
                    color: '#666666',
                    textAlign: 'center',
                  }}
                >
                  ✨ Generando tu playlist...
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        <Audio
          src={getAudioURL('notification')}
          startFrom={0}
          volume={0.6}
        />
      </Sequence>

      {/* Scene 5: Results (7-9.5s) */}
      <Sequence from={scenes.result.start} durationInFrames={scenes.result.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#ffffff',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(1.3)`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#000000',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
                  JeyLabbb
                </div>
                <div style={{ fontSize: '14px', color: '#666666', marginLeft: 'auto' }}>
                  IA Playlists
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
                    color: '#000000',
                    textAlign: 'center',
                    marginBottom: '10px',
                  }}
                >
                  🎉 ¡Tu playlist está lista!
                </div>

                {realTracks.map((track, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      padding: '15px',
                      border: '1px solid #e9ecef',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transform: `translateX(${spring({
                        frame: frame - (scenes.result.start + 20 + index * 10),
                        fps,
                        config: { damping: 200, stiffness: 200 },
                      }) * 100}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#000000',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#000000',
                          marginBottom: '2px',
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#666666',
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: `2px solid ${accentColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
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
        
        <Audio
          src={getAudioURL('success')}
          startFrom={0}
          volume={0.7}
        />
      </Sequence>

      {/* Scene 6: Spotify (9.5-11s) */}
      <Sequence from={scenes.spotify.start} durationInFrames={scenes.spotify.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#ffffff',
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transform: `scale(1.4)`,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: '44px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  fontSize: '17px',
                  fontWeight: '600',
                  color: '#000000',
                }}
              >
                <div>9:41</div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '16px' }}>
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
                  JeyLabbb
                </div>
                <div style={{ fontSize: '14px', color: '#666666', marginLeft: 'auto' }}>
                  IA Playlists
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
                  gap: '20px',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#1DB954',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    boxShadow: '0 8px 24px rgba(29,185,84,0.3)',
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
                    borderRadius: '12px',
                    padding: '15px',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 12px rgba(29,185,84,0.3)',
                  }}
                >
                  🎵 Añadir a Spotify
                </button>
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        <Audio
          src={getAudioURL('spotify')}
          startFrom={0}
          volume={0.6}
        />
      </Sequence>

      {/* Scene 7: CTA (11-13s) */}
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
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                ¡Empieza ahora!
              </h2>
            </div>

            <div
              style={{
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start - 15,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
                marginTop: '30px',
              }}
            >
              <div
                style={{
                  backgroundColor: accentColor,
                  color: '#000000',
                  fontSize: '24px',
                  fontWeight: '600',
                  padding: '20px 40px',
                  borderRadius: '16px',
                  textAlign: 'center',
                  boxShadow: `0 8px 24px ${accentColor}40`,
                }}
              >
                {cta}
              </div>
            </div>

            <div
              style={{
                fontSize: '20px',
                color: 'white',
                marginTop: '20px',
                opacity: 0.8,
                textAlign: 'center',
              }}
            >
              playlists.jeylabbb.com
            </div>
          </div>
        </AbsoluteFill>
        
        <Audio
          src={getAudioURL('whoosh')}
          startFrom={0}
          volume={0.8}
        />
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
