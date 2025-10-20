/**
 * Video30s - Video promocional de 30 segundos
 * Versión extendida con más contenido y transiciones
 */

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { tokens } from './design/tokens';
import { timings } from './design/timings';
import { SlideIn, FadeIn, ScaleIn, Push, WipeDiagonal } from './comps/transitions';
import { PromptBox, SongCard, PlaylistsGrid, Button } from './comps/ui';
import { StarPleia, StarPleiaParticles } from './3d/StarPleia';
import { LottieSparkles, SuccessAnimation } from './lottie';
import { useSFX } from './audio';

// Configuración del video
const VIDEO_DURATION = 30; // segundos
const FPS = 30;

// Secuencias de tiempo
const SEQUENCES = {
  hook: { start: 0, duration: 3 },
  problem: { start: 3, duration: 4 },
  solution: { start: 7, duration: 3 },
  prompt: { start: 10, duration: 4 },
  results: { start: 14, duration: 8 },
  features: { start: 22, duration: 4 },
  cta: { start: 26, duration: 4 },
};

export const Video30s: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // SFX
  const keyboardSFX = useSFX('keyboard-click', 0.4, 11);
  const buttonSFX = useSFX('button-click', 0.5, 14);
  const successSFX = useSFX('success', 0.7, 26);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: tokens.colors.bg.primary,
        fontFamily: tokens.typography.fontFamily.primary,
      }}
    >
      {/* Hook - Texto grande */}
      <Sequence from={SEQUENCES.hook.start * fps} durationInFrames={SEQUENCES.hook.duration * fps}>
        <SlideIn delay={0} duration={timings.durations.slower} direction="up" intensity="dramatic">
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
                fontSize: tokens.typography.fontSize['7xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
                textAlign: 'center',
                marginBottom: tokens.spacing[6],
                lineHeight: tokens.typography.lineHeight.tight,
              }}
            >
              ¿Cansado de crear
              <br />
              <span style={{ color: tokens.colors.pleia.green }}>playlists aburridas?</span>
            </h1>
            
            <p
              style={{
                fontSize: tokens.typography.fontSize['2xl'],
                color: tokens.colors.text.secondary,
                textAlign: 'center',
                maxWidth: 500,
                lineHeight: tokens.typography.lineHeight.normal,
              }}
            >
              La IA puede hacerlo mejor que tú
            </p>
          </AbsoluteFill>
        </SlideIn>
      </Sequence>
      
      {/* Problem - Transición Push */}
      <Sequence from={SEQUENCES.problem.start * fps} durationInFrames={SEQUENCES.problem.duration * fps}>
        <Push delay={0} duration={timings.durations.slower} direction="left">
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: tokens.spacing[8],
              backgroundColor: tokens.colors.bg.secondary,
            }}
          >
            <h2
              style={{
                fontSize: tokens.typography.fontSize['4xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
                textAlign: 'center',
                marginBottom: tokens.spacing[6],
              }}
            >
              El problema
            </h2>
            
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
                maxWidth: 600,
              }}
            >
              {[
                "⏰ Pierdes horas eligiendo canciones",
                "😴 Las playlists se vuelven repetitivas", 
                "🤔 No sabes qué música poner",
                "😤 Terminas con listas aburridas"
              ].map((text, index) => (
                <SlideIn
                  key={index}
                  delay={index * 0.2}
                  duration={timings.durations.medium}
                  direction="left"
                >
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xl,
                      color: tokens.colors.text.secondary,
                      padding: tokens.spacing[3],
                      backgroundColor: tokens.colors.card.background,
                      borderRadius: tokens.radius.md,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                    }}
                  >
                    {text}
                  </div>
                </SlideIn>
              ))}
            </div>
          </AbsoluteFill>
        </Push>
      </Sequence>
      
      {/* Solution - WipeDiagonal */}
      <Sequence from={SEQUENCES.solution.start * fps} durationInFrames={SEQUENCES.solution.duration * fps}>
        <WipeDiagonal delay={0} duration={timings.durations.slower} direction="right">
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: tokens.spacing[8],
            }}
          >
            <StarPleia
              width={200}
              height={200}
              size={1.5}
              count={3}
              style={{ marginBottom: tokens.spacing[6] }}
            />
            
            <h2
              style={{
                fontSize: tokens.typography.fontSize['4xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.pleia.green,
                textAlign: 'center',
                marginBottom: tokens.spacing[4],
              }}
            >
              La solución
            </h2>
            
            <p
              style={{
                fontSize: tokens.typography.fontSize.xl,
                color: tokens.colors.text.secondary,
                textAlign: 'center',
                maxWidth: 500,
              }}
            >
              IA que entiende tu música y crea playlists perfectas en segundos
            </p>
          </AbsoluteFill>
        </WipeDiagonal>
      </Sequence>
      
      {/* PromptBox - Tecleo */}
      <Sequence from={SEQUENCES.prompt.start * fps} durationInFrames={SEQUENCES.prompt.duration * fps}>
        <SlideIn delay={0.5} duration={timings.durations.medium} direction="up">
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: tokens.spacing[8],
            }}
          >
            <h3
              style={{
                fontSize: tokens.typography.fontSize['3xl'],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing[6],
                textAlign: 'center',
              }}
            >
              Solo escribe lo que quieres escuchar
            </h3>
            
            <PromptBox
              placeholder="Música para estudiar con enfoque..."
              value={frame > (SEQUENCES.prompt.start + 1.5) * fps ? "Música para estudiar con enfoque..." : ""}
              isTyping={frame > (SEQUENCES.prompt.start + 1) * fps && frame < (SEQUENCES.prompt.start + 2.5) * fps}
              width={450}
              height={64}
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
                fontSize: tokens.typography.fontSize['3xl'],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing[6],
                textAlign: 'center',
              }}
            >
              Tu playlist perfecta está lista
            </h2>
          </SlideIn>
          
          {/* Canciones en cascada */}
          {[
            { title: "Weightless", artist: "Marconi Union", duration: "8:59" },
            { title: "Deep Focus", artist: "Brain.fm", duration: "5:23" },
            { title: "Alpha Waves", artist: "Binaural Beats", duration: "10:00" },
            { title: "Concentration", artist: "Focus Music", duration: "6:45" },
            { title: "Study Mode", artist: "Ambient Sounds", duration: "7:30" },
          ].map((song, index) => (
            <SlideIn
              key={index}
              delay={index * 0.25}
              duration={timings.durations.medium}
              direction="left"
            >
              <SongCard
                title={song.title}
                artist={song.artist}
                duration={song.duration}
                isPlaying={index === 0}
                width={400}
                height={80}
              />
            </SlideIn>
          ))}
        </AbsoluteFill>
      </Sequence>
      
      {/* Features - PlaylistsGrid */}
      <Sequence from={SEQUENCES.features.start * fps} durationInFrames={SEQUENCES.features.duration * fps}>
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
            <h2
              style={{
                fontSize: tokens.typography.fontSize['3xl'],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing[6],
                textAlign: 'center',
              }}
            >
              Miles de playlists esperándote
            </h2>
            
            <PlaylistsGrid
              playlists={[
                { name: "Fiesta", songCount: 24, color: tokens.colors.pleia.green },
                { name: "Relax", songCount: 18, color: tokens.colors.pleia.blue },
                { name: "Workout", songCount: 32, color: "#FF6B6B" },
                { name: "Study", songCount: 15, color: "#FFB347" },
              ]}
              columns={2}
              width={500}
            />
          </AbsoluteFill>
        </ScaleIn>
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
            {/* Logo 3D con partículas */}
            <StarPleiaParticles
              width={150}
              height={150}
              particleCount={15}
              style={{ marginBottom: tokens.spacing[6] }}
            />
            
            {/* URL */}
            <div
              style={{
                fontSize: tokens.typography.fontSize['4xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.pleia.green,
                marginBottom: tokens.spacing[6],
                textAlign: 'center',
              }}
            >
              playlists.jeylabbb.com
            </div>
            
            {/* Botón CTA */}
            <Button
              variant="primary"
              size="lg"
              width={250}
              height={64}
            >
              ¡Crea tu playlist ahora!
            </Button>
            
            {/* Success animation */}
            <SuccessAnimation
              width={300}
              height={300}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.2,
                zIndex: -1,
              }}
            />
          </AbsoluteFill>
        </ScaleIn>
      </Sequence>
    </AbsoluteFill>
  );
};

