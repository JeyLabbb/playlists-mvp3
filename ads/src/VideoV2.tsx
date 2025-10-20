/**
 * VideoV2 - Segundo video principal de PLEIA
 * Continuación directa del V18, más cinematográfico y fluido
 * Estética Apple-Spotify con loop perfecto
 */

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { tokens, timings } from './design';
import { SlideIn, FadeIn, ScaleIn, WipeDiagonal, MatchCut } from './comps/transitions';
import { PromptBox, SongCard, PlaylistsGrid, Button } from './comps/ui';
import { StarPleia, StarPleiaParticles } from './3d/StarPleia';
import { LottieSparkles, SuccessAnimation } from './lottie';
import { useSFX } from './audio';
import SpotifyLogo from './components/SpotifyLogo';
import AppleLoadingBar from './components/AppleLoadingBar';
import AnimatedUnderline from './components/AnimatedUnderline';

// Configuración del video
const VIDEO_DURATION = 25; // segundos
const FPS = 30;

// Secuencias de tiempo (en segundos)
const SEQUENCES = {
  // Sección 0: Configuración base
  fadeIn: { start: 0, duration: 0.3 },
  promptUI: { start: 0.3, duration: 1.2 },
  buttonClick: { start: 1.5, duration: 1.0 },
  
  // Sección 1: Resultados
  results: { start: 2.5, duration: 3.0 },
  spotifyTransition: { start: 5.5, duration: 1.3 },
  
  // Sección 2: Estrella + Logo + Frases
  starMovement: { start: 6.8, duration: 1.2 },
  logoReveal: { start: 8.0, duration: 0.8 },
  phrases: { start: 8.8, duration: 1.2 },
  fadeOutText: { start: 10.0, duration: 0.5 },
  
  // Sección 3: Consejos / Prompts ejemplo
  tipsZoom: { start: 10.5, duration: 0.5 },
  tipsCards: { start: 11.0, duration: 1.0 },
  exampleExpansion: { start: 12.0, duration: 3.0 },
  
  // Sección 4: Mis playlists + CTA
  playlistsView: { start: 15.0, duration: 2.0 },
  playlistHover: { start: 17.0, duration: 1.0 },
  navigationBar: { start: 18.0, duration: 1.0 },
  linkClick: { start: 19.0, duration: 0.3 },
  loadingBar: { start: 19.3, duration: 0.7 },
  transitionOut: { start: 20.0, duration: 0.8 },
};

export const VideoV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // SFX
  const buttonSFX = useSFX('button-click', 0.5, 1.5);
  const whooshSFX = useSFX('whoosh', 0.6, 2.5);
  const swooshSFX = useSFX('swoosh', 0.4, 2.7);
  const successSFX = useSFX('success', 0.3, 4.0);
  const clickSFX = useSFX('button-click', 0.5, 19.0);
  
  // Animaciones personalizadas
  const fadeInProgress = interpolate(
    frame,
    [SEQUENCES.fadeIn.start * fps, (SEQUENCES.fadeIn.start + SEQUENCES.fadeIn.duration) * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const blurProgress = interpolate(
    frame,
    [0, SEQUENCES.fadeIn.duration * fps],
    [20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: tokens.colors.bg.primary,
        fontFamily: tokens.typography.fontFamily.primary,
        filter: `blur(${blurProgress}px)`,
      }}
    >
      {/* Fondo con gradiente sutil */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${tokens.colors.bg.primary} 0%, ${tokens.colors.bg.secondary} 100%)`,
          opacity: fadeInProgress,
        }}
      />
      
      {/* Brillo radial verde-azulado */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(54, 226, 180, 0.1) 0%, transparent 70%)`,
          opacity: fadeInProgress * 0.5,
        }}
      />
      
      {/* SECCIÓN 0: PromptBox UI */}
      <Sequence from={SEQUENCES.promptUI.start * fps} durationInFrames={SEQUENCES.promptUI.duration * fps}>
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
            <PromptBox
              placeholder="reggaeton para salir de fiesta"
              value="reggaeton para salir de fiesta"
              isTyping={false}
              width={450}
              height={64}
              style={{
                fontSize: tokens.typography.fontSize.xl,
                marginBottom: tokens.spacing[6],
              }}
            />
            
            <Button
              variant="primary"
              size="lg"
              width={200}
              height={56}
              style={{
                marginTop: tokens.spacing[4],
              }}
            >
              Crear playlist
            </Button>
          </AbsoluteFill>
        </SlideIn>
      </Sequence>
      
      {/* SECCIÓN 1: Resultados - SongCards en cascada */}
      <Sequence from={SEQUENCES.results.start * fps} durationInFrames={SEQUENCES.results.duration * fps}>
        <WipeDiagonal delay={0} duration={timings.durations.medium} direction="right">
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
            {[
              { title: "Canción 1", artist: "Artista 1", duration: "3:24" },
              { title: "Canción 2", artist: "Artista 2", duration: "2:58" },
              { title: "Canción 3", artist: "Artista 3", duration: "4:12" },
              { title: "Canción 4", artist: "Artista 4", duration: "3:45" },
              { title: "Canción 5", artist: "Artista 5", duration: "3:33" },
            ].map((song, index) => (
              <SlideIn
                key={index}
                delay={index * 0.15}
                duration={timings.durations.fast}
                direction="left"
              >
                <SongCard
                  title={song.title}
                  artist={song.artist}
                  duration={song.duration}
                  isPlaying={index === 0}
                  width={400}
                  height={80}
                  style={{
                    transform: `scale(${interpolate(
                      frame,
                      [(SEQUENCES.results.start + 2 + index * 0.5) * fps, (SEQUENCES.results.start + 3 + index * 0.5) * fps],
                      [1, 1.05],
                      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    )})`,
                    boxShadow: frame > (SEQUENCES.results.start + 2 + index * 0.5) * fps ? 
                      `0 0 20px rgba(54, 226, 180, 0.2)` : tokens.shadows.sm,
                  }}
                />
              </SlideIn>
            ))}
          </AbsoluteFill>
        </WipeDiagonal>
      </Sequence>
      
      {/* Transición a Spotify */}
      <Sequence from={SEQUENCES.spotifyTransition.start * fps} durationInFrames={SEQUENCES.spotifyTransition.duration * fps}>
        <ScaleIn delay={0} duration={timings.durations.slower} intensity="dramatic">
          <SpotifyLogo
            size={200}
            animated={true}
          />
        </ScaleIn>
      </Sequence>
      
      {/* SECCIÓN 2: Estrella + Logo + Frases */}
      <Sequence from={SEQUENCES.starMovement.start * fps} durationInFrames={SEQUENCES.starMovement.duration * fps}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Estrella PLEIA con movimiento */}
          <StarPleiaParticles
            width={300}
            height={300}
            particleCount={20}
            style={{
              position: 'absolute',
              left: interpolate(
                frame,
                [SEQUENCES.starMovement.start * fps, (SEQUENCES.starMovement.start + SEQUENCES.starMovement.duration) * fps],
                [-200, 1200],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              filter: `blur(${interpolate(
                frame,
                [SEQUENCES.starMovement.start * fps, (SEQUENCES.starMovement.start + SEQUENCES.starMovement.duration) * fps],
                [0, 20],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )}px)`,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      
      {/* Logo PLEIA */}
      <Sequence from={SEQUENCES.logoReveal.start * fps} durationInFrames={SEQUENCES.logoReveal.duration * fps}>
        <SlideIn delay={0} duration={timings.durations.medium} direction="up">
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
                marginBottom: tokens.spacing[4],
                lineHeight: tokens.typography.lineHeight.tight,
              }}
            >
              PLEIA
            </h1>
            
            {/* Estrellita debajo de la A */}
            <StarPleiaMinimal
              width={40}
              height={40}
              style={{
                marginTop: -tokens.spacing[2],
              }}
            />
          </AbsoluteFill>
        </SlideIn>
      </Sequence>
      
      {/* Frases */}
      <Sequence from={SEQUENCES.phrases.start * fps} durationInFrames={SEQUENCES.phrases.duration * fps}>
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
          <SlideIn delay={0} duration={timings.durations.fast} direction="up">
            <p
              style={{
                fontSize: tokens.typography.fontSize.xl,
                color: tokens.colors.text.secondary,
                textAlign: 'center',
                maxWidth: 500,
                lineHeight: tokens.typography.lineHeight.normal,
              }}
            >
              La primera IA generadora de playlists en tiempo real.
            </p>
          </SlideIn>
          
          <SlideIn delay={0.25} duration={timings.durations.fast} direction="up">
            <p
              style={{
                fontSize: tokens.typography.fontSize.lg,
                color: tokens.colors.text.tertiary,
                textAlign: 'center',
                maxWidth: 500,
                lineHeight: tokens.typography.lineHeight.normal,
              }}
            >
              Canciones nuevas. Estilo propio. Actualización automática.
            </p>
          </SlideIn>
        </AbsoluteFill>
      </Sequence>
      
      {/* SECCIÓN 3: Consejos / Prompts ejemplo */}
      <Sequence from={SEQUENCES.tipsZoom.start * fps} durationInFrames={SEQUENCES.tipsZoom.duration * fps}>
        <ScaleIn delay={0} duration={timings.durations.medium} intensity="normal">
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
              Consejos para pedir tu playlist
            </h2>
            
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: tokens.spacing[4],
                maxWidth: 600,
              }}
            >
              {[
                "Usa tu mood del momento.",
                "Añade un artista o género.",
                "Incluye el plan o lugar.",
                "O pide algo como esto:",
              ].map((tip, index) => (
                <SlideIn
                  key={index}
                  delay={index * 0.1}
                  duration={timings.durations.fast}
                  direction="up"
                >
                  <div
                    style={{
                      padding: tokens.spacing[4],
                      backgroundColor: tokens.colors.card.background,
                      borderRadius: tokens.radius.md,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                      fontSize: tokens.typography.fontSize.base,
                      color: tokens.colors.text.secondary,
                      textAlign: 'center',
                    }}
                  >
                    {tip}
                  </div>
                </SlideIn>
              ))}
            </div>
          </AbsoluteFill>
        </ScaleIn>
      </Sequence>
      
      {/* Ejemplo expandido */}
      <Sequence from={SEQUENCES.exampleExpansion.start * fps} durationInFrames={SEQUENCES.exampleExpansion.duration * fps}>
        <ScaleIn delay={0} duration={timings.durations.slower} intensity="dramatic">
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
            <PromptBox
              placeholder="playlists para calentar para el festival Riverland"
              value="playlists para calentar para el festival Riverland"
              isTyping={false}
              width={500}
              height={64}
              style={{
                fontSize: tokens.typography.fontSize.lg,
                marginBottom: tokens.spacing[6],
              }}
            />
            
            <div
              style={{
                fontSize: tokens.typography.fontSize.base,
                color: tokens.colors.text.tertiary,
                marginBottom: tokens.spacing[4],
              }}
            >
              Creando playlist...
            </div>
            
            {/* 10 SongCards en cascada */}
            {Array.from({ length: 10 }, (_, index) => (
              <SlideIn
                key={index}
                delay={index * 0.2}
                duration={timings.durations.medium}
                direction="left"
              >
                <SongCard
                  title={`Canción ${index + 1}`}
                  artist={`Artista ${index + 1}`}
                  duration={`${Math.floor(Math.random() * 3) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`}
                  isPlaying={index === 0}
                  width={450}
                  height={72}
                />
              </SlideIn>
            ))}
          </AbsoluteFill>
        </ScaleIn>
      </Sequence>
      
      {/* SECCIÓN 4: Mis playlists + CTA */}
      <Sequence from={SEQUENCES.playlistsView.start * fps} durationInFrames={SEQUENCES.playlistsView.duration * fps}>
        <WipeDiagonal delay={0} duration={timings.durations.slower} direction="left">
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
              Mis playlists
            </h2>
            
            <PlaylistsGrid
              playlists={[
                { name: "Fiesta Reggaeton", songCount: 24, color: tokens.colors.pleia.green },
                { name: "Chill Vibes", songCount: 18, color: tokens.colors.pleia.blue },
                { name: "Workout Energy", songCount: 32, color: "#FF6B6B" },
              ]}
              columns={1}
              width={400}
            />
          </AbsoluteFill>
        </WipeDiagonal>
      </Sequence>
      
      {/* Navegación y CTA */}
      <Sequence from={SEQUENCES.navigationBar.start * fps} durationInFrames={SEQUENCES.navigationBar.duration * fps}>
        <SlideIn delay={0} duration={timings.durations.medium} direction="down">
          <AnimatedUnderline
            color="#007AFF"
            underlineColor="#007AFF"
            duration={1.0}
            delay={0}
            style={{
              paddingTop: tokens.spacing[16],
            }}
          >
            playlists.jeylabbb.com
          </AnimatedUnderline>
        </SlideIn>
      </Sequence>
      
      {/* Barra de carga */}
      <Sequence from={SEQUENCES.loadingBar.start * fps} durationInFrames={SEQUENCES.loadingBar.duration * fps}>
        <AppleLoadingBar
          width={300}
          height={4}
          progress={100}
          duration={0.6}
        />
      </Sequence>
      
      {/* Transición final - Loop */}
      <Sequence from={SEQUENCES.transitionOut.start * fps} durationInFrames={SEQUENCES.transitionOut.duration * fps}>
        <FadeIn delay={0} duration={timings.durations.fast}>
          <AbsoluteFill
            style={{
              backgroundColor: tokens.colors.bg.primary,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: tokens.spacing[8],
            }}
          >
            {/* Frame inicial del video anterior para loop perfecto */}
            <PromptBox
              placeholder="reggaeton para salir de fiesta"
              value=""
              isTyping={false}
              width={450}
              height={64}
              style={{
                opacity: 0.8,
                filter: 'blur(2px)',
              }}
            />
          </AbsoluteFill>
        </FadeIn>
      </Sequence>
    </AbsoluteFill>
  );
};
