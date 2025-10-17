import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { LottieLayer } from '../components/LottieLayer';

interface HeroBgLoopProps {
  brandColor: string;
  accentColor: string;
}

export const HeroBgLoop: React.FC<HeroBgLoopProps> = ({
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Create a seamless loop
  const loopProgress = interpolate(frame, [0, 240], [0, 1], {
    extrapolateLeft: 'extend',
    extrapolateRight: 'extend',
  });

  // Gradient animation
  const gradientRotation = interpolate(loopProgress, [0, 1], [0, 360]);

  // Pulse animation
  const pulseScale = interpolate(
    Math.sin(loopProgress * Math.PI * 2),
    [-1, 1],
    [0.8, 1.2]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* Animated gradient overlay */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `linear-gradient(${gradientRotation}deg, 
            ${accentColor}20 0%, 
            transparent 30%, 
            transparent 70%, 
            ${accentColor}15 100%)`,
          opacity: 0.3,
        }}
      />

      {/* Main Lottie animation */}
      <LottieLayer
        src="/studio/lotties/bg-soft-pulse.json"
        opacity={0.25}
        scale={pulseScale}
      />

      {/* Additional subtle elements */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          border: `2px solid ${accentColor}`,
          opacity: 0.1,
          transform: `translate(-50%, -50%) scale(${pulseScale})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          backgroundColor: accentColor,
          opacity: 0.05,
          transform: `scale(${interpolate(
            Math.sin(loopProgress * Math.PI * 2 + Math.PI / 4),
            [-1, 1],
            [0.5, 1.5]
          )})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          backgroundColor: accentColor,
          opacity: 0.08,
          transform: `scale(${interpolate(
            Math.sin(loopProgress * Math.PI * 2 + Math.PI / 2),
            [-1, 1],
            [0.3, 1.7]
          )})`,
        }}
      />
    </AbsoluteFill>
  );
};
