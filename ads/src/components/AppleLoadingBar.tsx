/**
 * AppleLoadingBar - Barra de carga estilo Apple
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { tokens } from '../design';

export const AppleLoadingBar: React.FC<{
  width?: number;
  height?: number;
  progress?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({
  width = 300,
  height = 4,
  progress = 100,
  duration = 0.6,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const animatedProgress = interpolate(
    frame,
    [0, duration * fps],
    [0, progress],
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
          width,
          height,
          backgroundColor: tokens.colors.border.subtle,
          borderRadius: tokens.radius.full,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Barra de progreso */}
        <div
          style={{
            width: `${animatedProgress}%`,
            height: '100%',
            backgroundColor: tokens.colors.pleia.green,
            borderRadius: tokens.radius.full,
            transition: `width ${duration}s ease`,
            position: 'relative',
          }}
        >
          {/* Efecto de brillo */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
              borderRadius: tokens.radius.full,
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          />
        </div>
        
        {/* Indicador de progreso */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${animatedProgress}%`,
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            backgroundColor: tokens.colors.text.primary,
            borderRadius: '50%',
            boxShadow: `0 0 8px rgba(255,255,255,0.5)`,
            transition: `left ${duration}s ease`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export default AppleLoadingBar;
