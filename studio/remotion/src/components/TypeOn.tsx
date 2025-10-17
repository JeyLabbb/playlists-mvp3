import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface TypeOnProps {
  text: string;
  startFrame: number;
  durationInFrames: number;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
}

export const TypeOn: React.FC<TypeOnProps> = ({
  text,
  startFrame,
  durationInFrames,
  color = '#ffffff',
  fontSize = '16px',
  fontFamily = 'Arial, sans-serif',
}) => {
  const frame = useCurrentFrame();
  
  // Calculate typing progress
  const typingProgress = interpolate(
    frame - startFrame,
    [0, durationInFrames],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Calculate how many characters to show
  const charactersToShow = Math.floor(typingProgress * text.length);
  const visibleText = text.slice(0, charactersToShow);

  // Calculate caret blink
  const caretOpacity = interpolate(
    Math.sin((frame - startFrame) * 0.5),
    [-1, 1],
    [0, 1]
  );

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        color,
        display: 'flex',
        alignItems: 'center',
        minHeight: '40px',
        padding: '10px 20px',
        backgroundColor: '#333333',
        borderRadius: '8px',
        border: `2px solid ${color}`,
        position: 'relative',
      }}
    >
      <span>{visibleText}</span>
      <span
        style={{
          opacity: caretOpacity,
          marginLeft: '2px',
          width: '2px',
          height: fontSize,
          backgroundColor: color,
          display: 'inline-block',
        }}
      />
    </div>
  );
};
