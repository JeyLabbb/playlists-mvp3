import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';
import { createTransition, transitionPresets } from '../utils/verticalTransitions';
import { RealUISimulator, ZoomFocus, LargeIcon } from '../components/RealUI';

interface SimplePromoV3Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV3: React.FC<SimplePromoV3Props> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timings - continuous motion, no abrupt cuts
  const scenes = {
    hook: { start: 0, duration: 90 },        // 3s - Hook with large text
    uiIntro: { start: 90, duration: 60 },    // 2s - UI intro with zoom
    typing: { start: 150, duration: 90 },    // 3s - Typing with sound
    generating: { start: 240, duration: 60 }, // 2s - Loading with motion
    result: { start: 300, duration: 120 },   // 4s - Playlist with zooms
    spotify: { start: 420, duration: 90 },   // 3s - Spotify integration
    cta: { start: 510, duration: 90 },       // 3s - Final CTA
  };

  // Real tracks from underground español
  const realTracks = [
    { title: 'Atrévete-te-te', artist: 'Calle 13' },
    { title: 'Es Épico', artist: 'Canserbero' },
    { title: 'Mejor Que El Silencio', artist: 'Nach' },
    { title: 'Tras La Reja', artist: 'Porta' },
    { title: 'Caminando', artist: 'Violadores del Verso' },
    { title: 'Pal Norte', artist: 'Kase.O' },
    { title: 'Mundo de Piedra', artist: 'Liricistas' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>

      {/* Scene 1: Hook with Large Text (0-3s) */}
      <Sequence from={scenes.hook.start} durationInFrames={scenes.hook.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '60px',
              backgroundColor: brandColor,
            }}
          >
            {/* Large headline with zoom effect */}
            <div
              style={{
                transform: `scale(${spring({
                  frame: frame - scenes.hook.start,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
                textAlign: 'center',
                marginBottom: '40px',
              }}
            >
              <h1
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0,
                  textShadow: `0 0 30px ${accentColor}`,
                  lineHeight: 1.1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {headline}
              </h1>
            </div>

            {/* Large subtitle with continuous motion */}
            <div
              style={{
                transform: `translateY(${interpolate(
                  frame,
                  [0, 90],
                  [20, -10],
                  { extrapolateRight: 'clamp' }
                )}px)`,
                opacity: interpolate(
                  frame - scenes.hook.start,
                  [30, 60],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <LargeIcon
                emoji="🎵"
                size={100}
                startFrame={scenes.hook.start + 30}
                accentColor={accentColor}
              />
              <div
                style={{
                  fontSize: '28px',
                  color: 'white',
                  marginTop: '20px',
                  textAlign: 'center',
                  opacity: 0.9,
                }}
              >
                La mejor IA para amantes de la música
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Transition 1: Smooth zoom to UI */}
      <Sequence from={scenes.hook.start + 60} durationInFrames={30}>
        <AbsoluteFill
          style={{
            ...createTransition(frame, scenes.hook.start + 60, {
              ...transitionPresets.smoothZoom,
              duration: 30,
              style: 'zoom',
            }),
          }}
        >
          <div style={{ backgroundColor: brandColor, width: '100%', height: '100%' }} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: UI Introduction with Zoom (3-5s) */}
      <Sequence from={scenes.uiIntro.start} durationInFrames={scenes.uiIntro.duration}>
        <AbsoluteFill>
          <ZoomFocus
            startFrame={scenes.uiIntro.start}
            duration={scenes.uiIntro.duration}
            target="input"
          >
            <RealUISimulator
              startFrame={scenes.uiIntro.start}
              duration={scenes.uiIntro.duration}
              zoomLevel={1.2}
              showTyping={false}
            />
          </ZoomFocus>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Typing Animation with Sound (5-8s) */}
      <Sequence from={scenes.typing.start} durationInFrames={scenes.typing.duration}>
        <AbsoluteFill>
          <ZoomFocus
            startFrame={scenes.typing.start}
            duration={scenes.typing.duration}
            target="input"
          >
            <RealUISimulator
              startFrame={scenes.typing.start}
              duration={scenes.typing.duration}
              zoomLevel={1.5}
              showTyping={true}
              promptText={prompt}
            />
          </ZoomFocus>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Generating with Motion (8-10s) */}
      <Sequence from={scenes.generating.start} durationInFrames={scenes.generating.duration}>
        <AbsoluteFill>
          <ZoomFocus
            startFrame={scenes.generating.start}
            duration={scenes.generating.duration}
            target="button"
          >
            <RealUISimulator
              startFrame={scenes.generating.start}
              duration={scenes.generating.duration}
              zoomLevel={1.3}
              showTyping={false}
            />
          </ZoomFocus>
          
          {/* Large loading animation */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px',
            }}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                border: '8px solid rgba(255,255,255,0.2)',
                borderTop: '8px solid #00E5A8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                boxShadow: `0 0 40px ${accentColor}40`,
              }}
            />
            <div
              style={{
                fontSize: '32px',
                color: 'white',
                textAlign: 'center',
                fontWeight: '600',
              }}
            >
              ✨ Generando playlist...
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Playlist Result with Zooms (10-14s) */}
      <Sequence from={scenes.result.start} durationInFrames={scenes.result.duration}>
        <AbsoluteFill>
          <ZoomFocus
            startFrame={scenes.result.start}
            duration={scenes.result.duration}
            target="playlist"
          >
            <RealUISimulator
              startFrame={scenes.result.start}
              duration={scenes.result.duration}
              zoomLevel={1.4}
              showPlaylist={true}
              tracks={realTracks.slice(0, 5)}
            />
          </ZoomFocus>
          
          {/* Success animation */}
          <div
            style={{
              position: 'absolute',
              top: '20%',
              right: '10%',
              transform: `scale(${spring({
                frame: frame - scenes.result.start,
                fps,
                config: { damping: 200, stiffness: 200 },
              })})`,
            }}
          >
            <LargeIcon
              emoji="🎉"
              size={80}
              startFrame={scenes.result.start}
              accentColor={accentColor}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: Spotify Integration (14-17s) */}
      <Sequence from={scenes.spotify.start} durationInFrames={scenes.spotify.duration}>
        <AbsoluteFill>
          <ZoomFocus
            startFrame={scenes.spotify.start}
            duration={scenes.spotify.duration}
            target="spotify"
          >
            <RealUISimulator
              startFrame={scenes.spotify.start}
              duration={scenes.spotify.duration}
              zoomLevel={1.6}
              showPlaylist={true}
              tracks={realTracks.slice(0, 3)}
            />
          </ZoomFocus>
          
          {/* Large Spotify logo */}
          <div
            style={{
              position: 'absolute',
              bottom: '20%',
              left: '50%',
              transform: `translateX(-50%) scale(${spring({
                frame: frame - scenes.spotify.start,
                fps,
                config: { damping: 200, stiffness: 200 },
              })})`,
            }}
          >
            <LargeIcon
              emoji="🎵"
              size={120}
              startFrame={scenes.spotify.start}
              accentColor="#1DB954"
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 7: Final CTA (17-20s) */}
      <Sequence from={scenes.cta.start} durationInFrames={scenes.cta.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '60px',
              backgroundColor: brandColor,
            }}
          >
            {/* Large CTA text */}
            <div
              style={{
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
                textAlign: 'center',
                marginBottom: '40px',
              }}
            >
              <h2
                style={{
                  fontSize: '64px',
                  fontWeight: 'bold',
                  color: accentColor,
                  margin: 0,
                  textShadow: `0 0 40px ${accentColor}`,
                  lineHeight: 1.1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                ¡Empieza ahora!
              </h2>
            </div>

            {/* Large button */}
            <div
              style={{
                transform: `scale(${spring({
                  frame: frame - scenes.cta.start - 20,
                  fps,
                  config: { damping: 200, stiffness: 200 },
                })})`,
                marginBottom: '30px',
              }}
            >
              <div
                style={{
                  backgroundColor: accentColor,
                  color: '#000000',
                  fontSize: '28px',
                  fontWeight: '600',
                  padding: '25px 50px',
                  borderRadius: '20px',
                  textAlign: 'center',
                  boxShadow: `0 12px 32px ${accentColor}40`,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {cta}
              </div>
            </div>

            {/* URL */}
            <div
              style={{
                fontSize: '24px',
                color: 'white',
                opacity: 0.8,
                textAlign: 'center',
                transform: `translateY(${interpolate(
                  frame - scenes.cta.start,
                  [0, 90],
                  [10, 0],
                  { extrapolateRight: 'clamp' }
                )}px)`,
              }}
            >
              playlists.jeylabbb.com
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AbsoluteFill>
  );
};
