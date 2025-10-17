import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

// 3D Button with depth and shadow
interface Button3DProps {
  text: string;
  accentColor: string;
  startFrame: number;
  scale?: number;
  depth?: number;
}

export const Button3D: React.FC<Button3DProps> = ({
  text,
  accentColor,
  startFrame,
  scale = 1,
  depth = 8,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const buttonScale = spring({
    frame: relativeFrame,
    fps: 30,
    config: { damping: 200, stiffness: 200 },
  });

  const glowIntensity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.3, 1]
  );

  return (
    <div
      style={{
        position: 'relative',
        transform: `scale(${buttonScale * scale})`,
      }}
    >
      {/* Shadow */}
      <div
        style={{
          position: 'absolute',
          top: depth,
          left: depth,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '50px',
          zIndex: 0,
        }}
      />
      
      {/* Button */}
      <div
        style={{
          position: 'relative',
          backgroundColor: accentColor,
          color: '#000000',
          fontSize: '24px',
          fontWeight: '600',
          padding: '20px 40px',
          borderRadius: '50px',
          textAlign: 'center',
          boxShadow: `0 0 ${glowIntensity * 40}px ${accentColor}40, inset 0 2px 4px rgba(255,255,255,0.3)`,
          border: `2px solid ${accentColor}`,
          borderTop: `2px solid ${accentColor}CC`,
          borderLeft: `2px solid ${accentColor}CC`,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          zIndex: 1,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Spotify logo with 3D effect
interface SpotifyLogo3DProps {
  startFrame: number;
  size?: number;
}

export const SpotifyLogo3D: React.FC<SpotifyLogo3DProps> = ({
  startFrame,
  size = 60,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const rotation = interpolate(
    frame,
    [0, 360],
    [0, 360]
  );

  const scale = spring({
    frame: relativeFrame,
    fps: 30,
    config: { damping: 200, stiffness: 200 },
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        transform: `scale(${scale}) rotate(${rotation * 0.1}deg)`,
      }}
    >
      {/* Shadow */}
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '50%',
          zIndex: 0,
        }}
      />
      
      {/* Logo */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#1DB954',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.2)`,
          border: `2px solid #1DB954`,
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: size * 0.6,
            height: size * 0.6,
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: size * 0.3,
              height: size * 0.3,
              background: 'linear-gradient(45deg, #1DB954, #1ed760)',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Animated text with dynamic effects
interface DynamicTextProps {
  text: string;
  startFrame: number;
  duration: number;
  accentColor: string;
  fontSize?: string;
  effect?: 'slide' | 'glitch' | 'type' | 'zoom';
}

export const DynamicText: React.FC<DynamicTextProps> = ({
  text,
  startFrame,
  duration,
  accentColor,
  fontSize = '32px',
  effect = 'slide',
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const getTextStyle = () => {
    const progress = interpolate(
      relativeFrame,
      [0, duration],
      [0, 1],
      { extrapolateRight: 'clamp' }
    );

    switch (effect) {
      case 'glitch':
        const glitchX = Math.sin(frame * 0.5) * 2 * (1 - progress);
        const glitchY = Math.sin(frame * 0.3) * 1 * (1 - progress);
        return {
          transform: `translate(${glitchX}px, ${glitchY}px) scale(${progress})`,
          opacity: progress,
          filter: `hue-rotate(${glitchX * 20}deg)`,
          textShadow: `0 0 ${progress * 20}px ${accentColor}`,
        };

      case 'type':
        const visibleChars = Math.floor(progress * text.length);
        return {
          opacity: 1,
          transform: 'none',
          filter: 'none',
          textShadow: `0 0 ${progress * 15}px ${accentColor}`,
        };

      case 'zoom':
        return {
          transform: `scale(${interpolate(progress, [0, 0.5, 1], [0.5, 1.1, 1])})`,
          opacity: progress,
          filter: `blur(${interpolate(progress, [0, 0.5, 1], [5, 0, 5])}px)`,
          textShadow: `0 0 ${progress * 25}px ${accentColor}`,
        };

      default: // slide
        return {
          transform: `translateY(${interpolate(progress, [0, 1], [50, 0])}px)`,
          opacity: progress,
          filter: 'none',
          textShadow: `0 0 ${progress * 15}px ${accentColor}`,
        };
    }
  };

  const visibleText = effect === 'type' 
    ? text.slice(0, Math.floor(interpolate(relativeFrame, [0, duration], [0, text.length], { extrapolateRight: 'clamp' })))
    : text;

  return (
    <div
      style={{
        fontSize,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...getTextStyle(),
      }}
    >
      {visibleText}
      {effect === 'type' && (
        <span
          style={{
            opacity: interpolate(
              Math.sin(frame * 0.3),
              [-1, 1],
              [0, 1]
            ),
            marginLeft: '2px',
          }}
        >
          |
        </span>
      )}
    </div>
  );
};

// Particle system for dynamic backgrounds
interface ParticleSystemProps {
  startFrame: number;
  particleCount?: number;
  accentColor: string;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  startFrame,
  particleCount = 20,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: particleCount }, (_, i) => {
        const delay = i * 5;
        const x = (i * 37) % 100; // Pseudo-random distribution
        const y = (i * 23) % 100;
        const size = 2 + (i % 3);
        
        const opacity = interpolate(
          relativeFrame - delay,
          [0, 60, 120],
          [0, 0.6, 0],
          { extrapolateRight: 'clamp' }
        );

        const translateY = interpolate(
          relativeFrame - delay,
          [0, 120],
          [0, -100],
          { extrapolateRight: 'clamp' }
        );

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              backgroundColor: accentColor,
              borderRadius: '50%',
              opacity,
              transform: `translateY(${translateY}px)`,
              boxShadow: `0 0 ${size * 2}px ${accentColor}`,
            }}
          />
        );
      })}
    </div>
  );
};

// Glitch effect overlay
interface GlitchOverlayProps {
  startFrame: number;
  duration: number;
  intensity?: number;
}

export const GlitchOverlay: React.FC<GlitchOverlayProps> = ({
  startFrame,
  duration,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const isActive = relativeFrame >= 0 && relativeFrame <= duration;
  
  if (!isActive) return null;

  const glitchIntensity = interpolate(
    relativeFrame,
    [0, duration * 0.5, duration],
    [0, intensity, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          linear-gradient(90deg, 
            transparent 0%, 
            rgba(255,0,255,${glitchIntensity * 0.1}) 25%, 
            transparent 50%, 
            rgba(0,255,255,${glitchIntensity * 0.1}) 75%, 
            transparent 100%
          )
        `,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
        transform: `translateX(${Math.sin(frame * 0.1) * glitchIntensity * 10}px)`,
      }}
    />
  );
};
