import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import { TypeOn } from './TypeOn';
import { PlaylistCard } from './PlaylistCard';

interface ScreenRecordingProps {
  type: 'app-opening' | 'typing' | 'generating' | 'playlist-result';
  accentColor: string;
  startFrame: number;
  prompt?: string;
}

export const ScreenRecording: React.FC<ScreenRecordingProps> = ({
  type,
  accentColor,
  startFrame,
  prompt = "underground español para activarme",
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const renderAppOpening = () => (
    <AbsoluteFill>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#000000',
          padding: '40px',
        }}
      >
        <div
          style={{
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            backgroundColor: '#1a1a1a',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid #333',
          }}
        >
          {/* Browser UI */}
          <div
            style={{
              height: '40px',
              backgroundColor: '#2a2a2a',
              borderRadius: '10px 10px 0 0',
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ff5f57',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ffbd2e',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#28ca42',
                }}
              />
            </div>
          </div>

          {/* App Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'calc(100% - 60px)',
            }}
          >
            <div
              style={{
                fontSize: '36px',
                fontWeight: '600',
                color: 'white',
                marginBottom: '20px',
                opacity: spring({
                  frame: relativeFrame,
                  fps: 30,
                  config: { damping: 200, stiffness: 200 },
                }),
              }}
            >
              playlists.jeylabbb.com
            </div>
            <div
              style={{
                fontSize: '18px',
                color: accentColor,
                opacity: interpolate(relativeFrame, [30, 60], [0, 1]),
              }}
            >
              Cargando...
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );

  const renderTyping = () => (
    <AbsoluteFill>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#000000',
          padding: '40px',
        }}
      >
        <div
          style={{
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            backgroundColor: '#1a1a1a',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid #333',
          }}
        >
          <div
            style={{
              height: '40px',
              backgroundColor: '#2a2a2a',
              borderRadius: '10px 10px 0 0',
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ff5f57',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ffbd2e',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#28ca42',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '30px',
              height: 'calc(100% - 60px)',
              padding: '20px 0',
            }}
          >
            <div>
              <label
                style={{
                  fontSize: '16px',
                  color: 'white',
                  marginBottom: '10px',
                  display: 'block',
                }}
              >
                ¿Qué tipo de música quieres?
              </label>
              <TypeOn
                text={prompt}
                startFrame={relativeFrame}
                durationInFrames={90}
                color={accentColor}
                fontSize="18px"
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '40px',
              }}
            >
              <div
                style={{
                  backgroundColor: accentColor,
                  color: '#000000',
                  fontSize: '18px',
                  fontWeight: '600',
                  padding: '15px 30px',
                  borderRadius: '25px',
                  opacity: interpolate(relativeFrame, [90, 120], [0, 1]),
                  transform: `scale(${spring({
                    frame: relativeFrame - 90,
                    fps: 30,
                    config: { damping: 200, stiffness: 200 },
                  })})`,
                }}
              >
                Generar Playlist
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );

  const renderGenerating = () => (
    <AbsoluteFill>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#000000',
          padding: '40px',
        }}
      >
        <div
          style={{
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            backgroundColor: '#1a1a1a',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              border: `4px solid ${accentColor}20`,
              borderTop: `4px solid ${accentColor}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '30px',
            }}
          />
          <div
            style={{
              fontSize: '24px',
              color: 'white',
              marginBottom: '10px',
            }}
          >
            Generando tu playlist...
          </div>
          <div
            style={{
              fontSize: '16px',
              color: accentColor,
              opacity: 0.8,
            }}
          >
            Analizando tus gustos musicales
          </div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </AbsoluteFill>
  );

  const renderPlaylistResult = () => (
    <AbsoluteFill>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#000000',
          padding: '40px',
        }}
      >
        <div
          style={{
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            backgroundColor: '#1a1a1a',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid #333',
          }}
        >
          <div
            style={{
              height: '40px',
              backgroundColor: '#2a2a2a',
              borderRadius: '10px 10px 0 0',
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ff5f57',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ffbd2e',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#28ca42',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              height: 'calc(100% - 60px)',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'white',
                marginBottom: '10px',
              }}
            >
              Tu playlist está lista
            </div>

            {[
              { title: 'Calle 13 - Atrévete-te-te', artist: 'Calle 13' },
              { title: 'Canserbero - Es Épico', artist: 'Canserbero' },
              { title: 'Nach - Mejor Que El Silencio', artist: 'Nach' },
              { title: 'Porta - Tras La Reja', artist: 'Porta' },
              { title: 'Violadores del Verso - Caminando', artist: 'Violadores del Verso' },
            ].map((track, index) => (
              <PlaylistCard
                key={index}
                title={track.title}
                artist={track.artist}
                accentColor={accentColor}
                startFrame={relativeFrame + index * 15}
              />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );

  switch (type) {
    case 'app-opening':
      return renderAppOpening();
    case 'typing':
      return renderTyping();
    case 'generating':
      return renderGenerating();
    case 'playlist-result':
      return renderPlaylistResult();
    default:
      return null;
  }
};
