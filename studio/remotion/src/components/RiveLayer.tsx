import React from 'react';

interface RiveLayerProps {
  src: string;
  width?: number;
  height?: number;
  opacity?: number;
  scale?: number;
  autoplay?: boolean;
  loop?: boolean;
  style?: React.CSSProperties;
}

export const RiveLayer: React.FC<RiveLayerProps> = ({
  src,
  width = 200,
  height = 200,
  opacity = 1,
  scale = 1,
  autoplay = true,
  loop = true,
  style = {},
}) => {
  return (
    <div
      style={{
        width,
        height,
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* Simple animated loading spinner */}
      <div
        style={{
          width: '60px',
          height: '60px',
          border: `3px solid #00E5A8`,
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
