import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface PlaylistCardProps {
  title: string;
  artist: string;
  accentColor: string;
  startFrame: number;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  title,
  artist,
  accentColor,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const opacity = interpolate(relativeFrame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(relativeFrame, [0, 30], [50, 0], {
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame: relativeFrame,
    fps: 30,
    config: { damping: 200, stiffness: 200 },
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #333',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Track number */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '16px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#000000',
        }}
      >
        {Math.floor(relativeFrame / 30) + 1}
      </div>

      {/* Track info */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '4px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: '#aaaaaa',
            fontSize: '14px',
          }}
        >
          {artist}
        </div>
      </div>

      {/* Play button */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: `2px solid ${accentColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          opacity: 0.8,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `8px solid ${accentColor}`,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            marginLeft: '2px',
          }}
        />
      </div>
    </div>
  );
};
