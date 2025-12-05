/**
 * Root - Registro de composiciones para Remotion
 */

import { Composition } from 'remotion';
import { Video15s } from './Video15s';
import { Video30s } from './Video30s';
import { VideoV2 } from './VideoV2Simple';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Video de 15 segundos */}
      <Composition
        id="Video15s"
        component={Video15s}
        durationInFrames={15 * 30} // 15 segundos a 30 FPS
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      
      {/* Video de 30 segundos */}
      <Composition
        id="Video30s"
        component={Video30s}
        durationInFrames={30 * 30} // 30 segundos a 30 FPS
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      
      {/* Video V2 - Segundo video principal */}
      <Composition
        id="VideoV2"
        component={VideoV2}
        durationInFrames={25 * 30} // 25 segundos a 30 FPS
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
