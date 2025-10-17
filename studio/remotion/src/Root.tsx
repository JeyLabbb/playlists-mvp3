import { registerRoot, Composition } from 'remotion';
import { AdMain } from './compositions/AdMain';
import { HeroBgLoop } from './compositions/HeroBgLoop';
import { SimplePromoV1 } from './compositions/SimplePromoV1';
import { SimplePromoV2 } from './compositions/SimplePromoV2';
import { SimplePromoV3 } from './compositions/SimplePromoV3';
import { SimplePromoV4 } from './compositions/SimplePromoV4';
import { SimplePromoV5 } from './compositions/SimplePromoV5';
import { SimplePromoV6 } from './compositions/SimplePromoV6';
import { SimplePromoV7 } from './compositions/SimplePromoV7';
import { SimplePromoV8 } from './compositions/SimplePromoV8';
import { SimplePromoV9 } from './compositions/SimplePromoV9';
import { SimplePromoV10 } from './compositions/SimplePromoV10';
import { SimplePromoV11 } from './compositions/SimplePromoV11';
import { SimplePromoV12 } from './compositions/SimplePromoV12';
import { SimplePromoV13 } from './compositions/SimplePromoV13';
import { SimplePromoV14 } from './compositions/SimplePromoV14';
import { SimplePromoV15 } from './compositions/SimplePromoV15';
import { SimplePromoV16 } from './compositions/SimplePromoV16';
import { SimplePromoV17 } from './compositions/SimplePromoV17';
import { SimplePromoV18 } from './compositions/SimplePromoV18';
import adConfig from '../config/ad.json';

registerRoot(() => {
  return (
    <>
      <Composition
        id="AdMain"
        component={AdMain}
        durationInFrames={540} // 18 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="HeroBgLoop"
        component={HeroBgLoop}
        durationInFrames={240} // 8 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV1"
        component={SimplePromoV1}
        durationInFrames={540} // 18 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV2"
        component={SimplePromoV2}
        durationInFrames={450} // 15 seconds at 30fps (fast-paced)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV3"
        component={SimplePromoV3}
        durationInFrames={600} // 20 seconds at 30fps (with real UI and continuous motion)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV4"
        component={SimplePromoV4}
        durationInFrames={390} // 13 seconds at 30fps (fast, with real UI and sounds)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV5"
        component={SimplePromoV5}
        durationInFrames={300} // 10 seconds at 30fps (viral timing with real UI and improved sounds)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV6"
        component={SimplePromoV6}
        durationInFrames={450} // 15 seconds at 30fps (professional with loop, real UI, specific tracks)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV7"
        component={SimplePromoV7}
        durationInFrames={450} // 15 seconds at 30fps (corrected brand, real UI, exact tracks, preview effects)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV8"
        component={SimplePromoV8}
        durationInFrames={600} // 20 seconds at 30fps (exact specifications, real UI, high-quality audio, loop)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV9"
        component={SimplePromoV9}
        durationInFrames={600} // 20 seconds at 30fps (professional, aesthetic, real UI, perfect loop)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV10"
        component={SimplePromoV10}
        durationInFrames={600} // 20 seconds at 30fps (optimized timing, larger elements, faster transitions)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV11"
        component={SimplePromoV11}
        durationInFrames={540} // 18 seconds at 30fps (faster, only 3 songs with pause, cursor click, better margins)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV12"
        component={SimplePromoV12}
        durationInFrames={720} // 24 seconds at 30fps (professional Apple aesthetic, real UI, clean colors, perfect loop)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV13"
        component={SimplePromoV13}
        durationInFrames={720} // 24 seconds at 30fps (corrected sizes, authentic zoom, precise cursor, real audio, perfect loop)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV14"
        component={SimplePromoV14}
        durationInFrames={720} // 24 seconds at 30fps (FULL AUDIO INTEGRATION - all sounds from public/studio/audio)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV15"
        component={SimplePromoV15}
        durationInFrames={720} // 24 seconds at 30fps (SYNTHETIC AUDIO - working audio with generated sounds)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV16"
        component={SimplePromoV16}
        durationInFrames={720} // 24 seconds at 30fps (SIMPLE AUDIO FILES - working WAV files created with Node.js)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV17"
        component={SimplePromoV17}
        durationInFrames={720} // 24 seconds at 30fps (VISUAL ONLY - no audio, all corrections applied)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
      <Composition
        id="SimplePromoV18"
        component={SimplePromoV18}
        durationInFrames={720} // 24 seconds at 30fps (FLEXIBLE AUDIO SYSTEM - supports MP3/WAV, handles large files)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={adConfig}
      />
    </>
  );
});
