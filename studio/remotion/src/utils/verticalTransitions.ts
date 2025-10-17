// Professional vertical transitions for TikTok/Reels style videos
import { interpolate } from 'remotion';

export interface TransitionConfig {
  duration: number;
  direction: 'up' | 'down' | 'left' | 'right';
  style: 'slide' | 'glitch' | 'zoom' | 'blur' | 'flip' | 'wipe';
  intensity?: number;
  easing?: (t: number) => number;
}

// High-quality easing curves for professional feel
export const easing = {
  // Apple-style smooth
  apple: (t: number): number => {
    if (t < 0.5) return 4 * t * t * t;
    return 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  // Cinematic anticipation
  cinematic: (t: number): number => {
    return t * t * (3 - 2 * t);
  },

  // Sharp and snappy for social media
  snappy: (t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  },

  // Glitch effect
  glitch: (t: number): number => {
    return t + Math.sin(t * 20) * 0.1 * (1 - t);
  },

  // Elastic bounce
  elastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

// Vertical slide transition (most common for mobile)
export const verticalSlide = (frame: number, startFrame: number, config: TransitionConfig) => {
  const progress = interpolate(
    frame - startFrame,
    [0, config.duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: config.easing || easing.apple,
    }
  );

  const direction = config.direction === 'up' ? -1 : 1;
  const translateY = interpolate(progress, [0, 1], [direction * 100, 0]);

  return {
    transform: `translateY(${translateY}%)`,
    opacity: interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
  };
};

// Glitch transition for dynamic effect
export const glitchTransition = (frame: number, startFrame: number, config: TransitionConfig) => {
  const progress = interpolate(
    frame - startFrame,
    [0, config.duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easing.glitch,
    }
  );

  const glitchOffset = Math.sin(frame * 0.5) * 2 * (1 - progress);
  const glitchScale = 1 + Math.sin(frame * 0.3) * 0.05 * (1 - progress);

  return {
    transform: `translateX(${glitchOffset}px) scale(${glitchScale})`,
    opacity: interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
    filter: `hue-rotate(${glitchOffset * 10}deg) contrast(${1 + glitchOffset * 0.1})`,
  };
};

// Zoom transition with blur
export const zoomBlur = (frame: number, startFrame: number, config: TransitionConfig) => {
  const progress = interpolate(
    frame - startFrame,
    [0, config.duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: config.easing || easing.cinematic,
    }
  );

  const scale = interpolate(progress, [0, 0.5, 1], [0.8, 1.1, 1]);
  const blur = interpolate(progress, [0, 0.5, 1], [10, 0, 10]);

  return {
    transform: `scale(${scale})`,
    opacity: interpolate(progress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]),
    filter: `blur(${blur}px)`,
  };
};

// Flip transition for dynamic rotation
export const flipTransition = (frame: number, startFrame: number, config: TransitionConfig) => {
  const progress = interpolate(
    frame - startFrame,
    [0, config.duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: config.easing || easing.elastic,
    }
  );

  const rotateY = interpolate(progress, [0, 0.5, 1], [90, 0, -90]);
  const scale = interpolate(progress, [0, 0.5, 1], [0.8, 1, 0.8]);

  return {
    transform: `rotateY(${rotateY}deg) scale(${scale})`,
    opacity: interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
    transformOrigin: 'center center',
  };
};

// Wipe transition (like a curtain)
export const wipeTransition = (frame: number, startFrame: number, config: TransitionConfig) => {
  const progress = interpolate(
    frame - startFrame,
    [0, config.duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: config.easing || easing.snappy,
    }
  );

  const direction = config.direction === 'up' ? -1 : 1;
  const clipPath = `inset(${direction === 1 ? (1 - progress) * 100 : 0}% 0 ${direction === -1 ? (1 - progress) * 100 : 0}% 0)`;

  return {
    clipPath,
    opacity: 1,
  };
};

// Master transition function
export const createTransition = (frame: number, startFrame: number, config: TransitionConfig) => {
  switch (config.style) {
    case 'slide':
      return verticalSlide(frame, startFrame, config);
    case 'glitch':
      return glitchTransition(frame, startFrame, config);
    case 'zoom':
    case 'blur':
      return zoomBlur(frame, startFrame, config);
    case 'flip':
      return flipTransition(frame, startFrame, config);
    case 'wipe':
      return wipeTransition(frame, startFrame, config);
    default:
      return verticalSlide(frame, startFrame, config);
  }
};

// Predefined transition presets for common scenarios
export const transitionPresets = {
  // Fast cuts for social media
  quickCut: {
    duration: 10,
    direction: 'up' as const,
    style: 'slide' as const,
    easing: easing.snappy,
  },

  // Dynamic entrance
  dynamicEntrance: {
    duration: 20,
    direction: 'down' as const,
    style: 'glitch' as const,
    easing: easing.glitch,
  },

  // Smooth zoom
  smoothZoom: {
    duration: 30,
    direction: 'up' as const,
    style: 'zoom' as const,
    easing: easing.cinematic,
  },

  // Dramatic flip
  dramaticFlip: {
    duration: 25,
    direction: 'up' as const,
    style: 'flip' as const,
    easing: easing.elastic,
  },

  // Clean wipe
  cleanWipe: {
    duration: 15,
    direction: 'down' as const,
    style: 'wipe' as const,
    easing: easing.apple,
  },
};

// Utility to create multiple transitions in sequence
export const createTransitionSequence = (
  frame: number,
  transitions: Array<{ startFrame: number; config: TransitionConfig }>
) => {
  for (const transition of transitions) {
    if (frame >= transition.startFrame && frame < transition.startFrame + transition.config.duration) {
      return createTransition(frame, transition.startFrame, transition.config);
    }
  }
  return { transform: 'none', opacity: 1, filter: 'none', clipPath: 'none' };
};
