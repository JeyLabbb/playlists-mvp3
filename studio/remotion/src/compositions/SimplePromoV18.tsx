// SimplePromoV18 - Versión con sistema de audio flexible
// Este es un ejemplo de cómo usar el nuevo sistema de audio

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio, Easing } from 'remotion';
import { useFlexibleAudio, useAudioSequence } from '../utils/useFlexibleAudio';
import { getAvailableSFX, getLargeFilesToAdd, AUDIO_RECOMMENDATIONS } from '../utils/audioConfig';

interface SimplePromoV18Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV18: React.FC<SimplePromoV18Props> = ({
  headline,
  prompt: initialPrompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Configuración de escenas
  const scenes = {
    hook: { start: 0, duration: 60 },           // 0:00-0:02
    prompt: { start: 60, duration: 120 },       // 0:02-0:06
    generation: { start: 180, duration: 180 },  // 0:06-0:12
    playlist: { start: 360, duration: 120 },    // 0:12-0:16
    final: { start: 480, duration: 120 },       // 0:16-0:20
    cta: { start: 600, duration: 120 },         // 0:20-0:24
  };

  // Configuración de audio usando el nuevo sistema
  const audioConfigs = [
    {
      audioKey: 'whoosh',
      startFrame: scenes.hook.start,
      endFrame: scenes.hook.start + 15,
      volume: 0.6
    },
    {
      audioKey: 'keyboard-clicks',
      startFrame: scenes.prompt.start + 30,
      endFrame: scenes.prompt.start + 90,
      volume: 0.4
    },
    {
      audioKey: 'swoosh',
      startFrame: scenes.generation.start,
      endFrame: scenes.generation.start + 20,
      volume: 0.5
    },
    {
      audioKey: 'button-click',
      startFrame: scenes.playlist.start + 30,
      endFrame: scenes.playlist.start + 35,
      volume: 0.7
    },
    {
      audioKey: 'success',
      startFrame: scenes.final.start + 75,
      endFrame: scenes.final.start + 105,
      volume: 0.6
    }
  ];

  // Obtener secuencia de audio
  const audioSequence = useAudioSequence(audioConfigs);

  // Información de archivos disponibles (para debugging)
  const availableSFX = getAvailableSFX();
  const largeFilesToAdd = getLargeFilesToAdd();

  // Colores y estilos
  const colors = {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    blackBase: '#1D1D1F',
    grayText: '#86868B',
    accentBlue: '#007AFF',
    spotifyGreen: '#1DB954',
    accentCyan: '#22D3EE',
    lightGray: '#E5E5EA',
  };

  const fontSans = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, fontFamily: fontSans, overflow: 'hidden' }}>
      
      {/* Scene 1: Hook */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: colors.blackBase,
              textAlign: 'center',
              margin: '0 30px',
              opacity: interpolate(frame - scenes.hook.start, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
              transform: `translateY(${interpolate(frame - scenes.hook.start, [0, 30], [20, 0], { extrapolateRight: 'clamp' })}px)`,
            }}
          >
            ¡Escribe tu prompt y generamos tu playlist perfecta!
          </h1>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Prompt */}
      <Sequence from={scenes.prompt.start} durationInFrames={scenes.prompt.duration}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              width: '80%',
              maxWidth: '800px',
              height: '120px',
              backgroundColor: colors.surface,
              borderRadius: '24px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 30px',
              opacity: interpolate(frame - scenes.prompt.start, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <input
              type="text"
              value="Underground español para activarme"
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '32px',
                fontFamily: fontSans,
                color: colors.blackBase,
                backgroundColor: 'transparent',
              }}
              readOnly
            />
            <button
              style={{
                backgroundColor: colors.accentBlue,
                color: colors.surface,
                border: 'none',
                borderRadius: '16px',
                padding: '15px 25px',
                fontSize: '24px',
                fontWeight: '600',
                marginLeft: '20px',
              }}
            >
              Buscar
            </button>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Generation */}
      <Sequence from={scenes.generation.start} durationInFrames={scenes.generation.duration}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              width: '90%',
              maxWidth: '900px',
              backgroundColor: colors.surface,
              borderRadius: '24px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              padding: '40px',
              textAlign: 'center',
              opacity: interpolate(frame - scenes.generation.start, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <h3
              style={{
                fontSize: '28px',
                fontWeight: '600',
                color: colors.blackBase,
                marginBottom: '30px',
              }}
            >
              🎵 Resultados generados
            </h3>
            
            {/* Lista de canciones */}
            {[
              { title: 'Do you remember', artist: 'Xiyo & Fernandez' },
              { title: 'Pa q me escribes', artist: 'Vreno Yg' },
              { title: 'Suena COOL', artist: 'mvrk & l\'haine' },
              { title: 'El precio del amor', artist: 'Guxo' },
              { title: 'Nuevos Deals', artist: 'West SRK' },
            ].map((track, index) => (
              <div
                key={index}
                style={{
                  padding: '15px 0',
                  borderBottom: index < 4 ? `1px solid ${colors.lightGray}` : 'none',
                  fontSize: '20px',
                  color: colors.blackBase,
                }}
              >
                {track.title} - {track.artist}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Playlist */}
      <Sequence from={scenes.playlist.start} durationInFrames={scenes.playlist.duration}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              width: '90%',
              maxWidth: '900px',
              backgroundColor: colors.surface,
              borderRadius: '24px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              padding: '40px',
              textAlign: 'center',
              opacity: interpolate(frame - scenes.playlist.start, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <h3
              style={{
                fontSize: '28px',
                fontWeight: '600',
                color: colors.blackBase,
                marginBottom: '30px',
              }}
            >
              Selecciona las canciones para tu playlist
            </h3>
            
            <button
              style={{
                width: '80%',
                maxWidth: '450px',
                backgroundColor: colors.spotifyGreen,
                color: colors.surface,
                border: 'none',
                borderRadius: '18px',
                padding: '22px 35px',
                fontSize: '24px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                margin: '0 auto',
              }}
            >
              Añadir a Spotify
            </button>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Final */}
      <Sequence from={scenes.final.start} durationInFrames={scenes.final.duration}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              width: '95%',
              maxWidth: '950px',
              backgroundColor: colors.surface,
              borderRadius: '28px',
              boxShadow: '0 16px 50px rgba(0,0,0,0.2)',
              padding: '40px',
              textAlign: 'center',
              opacity: interpolate(frame - scenes.final.start, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <h3
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.blackBase,
                margin: '0 0 35px 0',
              }}
            >
              ¡Tu playlist está lista!
            </h3>
            
            <div
              style={{
                fontSize: '20px',
                color: colors.blackBase,
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '15px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: colors.spotifyGreen,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                ♫
              </div>
              Abriendo en Spotify...
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: CTA */}
      <Sequence from={scenes.cta.start} durationInFrames={scenes.cta.duration}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <h2
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: colors.accentBlue,
              margin: 0,
              textAlign: 'center',
              padding: '0 30px',
            }}
          >
            ¿Listo para tu playlist? Pruébalo ya 👇
          </h2>
          <a
            href="https://playlists.jeylabbb.com"
            style={{
              fontSize: '36px',
              color: colors.accentBlue,
              marginTop: '30px',
              textDecoration: 'none',
              fontWeight: '600',
              padding: '10px 20px',
              borderRadius: '15px',
              backgroundColor: `${colors.accentBlue}1A`,
            }}
          >
            playlists.jeylabbb.com
          </a>
        </AbsoluteFill>
      </Sequence>

      {/* Audio System - Flexible Audio */}
      {audioSequence.map((audio, index) => (
        audio && audio.src && (
          <Audio
            key={`${audio.key}-${index}`}
            src={audio.src}
            startFrom={audio.startFrom}
            volume={audio.volume}
          />
        )
      ))}

      {/* Debug Info (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            maxWidth: '300px',
          }}
        >
          <div>Available SFX: {availableSFX.length}</div>
          <div>Large files to add: {largeFilesToAdd.length}</div>
          <div>Current frame: {frame}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
