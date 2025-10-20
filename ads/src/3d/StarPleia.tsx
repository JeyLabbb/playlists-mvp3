/**
 * StarPleia - Componente 3D de estrella con glow suave
 * Usa @react-three/fiber para renderizado 3D ligero
 */

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AbsoluteFill } from 'remotion';
import { tokens } from '../design';

// Componente de la estrella 3D
const Star: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Animación de rotación suave
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {/* Geometría de estrella */}
      <octahedronGeometry args={[1, 0]} />
      
      {/* Material con glow suave */}
      <meshBasicMaterial
        color={tokens.colors.pleia.green}
        transparent
        opacity={0.8}
        emissive={tokens.colors.pleia.green}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

// Componente principal StarPleia
export const StarPleia: React.FC<{
  width?: number;
  height?: number;
  size?: number;
  count?: number;
  style?: React.CSSProperties;
}> = ({
  width = 200,
  height = 200,
  size = 1,
  count = 1,
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
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Iluminación suave */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        
        {/* Estrellas */}
        {Array.from({ length: count }, (_, index) => (
          <Star
            key={index}
            position={[
              (Math.random() - 0.5) * 4,
              (Math.random() - 0.5) * 4,
              (Math.random() - 0.5) * 2,
            ]}
            scale={size * (0.8 + Math.random() * 0.4)}
          />
        ))}
        
        {/* Estrella principal centrada */}
        <Star
          position={[0, 0, 0]}
          scale={size * 1.2}
        />
      </Canvas>
    </AbsoluteFill>
  );
};

// Variante con partículas flotantes
export const StarPleiaParticles: React.FC<{
  width?: number;
  height?: number;
  particleCount?: number;
  style?: React.CSSProperties;
}> = ({
  width = 200,
  height = 200,
  particleCount = 20,
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
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Iluminación suave */}
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.4} />
        
        {/* Partículas flotantes */}
        {Array.from({ length: particleCount }, (_, index) => (
          <Star
            key={index}
            position={[
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 4,
            ]}
            scale={0.3 + Math.random() * 0.4}
          />
        ))}
        
        {/* Estrella principal */}
        <Star
          position={[0, 0, 0]}
          scale={1.5}
        />
      </Canvas>
    </AbsoluteFill>
  );
};

// Variante minimalista con una sola estrella
export const StarPleiaMinimal: React.FC<{
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
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Iluminación mínima */}
        <ambientLight intensity={0.5} />
        
        {/* Una sola estrella */}
        <Star
          position={[0, 0, 0]}
          scale={1}
        />
      </Canvas>
    </AbsoluteFill>
  );
};

// Exportar todas las variantes
export const starPleiaComponents = {
  StarPleia,
  StarPleiaParticles,
  StarPleiaMinimal,
} as const;

export default starPleiaComponents;
