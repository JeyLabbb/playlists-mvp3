import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';
import { TypeOn } from '../components/TypeOn';
import { AppleButton } from '../components/AppleButton';
import { PlaylistCard } from '../components/PlaylistCard';
import { ScreenRecording } from '../components/ScreenRecording';

interface PromoVideoProps {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const PromoVideo: React.FC<PromoVideoProps> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* Scene 1: Hook (0-4s) */}
      <Sequence from={0} durationInFrames={120}>
        <AbsoluteFill>
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
                fontSize: '48px',
                fontWeight: '600',
                color: 'white',
                textAlign: 'center',
                lineHeight: 1.3,
                opacity: spring({
                  frame,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                }),
                transform: `scale(${spring({
                  frame,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                fontSize: '24px',
                color: accentColor,
                marginTop: '30px',
                opacity: interpolate(frame, [60, 90], [0, 1]),
              }}
            >
              La mejor IA para amantes de la música
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Transition 1 */}
      <Sequence from={115} durationInFrames={15}>
        <AbsoluteFill
          style={{
            backgroundColor: '#000000',
            transform: `translateX(${interpolate(
              frame - 115,
              [0, 15],
              [100, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}%)`,
          }}
        />
      </Sequence>

      {/* Scene 2: App Opening (4-8s) */}
      <Sequence from={130} durationInFrames={120}>
        <AbsoluteFill>
          <ScreenRecording
            type="app-opening"
            accentColor={accentColor}
            startFrame={frame - 130}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Transition 2 */}
      <Sequence from={245} durationInFrames={15}>
        <AbsoluteFill
          style={{
            backgroundColor: brandColor,
            transform: `scale(${interpolate(
              frame - 245,
              [0, 15],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )})`,
          }}
        />
      </Sequence>

      {/* Scene 3: Typing Prompt (8-12s) */}
      <Sequence from={260} durationInFrames={120}>
        <AbsoluteFill>
          <ScreenRecording
            type="typing"
            prompt={prompt}
            accentColor={accentColor}
            startFrame={frame - 260}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Transition 3 */}
      <Sequence from={375} durationInFrames={15}>
        <AbsoluteFill
          style={{
            backgroundColor: brandColor,
            opacity: interpolate(
              frame - 375,
              [0, 15],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            ),
          }}
        />
      </Sequence>

      {/* Scene 4: Generating (12-16s) */}
      <Sequence from={390} durationInFrames={120}>
        <AbsoluteFill>
          <ScreenRecording
            type="generating"
            accentColor={accentColor}
            startFrame={frame - 390}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Transition 4 */}
      <Sequence from={505} durationInFrames={15}>
        <AbsoluteFill
          style={{
            backgroundColor: brandColor,
            transform: `translateY(${interpolate(
              frame - 505,
              [0, 15],
              [100, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}%)`,
          }}
        />
      </Sequence>

      {/* Scene 5: Playlist Result (16-24s) */}
      <Sequence from={520} durationInFrames={240}>
        <AbsoluteFill>
          <ScreenRecording
            type="playlist-result"
            accentColor={accentColor}
            startFrame={frame - 520}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Transition 5 */}
      <Sequence from={755} durationInFrames={15}>
        <AbsoluteFill
          style={{
            backgroundColor: brandColor,
            transform: `scale(${interpolate(
              frame - 755,
              [0, 15],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )})`,
          }}
        />
      </Sequence>

      {/* Scene 6: CTA (24-30s) */}
      <Sequence from={770} durationInFrames={180}>
        <AbsoluteFill>
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
            <AppleButton
              text={cta}
              accentColor={accentColor}
              startFrame={frame - 770}
            />
            <div
              style={{
                fontSize: '20px',
                color: 'white',
                marginTop: '40px',
                opacity: 0.8,
                textAlign: 'center',
              }}
            >
              ¡Empieza a crear tus playlists ahora!
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
