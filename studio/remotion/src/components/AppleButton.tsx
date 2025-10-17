import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface AppleButtonProps {
  text: string;
  accentColor: string;
  startFrame: number;
}

export const AppleButton: React.FC<AppleButtonProps> = ({
  text,
  accentColor,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const scale = spring({
    frame: relativeFrame,
    fps: 30,
    config: { damping: 200, stiffness: 200 },
  });

  const glow = interpolate(
    Math.sin(relativeFrame * 0.1),
    [-1, 1],
    [0.3, 1]
  );

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        cursor: 'pointer',
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
          boxShadow: `0 0 ${glow * 40}px ${accentColor}40`,
          border: 'none',
          outline: 'none',
          transition: 'all 0.3s ease',
          minWidth: '280px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {text}
      </div>
    </div>
  );
};
