/**
 * Transitions - Sistema de transiciones profesionales para ads
 * Basado en principios de motion design y Apple HIG
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { timings } from '../design';

// Tipos para las props de transición
export interface TransitionProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  intensity?: 'subtle' | 'normal' | 'dramatic';
}

// Utilidad para calcular valores de animación
const useAnimationValue = (
  delay: number = 0,
  duration: number = timings.durations.medium,
  easing: number[] = timings.easings.apple.easeOut
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const startFrame = delay * fps;
  const endFrame = startFrame + (duration / 1000) * fps;
  
  const progress = interpolate(
    frame,
    [startFrame, endFrame],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  // Aplicar easing manualmente
  const easedProgress = interpolate(
    progress,
    [0, 1],
    [0, 1],
    {
      easing: (t) => {
        // Implementación simplificada de cubic-bezier
        const [x1, y1, x2, y2] = easing;
        return 3 * (1 - t) * (1 - t) * t * y1 + 
               3 * (1 - t) * t * t * y2 + 
               t * t * t;
      },
    }
  );
  
  return easedProgress;
};

/**
 * SlideIn - Transición de deslizamiento suave
 */
export const SlideIn: React.FC<TransitionProps> = ({
  children,
  delay = 0,
  duration = timings.durations.medium,
  direction = 'up',
  intensity = 'normal',
}) => {
  const progress = useAnimationValue(delay, duration);
  
  const getTransform = () => {
    const distance = intensity === 'subtle' ? 50 : intensity === 'dramatic' ? 150 : 100;
    
    switch (direction) {
      case 'up':
        return `translateY(${(1 - progress) * distance}px)`;
      case 'down':
        return `translateY(${(1 - progress) * -distance}px)`;
      case 'left':
        return `translateX(${(1 - progress) * distance}px)`;
      case 'right':
        return `translateX(${(1 - progress) * -distance}px)`;
      default:
        return `translateY(${(1 - progress) * distance}px)`;
    }
  };
  
  return (
    <AbsoluteFill
      style={{
        transform: getTransform(),
        opacity: progress,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Push - Transición de empuje (como iOS)
 */
export const Push: React.FC<TransitionProps> = ({
  children,
  delay = 0,
  duration = timings.durations.slower,
  direction = 'left',
}) => {
  const progress = useAnimationValue(delay, duration, timings.easings.apple.easeInOut);
  
  const getTransform = () => {
    const distance = 1080; // Ancho completo de la pantalla
    
    switch (direction) {
      case 'left':
        return `translateX(${(1 - progress) * distance}px)`;
      case 'right':
        return `translateX(${(1 - progress) * -distance}px)`;
      case 'up':
        return `translateY(${(1 - progress) * 1920}px)`;
      case 'down':
        return `translateY(${(1 - progress) * -1920}px)`;
      default:
        return `translateX(${(1 - progress) * distance}px)`;
    }
  };
  
  return (
    <AbsoluteFill
      style={{
        transform: getTransform(),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * ZoomInTight - Zoom suave con enfoque
 */
export const ZoomInTight: React.FC<TransitionProps> = ({
  children,
  delay = 0,
  duration = timings.durations.medium,
  intensity = 'normal',
}) => {
  const progress = useAnimationValue(delay, duration, timings.easings.pleia.elastic);
  
  const getScale = () => {
    const baseScale = intensity === 'subtle' ? 0.8 : intensity === 'dramatic' ? 0.3 : 0.6;
    return baseScale + (progress * (1 - baseScale));
  };
  
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${getScale()})`,
        opacity: progress,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * WipeDiagonal - Transición diagonal con máscara
 */
export const WipeDiagonal: React.FC<TransitionProps> = ({
  children,
  delay = 0,
  duration = timings.durations.slower,
  direction = 'left',
}) => {
  const progress = useAnimationValue(delay, duration, timings.easings.apple.easeInOut);
  
  const getClipPath = () => {
    const percentage = progress * 100;
    
    switch (direction) {
      case 'left':
        return `polygon(0% 0%, ${percentage}% 0%, ${percentage}% 100%, 0% 100%)`;
      case 'right':
        return `polygon(${100 - percentage}% 0%, 100% 0%, 100% 100%, ${100 - percentage}% 100%)`;
      case 'up':
        return `polygon(0% ${100 - percentage}%, 100% ${100 - percentage}%, 100% 100%, 0% 100%)`;
      case 'down':
        return `polygon(0% 0%, 100% 0%, 100% ${percentage}%, 0% ${percentage}%)`;
      default:
        return `polygon(0% 0%, ${percentage}% 0%, ${percentage}% 100%, 0% 100%)`;
    }
  };
  
  return (
    <AbsoluteFill
      style={{
        clipPath: getClipPath(),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * MatchCut - Utilidad para reposicionar elementos al mismo rect
 * Útil para transiciones de continuidad visual
 */
export const MatchCut: React.FC<{
  children: React.ReactNode;
  fromRect: { x: number; y: number; width: number; height: number };
  toRect: { x: number; y: number; width: number; height: number };
  delay?: number;
  duration?: number;
}> = ({
  children,
  fromRect,
  toRect,
  delay = 0,
  duration = timings.durations.medium,
}) => {
  const progress = useAnimationValue(delay, duration, timings.easings.apple.easeInOut);
  
  const currentRect = {
    x: fromRect.x + (toRect.x - fromRect.x) * progress,
    y: fromRect.y + (toRect.y - fromRect.y) * progress,
    width: fromRect.width + (toRect.width - fromRect.width) * progress,
    height: fromRect.height + (toRect.height - fromRect.height) * progress,
  };
  
  return (
    <AbsoluteFill
      style={{
        left: currentRect.x,
        top: currentRect.y,
        width: currentRect.width,
        height: currentRect.height,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * FadeIn - Transición de desvanecimiento simple
 */
export const FadeIn: React.FC<TransitionProps> = ({
  children,
  delay = 0,
  duration = timings.durations.medium,
}) => {
  const progress = useAnimationValue(delay, duration);
  
  return (
    <AbsoluteFill
      style={{
        opacity: progress,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * ScaleIn - Transición de escala con bounce
 */
export const ScaleIn: React.FC<TransitionProps> = ({
  children,
  delay = 0,
  duration = timings.durations.medium,
  intensity = 'normal',
}) => {
  const progress = useAnimationValue(delay, duration, timings.easings.pleia.bounce);
  
  const getScale = () => {
    const baseScale = intensity === 'subtle' ? 0.9 : intensity === 'dramatic' ? 0.1 : 0.7;
    return baseScale + (progress * (1 - baseScale));
  };
  
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${getScale()})`,
        opacity: progress,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * RotateIn - Transición de rotación
 */
export const RotateIn: React.FC<TransitionProps> = ({
  children,
  delay = 0,
  duration = timings.durations.medium,
  intensity = 'normal',
}) => {
  const progress = useAnimationValue(delay, duration, timings.easings.pleia.elastic);
  
  const getRotation = () => {
    const baseRotation = intensity === 'subtle' ? 15 : intensity === 'dramatic' ? 180 : 45;
    return (1 - progress) * baseRotation;
  };
  
  return (
    <AbsoluteFill
      style={{
        transform: `rotate(${getRotation()}deg)`,
        opacity: progress,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Exportar todas las transiciones
export const transitions = {
  SlideIn,
  Push,
  ZoomInTight,
  WipeDiagonal,
  MatchCut,
  FadeIn,
  ScaleIn,
  RotateIn,
} as const;

export default transitions;
