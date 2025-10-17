import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';
import { Stagger } from './Stagger';

interface TrackListDemoProps {
  tracks: string[];
  accentColor: string;
  startFrame: number;
}

export const TrackListDemo: React.FC<TrackListDemoProps> = ({
  tracks,
  accentColor,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px 0',
      }}
    >
      <Stagger
        delay={15}
        startFrame={relativeFrame}
        durationInFrames={30}
        direction="up"
        distance={30}
      >
        {tracks.map((track, index) => (
          <TrackItem
            key={index}
            track={track}
            accentColor={accentColor}
            index={index}
          />
        ))}
      </Stagger>
    </div>
  );
};

interface TrackItemProps {
  track: string;
  accentColor: string;
  index: number;
}

const TrackItem: React.FC<TrackItemProps> = ({ track, accentColor, index }) => {
  const frame = useCurrentFrame();

  // Create a subtle hover pulse effect
  const pulseScale = interpolate(
    Math.sin(frame * 0.1 + index * 0.5),
    [-1, 1],
    [1, 1.02]
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: '#333333',
        borderRadius: '12px',
        border: '1px solid #444444',
        transform: `scale(${pulseScale})`,
        transition: 'all 0.3s ease-out',
        position: 'relative',
        overflow: 'hidden',
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
        {index + 1}
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
          {track.split(' - ')[0]}
        </div>
        <div
          style={{
            color: '#aaaaaa',
            fontSize: '14px',
          }}
        >
          {track.split(' - ')[1]}
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
          transition: 'all 0.3s ease-out',
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

      {/* Hover effect overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(90deg, transparent, ${accentColor}10, transparent)`,
          opacity: 0,
          transition: 'opacity 0.3s ease-out',
        }}
      />
    </div>
  );
};
