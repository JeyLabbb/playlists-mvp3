import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface SimplePromoProps {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromo: React.FC<SimplePromoProps> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene 1: Hook (0-3s)
  const scene1Progress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const headlineScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 200 },
  });

  const headlineOpacity = interpolate(scene1Progress, [0, 0.3], [0, 1]);

  // Scene 2: Mock UI (3-15s)
  const scene2Progress = interpolate(frame, [90, 450], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const uiOpacity = interpolate(scene2Progress, [0, 0.2], [0, 1]);
  const typingProgress = interpolate(scene2Progress, [0.1, 0.4], [0, 1]);
  const buttonOpacity = interpolate(scene2Progress, [0.4, 0.6], [0, 1]);

  // Scene 3: CTA (15-18s)
  const scene3Progress = interpolate(frame, [450, 540], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const ctaOpacity = interpolate(scene3Progress, [0, 0.3], [0, 1]);
  const ctaScale = spring({
    frame: frame - 450,
    fps,
    config: { damping: 100, stiffness: 200 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* Scene 1: Hook */}
      <AbsoluteFill style={{ opacity: frame < 90 ? 1 : 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '60px',
          }}
        >
          <div
            style={{
              fontSize: '52px',
              fontWeight: '600',
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.3,
              opacity: headlineOpacity,
              transform: `scale(${headlineScale})`,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: '20px',
              color: accentColor,
              marginTop: '30px',
              opacity: interpolate(frame, [60, 90], [0, 1]),
            }}
          >
            La mejor IA para amantes de la música
          </div>
        </div>
      </AbsoluteFill>

      {/* Scene 2: Mock UI */}
      <AbsoluteFill style={{ opacity: frame >= 90 && frame < 450 ? 1 : 0 }}>
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
              opacity: uiOpacity,
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
                <div
                  style={{
                    padding: '15px 20px',
                    backgroundColor: '#333333',
                    borderRadius: '12px',
                    border: `2px solid ${accentColor}`,
                    fontSize: '18px',
                    color: accentColor,
                    fontFamily: 'monospace',
                    minHeight: '50px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {prompt.slice(0, Math.floor(typingProgress * prompt.length))}
                  <span
                    style={{
                      opacity: interpolate(
                        Math.sin(frame * 0.3),
                        [-1, 1],
                        [0, 1]
                      ),
                      marginLeft: '2px',
                    }}
                  >
                    |
                  </span>
                </div>
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
                    opacity: buttonOpacity,
                    transform: `scale(${spring({
                      frame: frame - 270,
                      fps,
                      config: { damping: 200, stiffness: 200 },
                    })})`,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  Generar Playlist
                </div>
              </div>

              {/* Loading indicator */}
              {frame > 360 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '20px',
                    marginTop: '20px',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      border: `4px solid ${accentColor}20`,
                      borderTop: `4px solid ${accentColor}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '18px',
                      color: 'white',
                    }}
                  >
                    Generando tu playlist...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Scene 3: CTA */}
      <AbsoluteFill style={{ opacity: frame >= 450 ? 1 : 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '60px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              opacity: ctaOpacity,
              transform: `scale(${ctaScale})`,
            }}
          >
            <div
              style={{
                backgroundColor: accentColor,
                color: '#000000',
                fontSize: '24px',
                fontWeight: '600',
                padding: '20px 40px',
                borderRadius: '50px',
                textAlign: 'center',
                boxShadow: `0 0 30px ${accentColor}40`,
                marginBottom: '30px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {cta}
            </div>
            <div
              style={{
                fontSize: '20px',
                color: 'white',
                opacity: 0.8,
                textAlign: 'center',
              }}
            >
              ¡Empieza a crear tus playlists ahora!
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AbsoluteFill>
  );
};
