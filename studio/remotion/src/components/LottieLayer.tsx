import React from 'react';
import { AbsoluteFill } from 'remotion';

interface LottieLayerProps {
  src: string;
  opacity?: number;
  scale?: number;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
}

export const LottieLayer: React.FC<LottieLayerProps> = ({
  src,
  opacity = 1,
  scale = 1,
  loop = true,
  autoplay = true,
  style = {},
}) => {
  const [animationData, setAnimationData] = React.useState(null);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      {/* Simple animated background circles */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          border: '2px solid #00E5A8',
          opacity: 0.3,
          animation: 'pulse 3s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          border: '1px solid #00E5A8',
          opacity: 0.2,
          animation: 'pulse 4s ease-in-out infinite 1s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '30%',
          left: '20%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          border: '1px solid #00E5A8',
          opacity: 0.25,
          animation: 'pulse 5s ease-in-out infinite 2s',
        }}
      />
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </AbsoluteFill>
  );
};
