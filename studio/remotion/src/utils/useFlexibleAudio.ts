// Flexible Audio Hook for Remotion
// Automatically handles different audio formats and paths

import { useCurrentFrame } from 'remotion';
import { getAudioPath, isAudioAvailable, AUDIO_FILES } from './audioConfig';

export interface AudioConfig {
  audioKey: string;
  startFrame: number;
  endFrame?: number;
  volume?: number;
  fallbackToSilent?: boolean;
}

// Hook for flexible audio playback
export const useFlexibleAudio = (config: AudioConfig) => {
  const frame = useCurrentFrame();
  const { audioKey, startFrame, endFrame, volume = 0.7, fallbackToSilent = true } = config;

  // Check if audio is available
  const isAvailable = isAudioAvailable(audioKey);
  const audioPath = getAudioPath(audioKey);

  // Determine if audio should play at current frame
  const shouldPlay = frame >= startFrame && (!endFrame || frame <= endFrame);

  // Return audio component if available and should play
  if (shouldPlay && isAvailable && audioPath) {
    return {
      src: audioPath,
      volume,
      startFrom: Math.max(0, frame - startFrame)
    };
  }

  // Return null if not available (no fallback)
  if (!isAvailable && !fallbackToSilent) {
    return null;
  }

  // Return silent audio if fallback is enabled
  if (shouldPlay && fallbackToSilent) {
    return {
      src: null, // Will be handled by the component
      volume: 0,
      startFrom: 0
    };
  }

  return null;
};

// Multiple audio sequences hook
export const useAudioSequence = (audioConfigs: AudioConfig[]) => {
  const frame = useCurrentFrame();
  
  return audioConfigs
    .map(config => {
      const audio = useFlexibleAudio(config);
      return audio ? { ...audio, key: config.audioKey } : null;
    })
    .filter(Boolean);
};

// Audio availability checker
export const checkAudioAvailability = () => {
  const available = Object.keys(AUDIO_FILES).filter(key => isAudioAvailable(key));
  const unavailable = Object.keys(AUDIO_FILES).filter(key => !isAudioAvailable(key));
  
  return {
    available,
    unavailable,
    total: Object.keys(AUDIO_FILES).length,
    availableCount: available.length,
    unavailableCount: unavailable.length
  };
};

// Audio file info for debugging
export const getAudioInfo = (audioKey: string) => {
  const audioFile = AUDIO_FILES[audioKey];
  if (!audioFile) {
    return { error: `Audio file '${audioKey}' not found` };
  }

  return {
    name: audioFile.name,
    path: audioFile.path,
    format: audioFile.format,
    size: audioFile.size,
    description: audioFile.description,
    available: audioFile.available,
    status: audioFile.available ? 'Ready to use' : 'Needs to be added by user'
  };
};
