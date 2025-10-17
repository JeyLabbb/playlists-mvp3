import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

// Real UI simulation based on playlists.jeylabbb.com
interface RealUISimulatorProps {
  startFrame: number;
  duration: number;
  zoomLevel?: number;
  showTyping?: boolean;
  promptText?: string;
  showPlaylist?: boolean;
  tracks?: Array<{ title: string; artist: string }>;
}

export const RealUISimulator: React.FC<RealUISimulatorProps> = ({
  startFrame,
  duration,
  zoomLevel = 1,
  showTyping = false,
  promptText = "underground español para activarme",
  showPlaylist = false,
  tracks = [],
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  // Smooth zoom animation
  const zoom = spring({
    frame: relativeFrame,
    fps: 30,
    config: { damping: 200, stiffness: 200 },
  }) * zoomLevel;

  // Typing animation
  const typingProgress = interpolate(
    relativeFrame,
    [10, duration - 20],
    [0, promptText.length],
    { extrapolateRight: 'clamp' }
  );

  const visibleText = promptText.slice(0, Math.floor(typingProgress));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Real UI Container */}
      <div
        style={{
          width: '375px', // iPhone width
          height: '812px', // iPhone height
          backgroundColor: '#ffffff',
          borderRadius: '40px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
      >
        {/* Status Bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ fontSize: '16px' }}>📶</div>
            <div style={{ fontSize: '16px' }}>📶</div>
            <div style={{ fontSize: '16px' }}>🔋</div>
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
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#000000',
            }}
          >
            JeyLabbb
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#666666',
              marginLeft: 'auto',
            }}
          >
            IA Playlists
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Prompt Input - LARGE AND FOCUSED */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#000000',
                marginBottom: '12px',
                display: 'block',
              }}
            >
              ¿Qué quieres escuchar?
            </label>
            <div
              style={{
                position: 'relative',
                backgroundColor: '#f8f9fa',
                borderRadius: '16px',
                border: '2px solid #e9ecef',
                padding: '20px',
                minHeight: '80px',
                fontSize: '18px',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <span style={{ color: '#00E5A8', fontWeight: '500' }}>
                {visibleText}
              </span>
              {showTyping && (
                <span
                  style={{
                    color: '#00E5A8',
                    marginLeft: '2px',
                    animation: 'blink 1s infinite',
                  }}
                >
                  |
                </span>
              )}
            </div>
          </div>

          {/* Generate Button - LARGE */}
          <button
            style={{
              backgroundColor: '#00E5A8',
              color: '#000000',
              border: 'none',
              borderRadius: '16px',
              padding: '20px',
              fontSize: '20px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,229,168,0.3)',
              transform: `scale(${spring({
                frame: relativeFrame - 30,
                fps: 30,
                config: { damping: 200, stiffness: 200 },
              })})`,
            }}
          >
            🎵 Generar Playlist
          </button>

          {/* Loading State */}
          {relativeFrame > 60 && relativeFrame < 120 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                marginTop: '40px',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid #f0f0f0',
                  borderTop: '4px solid #00E5A8',
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
                ✨ Analizando tus gustos...
              </div>
            </div>
          )}

          {/* Playlist Results - LARGE AND BEAUTIFUL */}
          {showPlaylist && relativeFrame > 120 && (
            <div
              style={{
                marginTop: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                🎉 ¡Tu playlist está lista!
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {tracks.map((track, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid #e9ecef',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transform: `translateX(${spring({
                        frame: relativeFrame - (120 + index * 10),
                        fps: 30,
                        config: { damping: 200, stiffness: 200 },
                      }) * 100}px)`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {/* Track Number - LARGE */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#00E5A8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#000000',
                        boxShadow: '0 4px 12px rgba(0,229,168,0.3)',
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Track Info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#000000',
                          marginBottom: '4px',
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          color: '#666666',
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>

                    {/* Play Button - LARGE */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#00E5A8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,229,168,0.3)',
                      }}
                    >
                      ▶️
                    </div>
                  </div>
                ))}
              </div>

              {/* Add to Spotify - LARGE BUTTON */}
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
                  marginTop: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(29,185,84,0.3)',
                  transform: `scale(${spring({
                    frame: relativeFrame - 200,
                    fps: 30,
                    config: { damping: 200, stiffness: 200 },
                  })})`,
                }}
              >
                <div style={{ fontSize: '24px' }}>🎵</div>
                Añadir a Spotify
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// Zoom focus component for specific elements
interface ZoomFocusProps {
  startFrame: number;
  duration: number;
  target: 'input' | 'button' | 'playlist' | 'spotify';
  children: React.ReactNode;
}

export const ZoomFocus: React.FC<ZoomFocusProps> = ({
  startFrame,
  duration,
  target,
  children,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const zoomLevel = interpolate(
    relativeFrame,
    [0, duration * 0.3, duration * 0.7, duration],
    [1, 1.3, 1.3, 1],
    { extrapolateRight: 'clamp' }
  );

  const opacity = interpolate(
    relativeFrame,
    [0, duration * 0.1, duration * 0.9, duration],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        transform: `scale(${zoomLevel})`,
        opacity,
        transformOrigin: 'center center',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      {children}
    </div>
  );
};

// Large emoji/icon component
interface LargeIconProps {
  emoji: string;
  size?: number;
  startFrame: number;
  accentColor: string;
}

export const LargeIcon: React.FC<LargeIconProps> = ({
  emoji,
  size = 80,
  startFrame,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const scale = spring({
    frame: relativeFrame,
    fps: 30,
    config: { damping: 200, stiffness: 200 },
  });

  const glow = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.3, 1]
  );

  return (
    <div
      style={{
        fontSize: `${size}px`,
        transform: `scale(${scale})`,
        textShadow: `0 0 ${glow * 20}px ${accentColor}40`,
        filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.2))`,
      }}
    >
      {emoji}
    </div>
  );
};
