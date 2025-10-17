const fs = require('fs');

// Función para crear un archivo WAV simple
function createSimpleWav(frequency, duration, filename) {
  const sampleRate = 44100;
  const samples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + samples * 2);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  
  // Generate sine wave
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * time);
    
    // Apply envelope (fade in/out)
    const envelope = Math.min(1, time * 20) * Math.min(1, (duration - time) * 20);
    const finalSample = sample * envelope * 0.3;
    
    buffer.writeInt16LE(Math.floor(finalSample * 0x7FFF), 44 + i * 2);
  }
  
  fs.writeFileSync(filename, buffer);
  console.log(`Created ${filename}`);
}

// Crear archivos de audio simples
console.log('Creating simple audio files...');

// Whoosh sound (low frequency sweep)
createSimpleWav(100, 0.5, 'public/audio/whoosh.wav');

// Keyboard clicks (high frequency clicks)
createSimpleWav(800, 2, 'public/audio/keyboard-clicks.wav');

// Swoosh sound (medium frequency)
createSimpleWav(300, 0.7, 'public/audio/swoosh.wav');

// Button click (short click)
createSimpleWav(1000, 0.2, 'public/audio/button-click.wav');

// Success sound (ascending tones)
createSimpleWav(660, 1, 'public/audio/success.wav');

// Song previews (different frequencies for different songs)
createSimpleWav(440, 1.7, 'public/audio/song-preview-1.wav'); // A4
createSimpleWav(523, 1.7, 'public/audio/song-preview-2.wav'); // C5
createSimpleWav(659, 1.7, 'public/audio/song-preview-3.wav'); // E5

console.log('All audio files created successfully!');
