// Audio Configuration for Remotion Videos
// Flexible system to handle different audio file formats and paths

export interface AudioFile {
  name: string;
  path: string;
  format: 'wav' | 'mp3' | 'm4a';
  size: 'small' | 'large';
  description: string;
  available: boolean;
}

// Available audio files with their properties
export const AUDIO_FILES: Record<string, AudioFile> = {
  // Small SFX files (ready to use)
  whoosh: {
    name: 'whoosh',
    path: '/studio/audio/whoosh.wav',
    format: 'wav',
    size: 'small',
    description: 'Transition whoosh sound',
    available: true
  },
  'keyboard-clicks': {
    name: 'keyboard-clicks',
    path: '/studio/audio/keyboard clicks.wav',
    format: 'wav',
    size: 'small',
    description: 'Keyboard typing sounds',
    available: true
  },
  'button-click': {
    name: 'button-click',
    path: '/studio/audio/button click.wav',
    format: 'wav',
    size: 'small',
    description: 'Button click sound',
    available: true
  },
  success: {
    name: 'success',
    path: '/studio/audio/success.wav',
    format: 'wav',
    size: 'small',
    description: 'Success notification sound',
    available: true
  },
  swoosh: {
    name: 'swoosh',
    path: '/studio/audio/swoosh.mp3',
    format: 'mp3',
    size: 'small',
    description: 'Swoosh transition sound',
    available: true
  },

  // Large song files (to be added later by user)
  'song-1': {
    name: 'song-1',
    path: '/studio/audio/Do You Remember-Xiyo Fernandezz Eix.m4a',
    format: 'm4a',
    size: 'large',
    description: 'Do You Remember - Xiyo & Fernandez (3s preview)',
    available: false // Large file, user will add
  },
  'song-2': {
    name: 'song-2',
    path: '/studio/audio/Pa Q Me Escribes-Vreno Yg.m4a',
    format: 'm4a',
    size: 'large',
    description: 'Pa q me escribes - Vreno Yg (3s preview)',
    available: false // Large file, user will add
  },
  'song-3': {
    name: 'song-3',
    path: '/studio/audio/Suena Cool-Mvrk Lhaine.m4a',
    format: 'm4a',
    size: 'large',
    description: 'Suena COOL - mvrk & l\'haine (3s preview)',
    available: false // Large file, user will add
  }
};

// Alternative paths to check (fallback system)
export const ALTERNATIVE_PATHS = {
  '/studio/audio/': [
    '/audio/',
    '/public/studio/audio/',
    '/public/audio/'
  ]
};

// Get audio file with fallback paths
export const getAudioPath = (audioKey: string): string | null => {
  const audioFile = AUDIO_FILES[audioKey];
  if (!audioFile) {
    console.warn(`Audio file '${audioKey}' not found in configuration`);
    return null;
  }

  if (!audioFile.available) {
    console.info(`Audio file '${audioKey}' is marked as not available (large file to be added by user)`);
    return null;
  }

  // Return the primary path
  return audioFile.path;
};

// Get available small audio files
export const getAvailableSFX = (): AudioFile[] => {
  return Object.values(AUDIO_FILES).filter(file => 
    file.size === 'small' && file.available
  );
};

// Get large audio files that need to be added
export const getLargeFilesToAdd = (): AudioFile[] => {
  return Object.values(AUDIO_FILES).filter(file => 
    file.size === 'large' && !file.available
  );
};

// Check if audio file exists (for runtime validation)
export const isAudioAvailable = (audioKey: string): boolean => {
  const audioFile = AUDIO_FILES[audioKey];
  return audioFile ? audioFile.available : false;
};

// Audio file recommendations for user
export const AUDIO_RECOMMENDATIONS = {
  smallFiles: {
    description: "These small SFX files are ready to use:",
    files: [
      "whoosh.wav - Transition sound",
      "keyboard clicks.wav - Typing sounds", 
      "button click.wav - UI click sound",
      "success.wav - Success notification",
      "swoosh.mp3 - Alternative transition"
    ]
  },
  largeFiles: {
    description: "These large song files need to be added by you:",
    files: [
      "Do You Remember-Xiyo Fernandezz Eix.m4a → Convert to 3s MP3 preview",
      "Pa Q Me Escribes-Vreno Yg.m4a → Convert to 3s MP3 preview", 
      "Suena Cool-Mvrk Lhaine.m4a → Convert to 3s MP3 preview"
    ],
    instructions: [
      "1. Convert M4A files to MP3 format",
      "2. Trim each song to 3-second previews", 
      "3. Place in /public/studio/audio/",
      "4. Update audioConfig.ts to mark as available: true"
    ]
  }
};
