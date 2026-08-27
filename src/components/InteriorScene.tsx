import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { InteriorGround } from './InteriorGround';
import { InteriorObjects } from './InteriorObjects';
import { StaffAgents } from './StaffAgents';

export function InteriorScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [9, 10, 9], fov: 48 }}
      dpr={[1, 1.75]}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#f2e9d8']} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <InteriorGround />
      <InteriorObjects />
      <StaffAgents />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.15}
        minDistance={4}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.15}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
    </Canvas>
  );
}
