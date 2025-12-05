/**
 * Video15s - Video promocional de 15 segundos
 * Refactorizado con nuevas transiciones y tokens
 */

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { tokens } from './design/tokens';
import { timings } from './design/timings';
import { SlideIn, FadeIn, ScaleIn } from './comps/transitions';
import { PromptBox, SongCard, Button } from './comps/ui';
import { StarPleiaMinimal } from './3d/StarPleia';
import { LottieSparkles } from './lottie';
import { useSFX } from './audio';

// Configuración del video
const VIDEO_DURATION = 15; // segundos
const FPS = 30;

// Secuencias de tiempo
const SEQUENCES = {
  hook: { start: 0, duration: 2 },
  prompt: { start: 2, duration: 3 },
  results: { start: 5, duration: 6 },
  cta: { start: 11, duration: 4 },
};

export const Video15s: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // SFX
  const keyboardSFX = useSFX('keyboard-click', 0.4, 2.5);
  const buttonSFX = useSFX('button-click', 0.5, 5);
  const successSFX = useSFX('success', 0.7, 11);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: tokens.colors.bg.primary,
        fontFamily: tokens.typography.fontFamily.primary,
      }}
    >
      {/* Hook - Texto grande */}
      <Sequence from={SEQUENCES.hook.start * fps} durationInFrames={SEQUENCES.hook.duration * fps}>
        <SlideIn delay={0} duration={timings.durations.medium} direction="up" intensity="dramatic">
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: tokens.spacing[8],
            }}
          >
            <h1
              style={{
                fontSize: tokens.typography.fontSize['6xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
                textAlign: 'center',
                marginBottom: tokens.spacing[4],
                lineHeight: tokens.typography.lineHeight.tight,
              }}
            >
              Crea Playlists
              <br />
              <span style={{ color: tokens.colors.pleia.green }}>Perfectas</span>
            </h1>
            
            <p
              style={{
                fontSize: tokens.typography.fontSize.xl,
                color: tokens.colors.text.secondary,
                textAlign: 'center',
                maxWidth: 400,
                lineHeight: tokens.typography.lineHeight.normal,
              }}
            >
              Con IA en segundos
            </p>
          </AbsoluteFill>
        </SlideIn>
      </Sequence>
      
      {/* PromptBox - Tecleo */}
      <Sequence from={SEQUENCES.prompt.start * fps} durationInFrames={SEQUENCES.prompt.duration * fps}>
        <SlideIn delay={0.5} duration={timings.durations.medium} direction="up">
          <AbsoluteFill
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: tokens.spacing[8],
            }}
          >
            <PromptBox
              placeholder="Música para una fiesta..."
              value={frame > (SEQUENCES.prompt.start + 1) * fps ? "Música para una fiesta..." : ""}
              isTyping={frame > (SEQUENCES.prompt.start + 0.5) * fps && frame < (SEQUENCES.prompt.start + 2) * fps}
              width={400}
              height={56}
            />
          </AbsoluteFill>
        </SlideIn>
      </Sequence>
      
      {/* Resultados - SongCard en cascada */}
      <Sequence from={SEQUENCES.results.start * fps} durationInFrames={SEQUENCES.results.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.spacing[8],
            gap: tokens.spacing[4],
          }}
        >
          {/* Título de resultados */}
          <SlideIn delay={0} duration={timings.durations.fast} direction="up">
            <h2
              style={{
                fontSize: tokens.typography.fontSize['2xl'],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing[6],
              }}
            >
              Tu playlist perfecta
            </h2>
          </SlideIn>
          
          {/* Canciones en cascada */}
          {[
            { title: "Dancing Queen", artist: "ABBA", duration: "3:51" },
            { title: "Uptown Funk", artist: "Bruno Mars", duration: "4:30" },
            { title: "Happy", artist: "Pharrell Williams", duration: "3:53" },
          ].map((song, index) => (
            <SlideIn
              key={index}
              delay={index * 0.3}
              duration={timings.durations.medium}
              direction="left"
            >
              <SongCard
                title={song.title}
                artist={song.artist}
                duration={song.duration}
                isPlaying={index === 0}
                width={360}
                height={72}
              />
            </SlideIn>
          ))}
        </AbsoluteFill>
      </Sequence>
      
      {/* CTA - Logo + URL */}
      <Sequence from={SEQUENCES.cta.start * fps} durationInFrames={SEQUENCES.cta.duration * fps}>
        <ScaleIn delay={0} duration={timings.durations.slower} intensity="dramatic">
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: tokens.spacing[8],
            }}
          >
            {/* Logo 3D */}
            <StarPleiaMinimal
              width={120}
              height={120}
              style={{ marginBottom: tokens.spacing[6] }}
            />
            
            {/* URL */}
            <div
              style={{
                fontSize: tokens.typography.fontSize['3xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.pleia.green,
                marginBottom: tokens.spacing[4],
                textAlign: 'center',
              }}
            >
              playlists.jeylabbb.com
            </div>
            
            {/* Botón CTA */}
            <Button
              variant="primary"
              size="lg"
              width={200}
              height={56}
            >
              ¡Pruébalo Ahora!
            </Button>
            
            {/* Sparkles overlay */}
            <LottieSparkles
              width={400}
              height={400}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.3,
                zIndex: -1,
              }}
            />
          </AbsoluteFill>
        </ScaleIn>
      </Sequence>
    </AbsoluteFill>
  );
};

