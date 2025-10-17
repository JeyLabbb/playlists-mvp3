// Professional sound effects system for Remotion
import { useCurrentFrame } from 'remotion';

// Sound effect types
export type SoundEffect = 'click' | 'typing' | 'success' | 'transition' | 'notification';

// Sound effect configuration
interface SoundConfig {
  volume: number;
  pitch: number;
  duration: number;
  fadeIn?: number;
  fadeOut?: number;
}

// Default sound configurations
export const soundConfigs: Record<SoundEffect, SoundConfig> = {
  click: {
    volume: 0.7,
    pitch: 1.0,
    duration: 0.1,
    fadeIn: 0.01,
    fadeOut: 0.05,
  },
  typing: {
    volume: 0.4,
    pitch: 1.2,
    duration: 0.05,
    fadeIn: 0.01,
    fadeOut: 0.02,
  },
  success: {
    volume: 0.8,
    pitch: 1.0,
    duration: 0.3,
    fadeIn: 0.05,
    fadeOut: 0.1,
  },
  transition: {
    volume: 0.6,
    pitch: 0.9,
    duration: 0.2,
    fadeIn: 0.02,
    fadeOut: 0.08,
  },
  notification: {
    volume: 0.9,
    pitch: 1.1,
    duration: 0.4,
    fadeIn: 0.05,
    fadeOut: 0.1,
  },
};

// Generate synthetic sound effects using Web Audio API
export const generateSoundEffect = (type: SoundEffect, config: SoundConfig): string => {
  // In a real implementation, you would use Web Audio API to generate sounds
  // For now, we'll return data URIs for simple tones
  
  const duration = config.duration;
  const sampleRate = 44100;
  const samples = Math.floor(duration * sampleRate);
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
  
  // Generate tone
  const frequency = getFrequencyForType(type, config.pitch);
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    const envelope = getEnvelope(i, samples, config);
    const volume = config.volume * envelope;
    view.setInt16(44 + i * 2, sample * volume * 32767, true);
  }
  
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`;
};

// Get frequency for different sound types
const getFrequencyForType = (type: SoundEffect, pitch: number): number => {
  const baseFrequencies: Record<SoundEffect, number> = {
    click: 800,
    typing: 1000,
    success: 600,
    transition: 400,
    notification: 700,
  };
  
  return baseFrequencies[type] * pitch;
};

// Get envelope for fade in/out
const getEnvelope = (sample: number, totalSamples: number, config: SoundConfig): number => {
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

// Hook for playing sound effects at specific frames
export const useSoundEffect = (
  type: SoundEffect,
  triggerFrame: number,
  customConfig?: Partial<SoundConfig>
) => {
  const frame = useCurrentFrame();
  const config = { ...soundConfigs[type], ...customConfig };
  
  if (frame === triggerFrame) {
    // In a real implementation, you would play the sound here
    // For now, we'll just log it
    console.log(`Playing ${type} sound effect at frame ${frame}`);
    
    // Return the sound data URI for potential use
    return generateSoundEffect(type, config);
  }
  
  return null;
};

// Sound effect presets for common scenarios
export const soundPresets = {
  // Button click
  buttonClick: (frame: number, startFrame: number) => {
    return useSoundEffect('click', startFrame, { volume: 0.6, pitch: 1.1 });
  },
  
  // Typing sound
  typingSound: (frame: number, startFrame: number, charIndex: number) => {
    return useSoundEffect('typing', startFrame + charIndex * 2, { 
      volume: 0.3, 
      pitch: 1.0 + Math.random() * 0.2 
    });
  },
  
  // Success notification
  successSound: (frame: number, startFrame: number) => {
    return useSoundEffect('success', startFrame + 30, { 
      volume: 0.8, 
      pitch: 1.0 
    });
  },
  
  // Transition sound
  transitionSound: (frame: number, startFrame: number) => {
    return useSoundEffect('transition', startFrame + 10, { 
      volume: 0.5, 
      pitch: 0.9 
    });
  },
  
  // Notification sound
  notificationSound: (frame: number, startFrame: number) => {
    return useSoundEffect('notification', startFrame, { 
      volume: 0.7, 
      pitch: 1.0 
    });
  },
};
