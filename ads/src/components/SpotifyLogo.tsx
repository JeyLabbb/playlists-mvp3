/**
 * SpotifyLogo - Componente del logo de Spotify con animaciones
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { interpolate, useCurrentFrame } from 'remotion';

export const SpotifyLogo: React.FC<{
  size?: number;
  animated?: boolean;
  style?: React.CSSProperties;
}> = ({
  size = 200,
  animated = true,
  style = {},
}) => {
  const frame = useCurrentFrame();
  
  const pulseScale = animated ? interpolate(
    frame,
    [0, 15, 30],
    [1, 1.1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  ) : 1;
  
  const glowIntensity = animated ? interpolate(
    frame,
    [0, 15, 30],
    [0.3, 0.8, 0.3],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  ) : 0.5;
  
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
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: '#1DB954',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 ${size * 0.2}px rgba(29, 185, 84, ${glowIntensity})`,
          transform: `scale(${pulseScale})`,
          transition: 'all 0.3s ease',
        }}
      >
        <svg 
          width={size * 0.6} 
          height={size * 0.6} 
          viewBox="0 0 24 24" 
          fill="white"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.5c-.15.24-.42.32-.66.18-1.83-1.12-4.13-1.37-6.84-.75-.27.05-.55-.11-.6-.38-.05-.27.11-.55.38-.6 3.05-.68 5.65-.4 7.8.87.24.15.32.42.18.66zm1.2-2.1c-.18.29-.51.38-.8.21-2.09-1.28-5.28-1.65-7.76-.9-.33.1-.68-.08-.78-.41-.1-.33.08-.68.41-.78 2.8-.85 6.3-.45 8.7 1.03.29.18.38.51.21.8zm.1-2.2C15.25 8.5 8.87 8.16 5.29 9.08c-.4.12-.82-.12-.94-.52-.12-.4.12-.82.52-.94 4.05-1.22 10.95-.82 15.1 1.19.37.22.49.68.27 1.05-.22.37-.68.49-1.05.27z"/>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export default SpotifyLogo;

