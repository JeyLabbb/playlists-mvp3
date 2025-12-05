/**
 * AnimatedUnderline - Texto con subrayado animado estilo Apple
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { tokens } from '../design';

export const AnimatedUnderline: React.FC<{
  children: React.ReactNode;
  color?: string;
  underlineColor?: string;
  duration?: number;
  delay?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  color = '#007AFF',
  underlineColor = '#007AFF',
  duration = 1.0,
  delay = 0,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const underlineProgress = interpolate(
    frame,
    [delay * fps, (delay + duration) * fps],
    [0, 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          color,
          fontSize: tokens.typography.fontSize['4xl'],
          fontWeight: tokens.typography.fontWeight.bold,
          textAlign: 'center',
          textDecoration: 'none',
        }}
      >
        {children}
        
        {/* Subrayado animado */}
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            left: 0,
            width: `${underlineProgress}%`,
            height: 3,
            backgroundColor: underlineColor,
            borderRadius: tokens.radius.sm,
            transition: `width ${duration}s ease`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export default AnimatedUnderline;
