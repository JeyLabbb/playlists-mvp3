import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { TypeOn } from '../components/TypeOn';
import { LottieLayer } from '../components/LottieLayer';
import { RiveLayer } from '../components/RiveLayer';
import { TrackListDemo } from '../components/TrackListDemo';
import { ThreeLogo } from '../components/ThreeLogo';

interface AdMainProps {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
  enableThree: boolean;
}

export const AdMain: React.FC<AdMainProps> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
  enableThree
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene 1: Hook (0-3s, frames 0-90)
  const scene1Progress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const headlineScale = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 200,
    },
  });

  const headlineOpacity = interpolate(scene1Progress, [0, 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Scene 2: Demo (3-15s, frames 90-450)
  const scene2Progress = interpolate(frame, [90, 450], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const typeOnStart = interpolate(scene2Progress, [0, 0.2], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const loaderStart = interpolate(scene2Progress, [0.1, 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const trackListStart = interpolate(scene2Progress, [0.3, 0.8], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const threeStart = interpolate(scene2Progress, [0.4, 0.7], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Scene 3: CTA (15-18s, frames 450-540)
  const scene3Progress = interpolate(frame, [450, 540], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const ctaOpacity = interpolate(scene3Progress, [0, 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const ctaScale = spring({
    frame: frame - 450,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  const ctaGlow = interpolate(scene3Progress, [0.7, 1], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* Background Lottie */}
      <LottieLayer
        src="/studio/lotties/bg-soft-pulse.json"
        opacity={0.2}
        scale={1}
      />

      {/* Scene 1: Hook */}
      <AbsoluteFill
        style={{
          opacity: frame < 90 ? 1 : 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '80px',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              transform: `scale(${headlineScale})`,
              opacity: headlineOpacity,
              textShadow: `0 0 20px ${accentColor}`,
              lineHeight: 1.2,
            }}
          >
            {headline}
          </h1>
        </div>
      </AbsoluteFill>

      {/* Scene 2: Demo */}
      <AbsoluteFill
        style={{
          opacity: frame >= 90 && frame < 450 ? 1 : 0,
        }}
      >
        {/* Mock UI Background */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '900px',
            height: '1600px',
            backgroundColor: '#222222',
            borderRadius: '16px',
            border: '2px solid #333333',
            padding: '40px',
          }}
        >
          {/* Prompt Input */}
          <div
            style={{
              marginBottom: '40px',
              opacity: typeOnStart,
            }}
          >
            <TypeOn
              text={prompt}
              startFrame={frame - 90}
              durationInFrames={90}
              color={accentColor}
              fontSize="18px"
            />
          </div>

          {/* Loader */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '40px',
              opacity: loaderStart,
            }}
          >
            <RiveLayer
              src="/studio/rive/loader.riv"
              width={60}
              height={60}
              opacity={1}
            />
          </div>

          {/* Track List */}
          <div style={{ opacity: trackListStart }}>
            <TrackListDemo
              tracks={[
                'Track 1 - Artist 1',
                'Track 2 - Artist 2',
                'Track 3 - Artist 3',
                'Track 4 - Artist 4',
                'Track 5 - Artist 5',
              ]}
              accentColor={accentColor}
              startFrame={frame - 90}
            />
          </div>

          {/* Three Logo (optional) */}
          {enableThree && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                opacity: threeStart,
              }}
            >
              <ThreeLogo
                text="AI"
                accentColor={accentColor}
                startFrame={frame - 90}
              />
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Scene 3: CTA */}
      <AbsoluteFill
        style={{
          opacity: frame >= 450 ? 1 : 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '80px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              opacity: ctaOpacity,
              transform: `scale(${ctaScale})`,
            }}
          >
            <h2
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: accentColor,
                margin: 0,
                textShadow: `0 0 ${ctaGlow * 30}px ${accentColor}`,
                lineHeight: 1.2,
              }}
            >
              {cta}
            </h2>
            <p
              style={{
                fontSize: '24px',
                color: 'white',
                marginTop: '20px',
                opacity: 0.8,
              }}
            >
              ¡Empieza a crear tus playlists ahora!
            </p>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
