import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface StaggerProps {
  children: React.ReactNode;
  delay?: number; // Delay between each child in frames
  startFrame?: number;
  durationInFrames?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  delay = 10,
  startFrame = 0,
  durationInFrames = 30,
  direction = 'up',
  distance = 50,
}) => {
  const frame = useCurrentFrame();
  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.map((child, index) => {
        const childStartFrame = startFrame + index * delay;
        const childFrame = frame - childStartFrame;

        const progress = interpolate(
          childFrame,
          [0, durationInFrames],
          [0, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        const springValue = spring({
          frame: childFrame,
          fps: 30,
          config: {
            damping: 200,
            stiffness: 200,
          },
        });

        // Calculate transform based on direction
        let transform = '';
        switch (direction) {
          case 'up':
            transform = `translateY(${distance * (1 - progress)}px)`;
            break;
          case 'down':
            transform = `translateY(${-distance * (1 - progress)}px)`;
            break;
          case 'left':
            transform = `translateX(${distance * (1 - progress)}px)`;
            break;
          case 'right':
            transform = `translateX(${-distance * (1 - progress)}px)`;
            break;
        }

        return (
          <div
            key={index}
            style={{
              opacity: progress,
              transform: `${transform} scale(${0.8 + springValue * 0.2})`,
              transition: 'all 0.3s ease-out',
            }}
          >
            {child}
          </div>
        );
      })}
    </>
  );
};
