// Professional transition presets for Apple-style animations
import { interpolate } from 'remotion';

export const transitions = {
  // Apple-style easing curves
  appleEase: (t: number): number => {
    if (t < 0.5) {
      return 4 * t * t * t;
    }
    return 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  // Smooth spring-like transition
  smoothSpring: (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  },

  // Bounce effect for playful elements
  bounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },

  // Elastic transition
  elastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  // Slide in from right (Apple style)
  slideInRight: (frame: number, startFrame: number, duration: number) => {
    return interpolate(
      frame - startFrame,
      [0, duration],
      [100, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: transitions.appleEase,
      }
    );
  },

  // Slide in from bottom
  slideInBottom: (frame: number, startFrame: number, duration: number) => {
    return interpolate(
      frame - startFrame,
      [0, duration],
      [50, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: transitions.smoothSpring,
      }
    );
  },

  // Fade in with scale
  fadeInScale: (frame: number, startFrame: number, duration: number) => {
    return interpolate(
      frame - startFrame,
      [0, duration],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: transitions.appleEase,
      }
    );
  },

  // Scale effect
  scale: (frame: number, startFrame: number, duration: number) => {
    return interpolate(
      frame - startFrame,
      [0, duration],
      [0.8, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: transitions.bounce,
      }
    );
  },

  // Glow effect
  glow: (frame: number, startFrame: number, duration: number, intensity: number = 1) => {
    return interpolate(
      Math.sin((frame - startFrame) * 0.1),
      [-1, 1],
      [0.3 * intensity, 1 * intensity]
    );
  },

  // Typing effect timing
  typingTiming: (frame: number, startFrame: number, textLength: number, duration: number) => {
    return interpolate(
      frame - startFrame,
      [0, duration],
      [0, textLength],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: transitions.appleEase,
      }
    );
  },

  // Stagger effect for multiple elements
  stagger: (frame: number, startFrame: number, index: number, staggerDelay: number = 5) => {
    return interpolate(
      frame - startFrame - (index * staggerDelay),
      [0, 30],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: transitions.smoothSpring,
      }
    );
  },
};

// Sound effect timing helpers
export const soundTiming = {
  // Click sound timing
  click: (frame: number, startFrame: number) => {
    return frame === startFrame;
  },

  // Typing sound timing
  typing: (frame: number, startFrame: number, textLength: number, duration: number) => {
    const currentChar = Math.floor(transitions.typingTiming(frame, startFrame, textLength, duration));
    return currentChar !== Math.floor(transitions.typingTiming(frame - 1, startFrame, textLength, duration));
  },

  // Success sound timing
  success: (frame: number, startFrame: number) => {
    return frame === startFrame + 30; // Play after 1 second
  },

  // Transition sound timing
  transition: (frame: number, startFrame: number) => {
    return frame === startFrame + 10; // Play 10 frames into transition
  },
};
