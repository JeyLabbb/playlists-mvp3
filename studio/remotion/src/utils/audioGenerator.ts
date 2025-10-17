// Audio generator for Remotion - creates synthetic sounds
import { useCurrentFrame } from 'remotion';

// Generate simple audio data URLs for different sound effects
export const generateAudioDataURL = (type: 'click' | 'whoosh' | 'success' | 'typing' | 'notification' | 'spotify'): string => {
  const sampleRate = 44100;
  const duration = 0.3; // 300ms
  const samples = Math.floor(sampleRate * duration);
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
  const frequencies = {
    click: [800, 1200],
    whoosh: [200, 400, 600],
    success: [523, 659, 784], // C, E, G chord
    typing: [1000, 1100],
    notification: [700, 900],
    spotify: [440, 554, 659] // A, C#, E
  };
  
  const freq = frequencies[type] || [440];
  
  for (let i = 0; i < samples; i++) {
    let sample = 0;
    
    for (let j = 0; j < freq.length; j++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8); // Exponential decay
      const harmonic = Math.sin(2 * Math.PI * freq[j] * t) * envelope;
      sample += harmonic / freq.length;
    }
    
    // Apply some variation for more interesting sound
    if (type === 'whoosh') {
      const t = i / sampleRate;
      sample *= Math.sin(t * 10) * 0.3 + 0.7;
    }
    
    // Convert to 16-bit
    view.setInt16(44 + i * 2, sample * 0.3 * 32767, true);
  }
  
  const bytes = new Uint8Array(buffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  return `data:audio/wav;base64,${base64}`;
};

// Audio URLs cache
const audioCache: Record<string, string> = {};

export const getAudioURL = (type: 'click' | 'whoosh' | 'success' | 'typing' | 'notification' | 'spotify'): string => {
  if (!audioCache[type]) {
    audioCache[type] = generateAudioDataURL(type);
  }
  return audioCache[type];
};

// Hook for playing sounds at specific frames
export const useSoundEffect = (type: 'click' | 'whoosh' | 'success' | 'typing' | 'notification' | 'spotify', triggerFrame: number) => {
  const frame = useCurrentFrame();
  
  if (frame === triggerFrame) {
    return getAudioURL(type);
  }
  
  return null;
};
