import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';
import { createTransition, transitionPresets } from '../utils/verticalTransitions';
import { sfxPresets } from '../utils/professionalSFX';
import { Button3D, SpotifyLogo3D, DynamicText, ParticleSystem, GlitchOverlay } from '../components/VisualEffects';

interface SimplePromoV2Props {
  headline: string;
  prompt: string;
  cta: string;
  brandColor: string;
  accentColor: string;
}

export const SimplePromoV2: React.FC<SimplePromoV2Props> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timings (fast-paced for TikTok/Reels)
  const scenes = {
    hook: { start: 0, duration: 60 },      // 2s - Hook impact
    uiIntro: { start: 60, duration: 45 },  // 1.5s - UI introduction
    typing: { start: 105, duration: 60 },  // 2s - Typing animation
    generating: { start: 165, duration: 45 }, // 1.5s - Loading
    result: { start: 210, duration: 90 },  // 3s - Playlist result
    features: { start: 300, duration: 90 }, // 3s - Feature showcase
    cta: { start: 390, duration: 60 },     // 2s - Final CTA
  };

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* Background particles */}
      <ParticleSystem
        startFrame={0}
        particleCount={15}
        accentColor={accentColor}
      />

      {/* Scene 1: Hook with Dynamic Text (0-2s) */}
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
            }}
          >
            <DynamicText
              text={headline}
              startFrame={scenes.hook.start}
              duration={30}
              accentColor={accentColor}
              fontSize="48px"
              effect="glitch"
            />
            
            <div style={{ marginTop: '30px' }}>
              <DynamicText
                text="La mejor IA para amantes de la música"
                startFrame={scenes.hook.start + 30}
                duration={30}
                accentColor={accentColor}
                fontSize="20px"
                effect="slide"
              />
            </div>
          </div>
        </AbsoluteFill>
        
        {/* Glitch effect */}
        <GlitchOverlay
          startFrame={scenes.hook.start + 20}
          duration={20}
          intensity={0.5}
        />
      </Sequence>

      {/* Transition 1: Dynamic entrance */}
      <Sequence from={scenes.hook.start + 45} durationInFrames={15}>
        <AbsoluteFill
          style={{
            ...createTransition(frame, scenes.hook.start + 45, {
              ...transitionPresets.dynamicEntrance,
              duration: 15,
            }),
          }}
        >
          <div style={{ backgroundColor: brandColor, width: '100%', height: '100%' }} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: UI Introduction (2-3.5s) */}
      <Sequence from={scenes.uiIntro.start} durationInFrames={scenes.uiIntro.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '40px',
            }}
          >
            {/* Mock browser with 3D elements */}
            <div
              style={{
                width: '90%',
                maxWidth: '800px',
                height: '80%',
                backgroundColor: '#1a1a1a',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                border: '1px solid #333',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Browser UI with 3D elements */}
              <div
                style={{
                  height: '40px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '10px 10px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  marginBottom: '20px',
                }}
              >
                {/* Traffic lights */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#ff5f57', '#ffbd2e', '#28ca42'].map((color, i) => (
                    <div
                      key={i}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3)`,
                      }}
                    />
                  ))}
                </div>

                {/* URL bar with 3D effect */}
                <div
                  style={{
                    backgroundColor: '#333333',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    color: '#ffffff',
                    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.3)`,
                  }}
                >
                  playlists.jeylabbb.com
                </div>

                {/* Spotify logo 3D */}
                <SpotifyLogo3D
                  startFrame={scenes.uiIntro.start + 10}
                  size={24}
                />
              </div>

              {/* App content placeholder */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 'calc(100% - 60px)',
                }}
              >
                <DynamicText
                  text="Cargando..."
                  startFrame={scenes.uiIntro.start + 20}
                  duration={25}
                  accentColor={accentColor}
                  fontSize="18px"
                  effect="type"
                />
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Transition 2: Quick cut */}
      <Sequence from={scenes.uiIntro.start + 30} durationInFrames={15}>
        <AbsoluteFill
          style={{
            ...createTransition(frame, scenes.uiIntro.start + 30, {
              ...transitionPresets.quickCut,
              duration: 15,
            }),
          }}
        >
          <div style={{ backgroundColor: brandColor, width: '100%', height: '100%' }} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Typing Animation (3.5-5.5s) */}
      <Sequence from={scenes.typing.start} durationInFrames={scenes.typing.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '90%',
                maxWidth: '800px',
                height: '80%',
                backgroundColor: '#1a1a1a',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                border: '1px solid #333',
              }}
            >
              {/* Browser UI (simplified) */}
              <div
                style={{
                  height: '40px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '10px 10px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#ff5f57', '#ffbd2e', '#28ca42'].map((color, i) => (
                    <div
                      key={i}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '30px',
                  height: 'calc(100% - 60px)',
                  padding: '20px 0',
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: '16px',
                      color: 'white',
                      marginBottom: '10px',
                      display: 'block',
                    }}
                  >
                    ¿Qué tipo de música quieres?
                  </label>
                  <div
                    style={{
                      padding: '15px 20px',
                      backgroundColor: '#333333',
                      borderRadius: '12px',
                      border: `2px solid ${accentColor}`,
                      fontSize: '18px',
                      color: accentColor,
                      fontFamily: 'monospace',
                      minHeight: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <DynamicText
                      text={prompt}
                      startFrame={scenes.typing.start + 10}
                      duration={50}
                      accentColor={accentColor}
                      fontSize="18px"
                      effect="type"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '40px',
                  }}
                >
                  <Button3D
                    text="Generar Playlist"
                    accentColor={accentColor}
                    startFrame={scenes.typing.start + 40}
                    scale={1.2}
                    depth={6}
                  />
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Transition 3: Smooth zoom */}
      <Sequence from={scenes.typing.start + 45} durationInFrames={15}>
        <AbsoluteFill
          style={{
            ...createTransition(frame, scenes.typing.start + 45, {
              ...transitionPresets.smoothZoom,
              duration: 15,
            }),
          }}
        >
          <div style={{ backgroundColor: brandColor, width: '100%', height: '100%' }} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Generating with 3D elements (5.5-7s) */}
      <Sequence from={scenes.generating.start} durationInFrames={scenes.generating.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '90%',
                maxWidth: '800px',
                height: '80%',
                backgroundColor: '#1a1a1a',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 3D Loading animation */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  border: `4px solid ${accentColor}20`,
                  borderTop: `4px solid ${accentColor}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '30px',
                  boxShadow: `0 0 20px ${accentColor}40`,
                }}
              />
              
              <DynamicText
                text="Generando tu playlist..."
                startFrame={scenes.generating.start + 10}
                duration={35}
                accentColor={accentColor}
                fontSize="24px"
                effect="zoom"
              />
              
              <DynamicText
                text="Analizando tus gustos musicales"
                startFrame={scenes.generating.start + 25}
                duration={20}
                accentColor={accentColor}
                fontSize="16px"
                effect="slide"
              />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Transition 4: Dramatic flip */}
      <Sequence from={scenes.generating.start + 30} durationInFrames={15}>
        <AbsoluteFill
          style={{
            ...createTransition(frame, scenes.generating.start + 30, {
              ...transitionPresets.dramaticFlip,
              duration: 15,
            }),
          }}
        >
          <div style={{ backgroundColor: brandColor, width: '100%', height: '100%' }} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Playlist Result (7-10s) */}
      <Sequence from={scenes.result.start} durationInFrames={scenes.result.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#000000',
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '90%',
                maxWidth: '800px',
                height: '80%',
                backgroundColor: '#1a1a1a',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                border: '1px solid #333',
              }}
            >
              {/* Browser UI */}
              <div
                style={{
                  height: '40px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '10px 10px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#ff5f57', '#ffbd2e', '#28ca42'].map((color, i) => (
                    <div
                      key={i}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  height: 'calc(100% - 60px)',
                }}
              >
                <DynamicText
                  text="¡Tu playlist está lista!"
                  startFrame={scenes.result.start + 10}
                  duration={30}
                  accentColor={accentColor}
                  fontSize="24px"
                  effect="pop"
                />

                {/* Playlist items with 3D effects */}
                {[
                  { title: 'Calle 13 - Atrévete-te-te', artist: 'Calle 13' },
                  { title: 'Canserbero - Es Épico', artist: 'Canserbero' },
                  { title: 'Nach - Mejor Que El Silencio', artist: 'Nach' },
                  { title: 'Porta - Tras La Reja', artist: 'Porta' },
                  { title: 'Violadores del Verso - Caminando', artist: 'Violadores del Verso' },
                ].map((track, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #333',
                      transform: `scale(${spring({
                        frame: frame - (scenes.result.start + 30 + index * 10),
                        fps,
                        config: { damping: 200, stiffness: 200 },
                      })})`,
                      opacity: interpolate(
                        frame - (scenes.result.start + 30 + index * 10),
                        [0, 20],
                        [0, 1],
                        { extrapolateRight: 'clamp' }
                      ),
                    }}
                  >
                    {/* Track number with 3D effect */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '16px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#000000',
                        boxShadow: `0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)`,
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Track info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          color: '#ffffff',
                          fontSize: '16px',
                          fontWeight: '500',
                          marginBottom: '4px',
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          color: '#aaaaaa',
                          fontSize: '14px',
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>

                    {/* Play button 3D */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: `2px solid ${accentColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: `0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)`,
                      }}
                    >
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: `8px solid ${accentColor}`,
                          borderTop: '6px solid transparent',
                          borderBottom: '6px solid transparent',
                          marginLeft: '2px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Transition 5: Clean wipe */}
      <Sequence from={scenes.result.start + 75} durationInFrames={15}>
        <AbsoluteFill
          style={{
            ...createTransition(frame, scenes.result.start + 75, {
              ...transitionPresets.cleanWipe,
              duration: 15,
            }),
          }}
        >
          <div style={{ backgroundColor: brandColor, width: '100%', height: '100%' }} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: Feature Showcase (10-13s) */}
      <Sequence from={scenes.features.start} durationInFrames={scenes.features.duration}>
        <AbsoluteFill>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '60px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '40px',
                maxWidth: '600px',
              }}
            >
              <DynamicText
                text="Más que solo playlists"
                startFrame={scenes.features.start + 10}
                duration={30}
                accentColor={accentColor}
                fontSize="36px"
                effect="zoom"
              />
              
              <div
                style={{
                  display: 'flex',
                  gap: '30px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { icon: '🎵', text: 'IA avanzada' },
                  { icon: '⚡', text: 'Rápido' },
                  { icon: '🎯', text: 'Personalizado' },
                  { icon: '📱', text: 'Móvil' },
                ].map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      transform: `scale(${spring({
                        frame: frame - (scenes.features.start + 30 + index * 15),
                        fps,
                        config: { damping: 200, stiffness: 200 },
                      })})`,
                      opacity: interpolate(
                        frame - (scenes.features.start + 30 + index * 15),
                        [0, 20],
                        [0, 1],
                        { extrapolateRight: 'clamp' }
                      ),
                    }}
                  >
                    <div
                      style={{
                        fontSize: '32px',
                        marginBottom: '5px',
                      }}
                    >
                      {feature.icon}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'white',
                        textAlign: 'center',
                      }}
                    >
                      {feature.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Transition 6: Dynamic entrance */}
      <Sequence from={scenes.features.start + 75} durationInFrames={15}>
        <AbsoluteFill
          style={{
            ...createTransition(frame, scenes.features.start + 75, {
              ...transitionPresets.dynamicEntrance,
              duration: 15,
            }),
          }}
        >
          <div style={{ backgroundColor: brandColor, width: '100%', height: '100%' }} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 7: Final CTA (13-15s) */}
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
            }}
          >
            <DynamicText
              text="¡Empieza ahora!"
              startFrame={scenes.cta.start + 10}
              duration={30}
              accentColor={accentColor}
              fontSize="42px"
              effect="glitch"
            />
            
            <div style={{ marginTop: '40px' }}>
              <Button3D
                text={cta}
                accentColor={accentColor}
                startFrame={scenes.cta.start + 20}
                scale={1.5}
                depth={10}
              />
            </div>
            
            <DynamicText
              text="playlists.jeylabbb.com"
              startFrame={scenes.cta.start + 35}
              duration={25}
              accentColor={accentColor}
              fontSize="18px"
              effect="slide"
            />
          </div>
        </AbsoluteFill>
        
        {/* Final glitch effect */}
        <GlitchOverlay
          startFrame={scenes.cta.start + 40}
          duration={20}
          intensity={0.8}
        />
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
