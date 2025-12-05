/**
 * Audio System - Sistema de audio con SFX para ads
 * Incluye util playSfx y archivos placeholder
 */

import { useCurrentFrame, useVideoConfig } from 'remotion';

// Tipos de SFX disponibles
export type SFXType = 
  | 'whoosh'
  | 'swoosh' 
  | 'keyboard-click'
  | 'button-click'
  | 'success'
  | 'notification'
  | 'hover'
  | 'focus';

// Configuración de SFX
export const sfxConfig = {
  whoosh: {
    file: '/audio/whoosh.wav',
    volume: 0.6,
    duration: 0.3,
  },
  swoosh: {
    file: '/audio/swoosh.wav', 
    volume: 0.5,
    duration: 0.25,
  },
  'keyboard-click': {
    file: '/audio/keyboard-click.wav',
    volume: 0.4,
    duration: 0.1,
  },
  'button-click': {
    file: '/audio/button-click.wav',
    volume: 0.5,
    duration: 0.15,
  },
  success: {
    file: '/audio/success.wav',
    volume: 0.7,
    duration: 0.4,
  },
  notification: {
    file: '/audio/notification.wav',
    volume: 0.6,
    duration: 0.2,
  },
  hover: {
    file: '/audio/hover.wav',
    volume: 0.3,
    duration: 0.1,
  },
  focus: {
    file: '/audio/focus.wav',
    volume: 0.4,
    duration: 0.15,
  },
} as const;

// Utilidad para reproducir SFX
export const playSfx = (
  frame: number,
  name: SFXType,
  volume: number = 1,
  delay: number = 0
) => {
  const config = sfxConfig[name];
  const { fps } = useVideoConfig();
  
  const startFrame = delay * fps;
  const endFrame = startFrame + (config.duration * fps);
  
  if (frame >= startFrame && frame <= endFrame) {
    const adjustedVolume = config.volume * volume;
    
    // En un entorno real, aquí se reproduciría el audio
    // Por ahora, retornamos la configuración para debugging
    return {
      file: config.file,
      volume: adjustedVolume,
      startFrame,
      endFrame,
    };
  }
  
  return null;
};

// Hook para usar SFX en componentes
export const useSFX = (name: SFXType, volume: number = 1, delay: number = 0) => {
  const frame = useCurrentFrame();
  return playSfx(frame, name, volume, delay);
};

// Generador de audio sintético (placeholder)
export const generateSyntheticSFX = (type: SFXType): string => {
  // En un entorno real, esto generaría audio sintético
  // Por ahora, retornamos una descripción
  const descriptions = {
    whoosh: 'Sonido de aire moviéndose rápidamente',
    swoosh: 'Sonido suave de deslizamiento',
    'keyboard-click': 'Click mecánico de teclado',
    'button-click': 'Click de botón táctil',
    success: 'Sonido de confirmación exitosa',
    notification: 'Sonido de notificación',
    hover: 'Sonido sutil de hover',
    focus: 'Sonido de enfoque',
  };
  
  return descriptions[type] || 'Sonido desconocido';
};

// Configuración de audio para diferentes escenas
export const audioScenes = {
  typing: {
    sfx: 'keyboard-click' as SFXType,
    volume: 0.4,
    frequency: 0.1, // Cada 0.1 segundos
  },
  buttonPress: {
    sfx: 'button-click' as SFXType,
    volume: 0.5,
  },
  slideTransition: {
    sfx: 'whoosh' as SFXType,
    volume: 0.6,
  },
  success: {
    sfx: 'success' as SFXType,
    volume: 0.7,
  },
  hover: {
    sfx: 'hover' as SFXType,
    volume: 0.3,
  },
} as const;

export default {
  playSfx,
  useSFX,
  generateSyntheticSFX,
  audioScenes,
  sfxConfig,
};

