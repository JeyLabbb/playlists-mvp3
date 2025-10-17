// Real audio integration for Remotion videos
import { Audio, useCurrentFrame } from 'remotion';

// Audio file paths (you'll need to add these to public/studio/audio/)
const AUDIO_FILES = {
  typing: '/studio/audio/typing.mp3',
  click: '/studio/audio/click.mp3',
  whoosh: '/studio/audio/whoosh.mp3',
  success: '/studio/audio/success.mp3',
  notification: '/studio/audio/notification.mp3',
  spotify: '/studio/audio/spotify.mp3',
  background: '/studio/audio/background.mp3',
};

// Hook for playing audio at specific frames
export const useRealAudio = (soundFile: keyof typeof AUDIO_FILES, triggerFrame: number) => {
  const frame = useCurrentFrame();
  
  if (frame === triggerFrame) {
    return (
      <Audio
        src={AUDIO_FILES[soundFile]}
        startFrom={0}
        volume={0.7}
      />
    );
  }
  
  return null;
};

// Audio sequence component
interface AudioSequenceProps {
  sounds: Array<{
    frame: number;
    file: keyof typeof AUDIO_FILES;
    volume?: number;
  }>;
}

export const AudioSequence: React.FC<AudioSequenceProps> = ({ sounds }) => {
  const frame = useCurrentFrame();
  
  return (
    <>
      {sounds.map((sound, index) => (
        frame === sound.frame && (
          <Audio
            key={index}
            src={AUDIO_FILES[sound.file]}
            startFrom={0}
            volume={sound.volume || 0.7}
          />
        )
      ))}
    </>
  );
};

// Background music component
export const BackgroundMusic: React.FC<{ startFrame: number; volume?: number }> = ({ 
  startFrame, 
  volume = 0.3 
}) => {
  const frame = useCurrentFrame();
  
  if (frame >= startFrame) {
    return (
      <Audio
        src={AUDIO_FILES.background}
        startFrom={0}
        volume={volume}
        loop
      />
    );
  }
  
  return null;
};

// Predefined audio sequences for common scenarios
export const audioSequences = {
  // Typing sequence
  typingSequence: (startFrame: number, textLength: number) => {
    const sounds = [];
    for (let i = 0; i < textLength; i++) {
      sounds.push({
        frame: startFrame + i * 2,
        file: 'typing' as keyof typeof AUDIO_FILES,
        volume: 0.4,
      });
    }
    return sounds;
  },

  // UI interaction sequence
  uiInteraction: (startFrame: number) => [
    { frame: startFrame, file: 'click', volume: 0.6 },
    { frame: startFrame + 5, file: 'whoosh', volume: 0.5 },
  ],

  // Success sequence
  successSequence: (startFrame: number) => [
    { frame: startFrame, file: 'success', volume: 0.8 },
    { frame: startFrame + 10, file: 'notification', volume: 0.6 },
  ],

  // Spotify integration
  spotifySequence: (startFrame: number) => [
    { frame: startFrame, file: 'spotify', volume: 0.7 },
    { frame: startFrame + 15, file: 'success', volume: 0.5 },
  ],
};

// Utility to create audio files (for development)
export const generateAudioFiles = () => {
  // This would generate placeholder audio files
  // In a real implementation, you'd use actual audio files
  console.log('Audio files should be placed in public/studio/audio/');
  console.log('Required files:', Object.values(AUDIO_FILES));
};

// Audio presets for different video sections
export const audioPresets = {
  hook: (startFrame: number) => [
    { frame: startFrame, file: 'whoosh', volume: 0.8 },
  ],
  
  typing: (startFrame: number, prompt: string) => 
    audioSequences.typingSequence(startFrame, prompt.length),
  
  generating: (startFrame: number) => [
    { frame: startFrame, file: 'notification', volume: 0.6 },
  ],
  
  playlistReady: (startFrame: number) => 
    audioSequences.successSequence(startFrame),
  
  spotifyAdd: (startFrame: number) => 
    audioSequences.spotifySequence(startFrame),
  
  transition: (startFrame: number) => [
    { frame: startFrame, file: 'whoosh', volume: 0.5 },
  ],
};
