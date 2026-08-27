import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { ReactNode } from 'react';
import { QUALITY_DPR, useQualityStore } from '../game/quality';

interface GameCanvasProps {
  children: ReactNode;
  camera: { position: [number, number, number]; fov: number };
}

export function GameCanvas({ children, camera }: GameCanvasProps) {
  const tier = useQualityStore((s) => s.tier);

  return (
    <Canvas
      shadows={tier !== 'low'}
      camera={camera}
      dpr={QUALITY_DPR[tier]}
      gl={{
        antialias: tier !== 'low',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        // Needed so the empire-snapshot feature can read back the last rendered frame.
        preserveDrawingBuffer: true,
      }}
      style={{ touchAction: 'none' }}
    >
      {children}
    </Canvas>
  );
}
