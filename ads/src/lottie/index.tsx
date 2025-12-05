/**
 * Lottie Integration - Sistema de animaciones Lottie para ads
 * Incluye archivos placeholder y overlay opcional
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Lottie } from '@remotion/lottie';
import { tokens } from '../design';

// Archivos Lottie placeholder (JSON básicos)
const loaderAnimation = {
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 90,
  "w": 200,
  "h": 200,
  "nm": "Loader",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Circle",
      "sr": 1,
      "ks": {
        "o": {
          "a": 1,
          "k": [
            {
              "i": {
                "x": [0.833],
                "y": [0.833]
              },
              "o": {
                "x": [0.167],
                "y": [0.167]
              },
              "t": 0,
              "s": [0]
            },
            {
              "i": {
                "x": [0.833],
                "y": [0.833]
              },
              "o": {
                "x": [0.167],
                "y": [0.167]
              },
              "t": 45,
              "s": [100]
            },
            {
              "t": 90,
              "s": [0]
            }
          ],
          "ix": 11
        },
        "r": {
          "a": 1,
          "k": [
            {
              "i": {
                "x": [0.833],
                "y": [0.833]
              },
              "o": {
                "x": [0.167],
                "y": [0.167]
              },
              "t": 0,
              "s": [0]
            },
            {
              "t": 90,
              "s": [360]
            }
          ],
          "ix": 10
        },
        "p": {
          "a": 0,
          "k": [100, 100, 0],
          "ix": 2
        },
        "a": {
          "a": 0,
          "k": [0, 0, 0],
          "ix": 1
        },
        "s": {
          "a": 0,
          "k": [100, 100, 100],
          "ix": 6
        }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "d": 1,
              "ty": "el",
              "s": {
                "a": 0,
                "k": [40, 40],
                "ix": 2
              },
              "p": {
                "a": 0,
                "k": [0, 0],
                "ix": 3
              },
              "nm": "Ellipse Path 1",
              "mn": "ADBE Vector Shape - Ellipse",
              "hd": false
            },
            {
              "ty": "st",
              "c": {
                "a": 0,
                "k": [0.212, 0.886, 0.706, 1],
                "ix": 3
              },
              "o": {
                "a": 0,
                "k": 100,
                "ix": 4
              },
              "w": {
                "a": 0,
                "k": 4,
                "ix": 5
              },
              "lc": 1,
              "lj": 1,
              "ml": 4,
              "bm": 0,
              "d": [
                {
                  "n": "d",
                  "nm": "dash",
                  "v": {
                    "a": 0,
                    "k": 0,
                    "ix": 1
                  }
                }
              ],
              "nm": "Stroke 1",
              "mn": "ADBE Vector Graphic - Stroke",
              "hd": false
            },
            {
              "ty": "tr",
              "p": {
                "a": 0,
                "k": [0, 0],
                "ix": 2
              },
              "a": {
                "a": 0,
                "k": [0, 0],
                "ix": 1
              },
              "s": {
                "a": 0,
                "k": [100, 100],
                "ix": 3
              },
              "r": {
                "a": 0,
                "k": 0,
                "ix": 6
              },
              "o": {
                "a": 0,
                "k": 100,
                "ix": 7
              },
              "sk": {
                "a": 0,
                "k": 0,
                "ix": 4
              },
              "sa": {
                "a": 0,
                "k": 0,
                "ix": 5
              },
              "nm": "Transform"
            }
          ],
          "nm": "Ellipse 1",
          "np": 2,
          "cix": 2,
          "bm": 0,
          "ix": 1,
          "mn": "ADBE Vector Group",
          "hd": false
        }
      ],
      "ip": 0,
      "op": 90,
      "st": 0,
      "bm": 0
    }
  ],
  "markers": []
};

const sparklesAnimation = {
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 200,
  "h": 200,
  "nm": "Sparkles",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Sparkle 1",
      "sr": 1,
      "ks": {
        "o": {
          "a": 1,
          "k": [
            {
              "i": {
                "x": [0.833],
                "y": [0.833]
              },
              "o": {
                "x": [0.167],
                "y": [0.167]
              },
              "t": 0,
              "s": [0]
            },
            {
              "i": {
                "x": [0.833],
                "y": [0.833]
              },
              "o": {
                "x": [0.167],
                "y": [0.167]
              },
              "t": 15,
              "s": [100]
            },
            {
              "i": {
                "x": [0.833],
                "y": [0.833]
              },
              "o": {
                "x": [0.167],
                "y": [0.167]
              },
              "t": 45,
              "s": [100]
            },
            {
              "t": 60,
              "s": [0]
            }
          ],
          "ix": 11
        },
        "r": {
          "a": 1,
          "k": [
            {
              "i": {
                "x": [0.833],
                "y": [0.833]
              },
              "o": {
                "x": [0.167],
                "y": [0.167]
              },
              "t": 0,
              "s": [0]
            },
            {
              "t": 60,
              "s": [180]
            }
          ],
          "ix": 10
        },
        "p": {
          "a": 0,
          "k": [100, 100, 0],
          "ix": 2
        },
        "a": {
          "a": 0,
          "k": [0, 0, 0],
          "ix": 1
        },
        "s": {
          "a": 1,
          "k": [
            {
              "i": {
                "x": [0.833, 0.833, 0.833],
                "y": [0.833, 0.833, 0.833]
              },
              "o": {
                "x": [0.167, 0.167, 0.167],
                "y": [0.167, 0.167, 0.167]
              },
              "t": 0,
              "s": [0, 0, 100]
            },
            {
              "i": {
                "x": [0.833, 0.833, 0.833],
                "y": [0.833, 0.833, 0.833]
              },
              "o": {
                "x": [0.167, 0.167, 0.167],
                "y": [0.167, 0.167, 0.167]
              },
              "t": 30,
              "s": [100, 100, 100]
            },
            {
              "t": 60,
              "s": [0, 0, 100]
            }
          ],
          "ix": 6
        }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ty": "rc",
              "d": 1,
              "s": {
                "a": 0,
                "k": [20, 4],
                "ix": 2
              },
              "p": {
                "a": 0,
                "k": [0, 0],
                "ix": 3
              },
              "r": {
                "a": 0,
                "k": 2,
                "ix": 4
              },
              "nm": "Rectangle Path 1",
              "mn": "ADBE Vector Shape - Rect",
              "hd": false
            },
            {
              "ty": "fl",
              "c": {
                "a": 0,
                "k": [0.212, 0.886, 0.706, 1],
                "ix": 4
              },
              "o": {
                "a": 0,
                "k": 100,
                "ix": 5
              },
              "r": 1,
              "bm": 0,
              "nm": "Fill 1",
              "mn": "ADBE Vector Graphic - Fill",
              "hd": false
            },
            {
              "ty": "tr",
              "p": {
                "a": 0,
                "k": [0, 0],
                "ix": 2
              },
              "a": {
                "a": 0,
                "k": [0, 0],
                "ix": 1
              },
              "s": {
                "a": 0,
                "k": [100, 100],
                "ix": 3
              },
              "r": {
                "a": 0,
                "k": 0,
                "ix": 6
              },
              "o": {
                "a": 0,
                "k": 100,
                "ix": 7
              },
              "sk": {
                "a": 0,
                "k": 0,
                "ix": 4
              },
              "sa": {
                "a": 0,
                "k": 0,
                "ix": 5
              },
              "nm": "Transform"
            }
          ],
          "nm": "Rectangle 1",
          "np": 2,
          "cix": 2,
          "bm": 0,
          "ix": 1,
          "mn": "ADBE Vector Group",
          "hd": false
        }
      ],
      "ip": 0,
      "op": 60,
      "st": 0,
      "bm": 0
    }
  ],
  "markers": []
};

// Componente Loader con Lottie
export const LottieLoader: React.FC<{
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({
  width = 100,
  height = 100,
  style = {},
}) => {
  return (
    <AbsoluteFill
      style={{
        width,
        height,
        ...style,
      }}
    >
      <Lottie
        animationData={loaderAnimation}
        style={{
          width: '100%',
          height: '100%',
        }}
        loop
      />
    </AbsoluteFill>
  );
};

// Componente Sparkles con Lottie
export const LottieSparkles: React.FC<{
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({
  width = 100,
  height = 100,
  style = {},
}) => {
  return (
    <AbsoluteFill
      style={{
        width,
        height,
        ...style,
      }}
    >
      <Lottie
        animationData={sparklesAnimation}
        style={{
          width: '100%',
          height: '100%',
        }}
        loop
      />
    </AbsoluteFill>
  );
};

// Overlay opcional con Lottie
export const LottieOverlay: React.FC<{
  children: React.ReactNode;
  animation?: 'loader' | 'sparkles';
  opacity?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  animation = 'sparkles',
  opacity = 0.3,
  style = {},
}) => {
  const animationData = animation === 'loader' ? loaderAnimation : sparklesAnimation;
  
  return (
    <AbsoluteFill style={style}>
      {children}
      <AbsoluteFill
        style={{
          opacity,
          pointerEvents: 'none',
        }}
      >
        <Lottie
          animationData={animationData}
          style={{
            width: '100%',
            height: '100%',
          }}
          loop
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Componente de éxito con sparkles
export const SuccessAnimation: React.FC<{
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({
  width = 200,
  height = 200,
  style = {},
}) => {
  return (
    <AbsoluteFill
      style={{
        width,
        height,
        ...style,
      }}
    >
      {/* Checkmark */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: tokens.colors.pleia.green,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </div>
      
      {/* Sparkles overlay */}
      <LottieSparkles
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      />
    </AbsoluteFill>
  );
};

// Exportar todos los componentes Lottie
export const lottieComponents = {
  LottieLoader,
  LottieSparkles,
  LottieOverlay,
  SuccessAnimation,
} as const;

export default lottieComponents;
