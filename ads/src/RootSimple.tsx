/**
 * Root - Registro de composiciones para Remotion (Solo VideoV2)
 */

import { Composition } from 'remotion';
import { VideoV2 } from './VideoV2Simple';
import { VideoV21 } from './VideoV21';
import { VideoV3 } from './VideoV3';
import { VideoV35 } from './VideoV35';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Video V2 - Versión original */}
      <Composition
        id="VideoV2"
        component={VideoV2}
        durationInFrames={25 * 30} // 25 segundos a 30 FPS
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      
      {/* Video V2.1 - Versión rehecha */}
      <Composition
        id="VideoV21"
        component={VideoV21}
        durationInFrames={23 * 30} // 23 segundos a 30 FPS
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      
      {/* Video V3 - Versión premium */}
      <Composition
        id="VideoV3"
        component={VideoV3}
        durationInFrames={25 * 30} // 25 segundos a 30 FPS
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      
      {/* Video V3.5 - Versión con continuidad total */}
      <Composition
        id="VideoV35"
        component={VideoV35}
        durationInFrames={25 * 30} // 25 segundos a 30 FPS
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
