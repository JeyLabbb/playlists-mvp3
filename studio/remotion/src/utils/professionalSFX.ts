// Professional Sound Effects for vertical video content
import { useCurrentFrame } from 'remotion';

// Sound effect types for different actions
export type SFXType = 
  | 'whoosh' 
  | 'click' 
  | 'pop' 
  | 'swipe' 
  | 'notification' 
  | 'success' 
  | 'typing' 
  | 'transition' 
  | 'glitch' 
  | 'zoom';

// Sound configuration
interface SFXConfig {
  volume: number;
  pitch: number;
  duration: number;
  fadeIn?: number;
  fadeOut?: number;
  reverb?: number;
  delay?: number;
}

// Professional SFX configurations
export const sfxConfigs: Record<SFXType, SFXConfig> = {
  whoosh: {
    volume: 0.8,
    pitch: 1.0,
    duration: 0.4,
    fadeIn: 0.05,
    fadeOut: 0.15,
    reverb: 0.3,
  },
  click: {
    volume: 0.7,
    pitch: 1.2,
    duration: 0.08,
    fadeIn: 0.01,
    fadeOut: 0.03,
  },
  pop: {
    volume: 0.9,
    pitch: 1.1,
    duration: 0.15,
    fadeIn: 0.02,
    fadeOut: 0.08,
  },
  swipe: {
    volume: 0.6,
    pitch: 0.9,
    duration: 0.25,
    fadeIn: 0.03,
    fadeOut: 0.12,
  },
  notification: {
    volume: 0.8,
    pitch: 1.0,
    duration: 0.3,
    fadeIn: 0.05,
    fadeOut: 0.1,
  },
  success: {
    volume: 0.9,
    pitch: 1.0,
    duration: 0.4,
    fadeIn: 0.05,
    fadeOut: 0.15,
    reverb: 0.2,
  },
  typing: {
    volume: 0.4,
    pitch: 1.1,
    duration: 0.06,
    fadeIn: 0.01,
    fadeOut: 0.02,
  },
  transition: {
    volume: 0.7,
    pitch: 0.95,
    duration: 0.2,
    fadeIn: 0.02,
    fadeOut: 0.08,
  },
  glitch: {
    volume: 0.6,
    pitch: 1.3,
    duration: 0.1,
    fadeIn: 0.01,
    fadeOut: 0.04,
  },
  zoom: {
    volume: 0.5,
    pitch: 0.8,
    duration: 0.3,
    fadeIn: 0.02,
    fadeOut: 0.1,
  },
};

// Generate professional sound effects
export const generateSFX = (type: SFXType, config: SFXConfig): string => {
  const sampleRate = 44100;
  const samples = Math.floor(config.duration * sampleRate);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);
  
  // Generate sound based on type
  const frequency = getFrequencyForType(type, config.pitch);
  const harmonics = getHarmonicsForType(type);
  
  for (let i = 0; i < samples; i++) {
    let sample = 0;
    
    // Generate harmonics for richer sound
    for (let h = 0; h < harmonics.length; h++) {
      const harmonicFreq = frequency * harmonics[h];
      const harmonicAmp = harmonics[h] === 1 ? 1 : 0.3 / harmonics[h];
      sample += Math.sin(2 * Math.PI * harmonicFreq * i / sampleRate) * harmonicAmp;
    }
    
    // Apply effects
    sample = applyEffects(sample, i, samples, config);
    
    // Apply envelope
    const envelope = getEnvelope(i, samples, config);
    const volume = config.volume * envelope;
    
    view.setInt16(44 + i * 2, sample * volume * 32767, true);
  }
  
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`;
};

// Get base frequency for different sound types
const getFrequencyForType = (type: SFXType, pitch: number): number => {
  const baseFrequencies: Record<SFXType, number> = {
    whoosh: 200,
    click: 800,
    pop: 600,
    swipe: 300,
    notification: 700,
    success: 500,
    typing: 1000,
    transition: 400,
    glitch: 1200,
    zoom: 250,
  };
  
  return baseFrequencies[type] * pitch;
};

// Get harmonics for richer sound
const getHarmonicsForType = (type: SFXType): number[] => {
  const harmonicSets: Record<SFXType, number[]> = {
    whoosh: [1, 2, 3, 4],
    click: [1, 2, 3],
    pop: [1, 1.5, 2],
    swipe: [1, 2],
    notification: [1, 1.5, 2, 3],
    success: [1, 1.33, 1.67, 2],
    typing: [1, 2],
    transition: [1, 1.5, 2],
    glitch: [1, 1.5, 2.5, 3],
    zoom: [1, 2, 3, 4, 5],
  };
  
  return harmonicSets[type] || [1];
};

// Apply sound effects (reverb, delay, etc.)
const applyEffects = (sample: number, index: number, totalSamples: number, config: SFXConfig): number => {
  let processedSample = sample;
  
  // Reverb effect
  if (config.reverb) {
    const reverbDelay = Math.floor(config.reverb * totalSamples);
    if (index > reverbDelay) {
      // Simple reverb simulation
      processedSample += sample * config.reverb * 0.3;
    }
  }
  
  // Delay effect
  if (config.delay) {
    const delaySamples = Math.floor(config.delay * totalSamples);
    if (index > delaySamples) {
      processedSample += sample * 0.2;
    }
  }
  
  return Math.max(-1, Math.min(1, processedSample));
};

// Get envelope for fade in/out
const getEnvelope = (sample: number, totalSamples: number, config: SFXConfig): number => {
  const fadeInSamples = Math.floor((config.fadeIn || 0) * totalSamples);
  const fadeOutSamples = Math.floor((config.fadeOut || 0) * totalSamples);
  
  let envelope = 1;
  
  // Fade in
  if (sample < fadeInSamples) {
    envelope = sample / fadeInSamples;
  }
  
  // Fade out
  if (sample > totalSamples - fadeOutSamples) {
    envelope = (totalSamples - sample) / fadeOutSamples;
  }
  
  return envelope;
};

// Hook for playing SFX at specific frames
export const useSFX = (type: SFXType, triggerFrame: number, customConfig?: Partial<SFXConfig>) => {
  const frame = useCurrentFrame();
  const config = { ...sfxConfigs[type], ...customConfig };
  
  if (frame === triggerFrame) {
    console.log(`🎵 Playing ${type} SFX at frame ${frame}`);
    return generateSFX(type, config);
  }
  
  return null;
};

// Professional SFX presets for common video scenarios
export const sfxPresets = {
  // Transition sounds
  quickCut: (frame: number, startFrame: number) => 
    useSFX('transition', startFrame, { volume: 0.6, duration: 0.15 }),
  
  dynamicEntrance: (frame: number, startFrame: number) => 
    useSFX('whoosh', startFrame, { volume: 0.8, pitch: 1.1 }),
  
  smoothZoom: (frame: number, startFrame: number) => 
    useSFX('zoom', startFrame, { volume: 0.5, pitch: 0.9 }),
  
  // UI interaction sounds
  buttonClick: (frame: number, startFrame: number) => 
    useSFX('click', startFrame, { volume: 0.7, pitch: 1.2 }),
  
  iconPop: (frame: number, startFrame: number) => 
    useSFX('pop', startFrame, { volume: 0.9, pitch: 1.1 }),
  
  swipeGesture: (frame: number, startFrame: number) => 
    useSFX('swipe', startFrame, { volume: 0.6, pitch: 0.9 }),
  
  // Typing sounds
  typingSound: (frame: number, startFrame: number, charIndex: number) => 
    useSFX('typing', startFrame + charIndex * 2, { 
      volume: 0.3, 
      pitch: 1.0 + Math.random() * 0.2 
    }),
  
  // Success/notification sounds
  playlistGenerated: (frame: number, startFrame: number) => 
    useSFX('success', startFrame, { volume: 0.9, pitch: 1.0 }),
  
  notificationSound: (frame: number, startFrame: number) => 
    useSFX('notification', startFrame, { volume: 0.8, pitch: 1.0 }),
  
  // Special effects
  glitchEffect: (frame: number, startFrame: number) => 
    useSFX('glitch', startFrame, { volume: 0.6, pitch: 1.3 }),
  
  cinematicWhoosh: (frame: number, startFrame: number) => 
    useSFX('whoosh', startFrame, { volume: 0.8, pitch: 0.8, duration: 0.5 }),
};

// Utility to create SFX sequences
export const createSFXSequence = (
  frame: number,
  sounds: Array<{ startFrame: number; type: SFXType; config?: Partial<SFXConfig> }>
) => {
  return sounds.map(sound => 
    useSFX(sound.type, sound.startFrame, sound.config)
  ).filter(Boolean);
};
