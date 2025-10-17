import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface ThreeLogoProps {
  text: string;
  accentColor: string;
  startFrame: number;
}

export const ThreeLogo: React.FC<ThreeLogoProps> = ({
  text,
  accentColor,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  // Animate the logo appearance
  const scale = spring({
    frame: relativeFrame,
    fps: 30,
    config: {
      damping: 200,
      stiffness: 200,
    },
  });

  const rotation = interpolate(relativeFrame, [0, 60], [0, 360], {
    extrapolateRight: 'clamp',
  });

  const glowIntensity = interpolate(
    Math.sin(relativeFrame * 0.2),
    [-1, 1],
    [0.5, 1]
  );

  return (
    <div
      style={{
        width: '120px',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        position: 'relative',
      }}
    >
      {/* Background circle */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
          boxShadow: `0 0 ${glowIntensity * 30}px ${accentColor}40`,
        }}
      />

      {/* Main logo circle */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: `3px solid ${accentColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: accentColor,
            textShadow: `0 0 ${glowIntensity * 10}px ${accentColor}`,
          }}
        >
          {text}
        </div>
      </div>

      {/* Rotating ring */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: `2px solid ${accentColor}`,
          borderRadius: '50%',
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          transform: `rotate(${rotation * 2}deg)`,
          opacity: 0.6,
        }}
      />

      {/* Particles */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60) + (rotation * 0.5);
        const radius = 60;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: accentColor,
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              opacity: 0.8,
              boxShadow: `0 0 ${glowIntensity * 5}px ${accentColor}`,
            }}
          />
        );
      })}
    </div>
  );
};
