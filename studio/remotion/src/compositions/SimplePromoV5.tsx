import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio } from 'remotion';

interface SimplePromoV5Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV5: React.FC<SimplePromoV5Props> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Viral timing: 8-60s, cortes cada 0.5-2s
  const scenes = {
    hook: { start: 0, duration: 30 },        // 1s - Hook inmediato
    uiShow: { start: 30, duration: 30 },     // 1s - Mostrar UI
    typing: { start: 60, duration: 60 },     // 2s - Typing rápido
    loading: { start: 120, duration: 30 },   // 1s - Loading
    result: { start: 150, duration: 60 },    // 2s - Resultado
    spotify: { start: 210, duration: 30 },   // 1s - Spotify
    cta: { start: 240, duration: 60 },       // 2s - CTA final
  };

  // Canciones reales del underground español
  const realTracks = [
    { title: 'Atrévete-te-te', artist: 'Calle 13' },
    { title: 'Es Épico', artist: 'Canserbero' },
    { title: 'Mejor Que El Silencio', artist: 'Nach' },
    { title: 'Tras La Reja', artist: 'Porta' },
    { title: 'Caminando', artist: 'Violadores del Verso' },
  ];

  // Generar sonidos sintéticos mejorados
  const generateSound = (type: string) => {
    const sampleRate = 44100;
    const duration = 0.2;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Frecuencias mejoradas
    const frequencies = {
      click: [1000, 1200],
      whoosh: [300, 500, 700],
      success: [523, 659, 784],
      typing: [800, 900],
      notification: [600, 800],
      spotify: [440, 554, 659]
    };
    
    const freq = frequencies[type] || [440];
    
    for (let i = 0; i < samples; i++) {
      let sample = 0;
      const t = i / sampleRate;
      
      for (let j = 0; j < freq.length; j++) {
        const envelope = Math.exp(-t * 10);
        const harmonic = Math.sin(2 * Math.PI * freq[j] * t) * envelope;
        sample += harmonic / freq.length;
      }
      
      view.setInt16(44 + i * 2, sample * 0.5 * 32767, true);
    }
    
    const bytes = new Uint8Array(buffer);
    const base64 = btoa(String.fromCharCode(...bytes));
    return `data:audio/wav;base64,${base64}`;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* Scene 1: Hook inmediato (0-1s) */}
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
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0,
                  textShadow: `0 0 20px ${accentColor}`,
                  lineHeight: 1.1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
                }}
              >
                {headline}
              </h1>
              <div
                style={{
                  fontSize: '18px',
                  color: 'white',
                  marginTop: '15px',
                  opacity: 0.9,
                }}
              >
                🎵 La IA que entiende tu música
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        <Audio
          src={generateSound('whoosh')}
          startFrom={0}
          volume={0.8}
        />
      </Sequence>

      {/* Scene 2: UI Real (1-2s) */}
      <Sequence from={scenes.uiShow.start} durationInFrames={scenes.uiShow.duration}>
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
            {/* UI Real de tu frontend */}
            <div
              style={{
                width: '375px',
                height: '812px',
                backgroundColor: '#121212',
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
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EDEDED' }}>
                  JeyLabbb
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
                </div>
              </div>

              {/* Main content - UI real */}
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
                  <textarea
                    style={{
                      background: '#121212',
                      border: '1px solid #232323',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      color: '#EDEDED',
                      fontSize: '14px',
                      width: '100%',
                      minHeight: '80px',
                      fontFamily: 'inherit',
                      resize: 'none',
                    }}
                    placeholder="Escribe tu estilo musical..."
                  />
                </div>

                <button
                  style={{
                    background: '#1DB954',
                    color: 'white',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)',
                  }}
                >
                  🎵 Generar Playlist
                </button>
              </div>
            </div>
          </div>
        </AbsoluteFill>
        
        <Audio
          src={generateSound('click')}
          startFrom={0}
          volume={0.6}
        />
      </Sequence>

      {/* Scene 3: Typing rápido (2-4s) */}
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
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EDEDED' }}>
                  JeyLabbb
                </div>
                <div style={{ fontSize: '14px', color: '#B3B3B3', marginLeft: 'auto' }}>
                  AI Playlist Generator
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
                      background: '#121212',
                      border: `2px solid ${accentColor}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      color: accentColor,
                      fontSize: '14px',
                      width: '100%',
                      minHeight: '80px',
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
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
                    background: '#1DB954',
                    color: 'white',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)',
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
            src={generateSound('typing')}
            startFrom={0}
            volume={0.4}
          />
        ))}
      </Sequence>

      {/* Scene 4: Loading (4-5s) */}
      <Sequence from={scenes.loading.start} durationInFrames={scenes.loading.duration}>
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
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EDEDED' }}>
                  JeyLabbb
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
                  gap: '20px',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #232323',
                    borderTop: `4px solid ${accentColor}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <div
                  style={{
                    fontSize: '18px',
                    color: '#B3B3B3',
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
          src={generateSound('notification')}
          startFrom={0}
          volume={0.7}
        />
      </Sequence>

      {/* Scene 5: Resultado (5-7s) */}
      <Sequence from={scenes.result.start} durationInFrames={scenes.result.duration}>
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
                transform: `scale(1.3)`,
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
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EDEDED' }}>
                  JeyLabbb
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

                {realTracks.map((track, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '15px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
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
                        color: '#0B0B0B',
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
          src={generateSound('success')}
          startFrom={0}
          volume={0.8}
        />
      </Sequence>

      {/* Scene 6: Spotify (7-8s) */}
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
                transform: `scale(1.4)`,
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
                  📶 📶 🔋
                </div>
              </div>

              {/* Navigation */}
              <div
                style={{
                  height: '60px',
                  backgroundColor: '#121212',
                  borderBottom: '1px solid #232323',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EDEDED' }}>
                  JeyLabbb
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
                  gap: '20px',
                }}
              >
                {/* Logo de Spotify real */}
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
          src={generateSound('spotify')}
          startFrom={0}
          volume={0.7}
        />
      </Sequence>

      {/* Scene 7: CTA final (8-10s) */}
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
                  fontSize: '42px',
                  fontWeight: 'bold',
                  color: accentColor,
                  margin: 0,
                  textShadow: `0 0 20px ${accentColor}`,
                  lineHeight: 1.1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
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
                  fontSize: '20px',
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
                fontSize: '18px',
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
          src={generateSound('whoosh')}
          startFrom={0}
          volume={0.9}
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
