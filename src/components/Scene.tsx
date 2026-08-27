import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GroundGrid } from './GroundGrid';
import { Tiles } from './Tiles';
import { Buildings } from './Buildings';
import { Truck } from './Truck';
import { Customers } from './Customers';

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [20, 19, 20], fov: 50 }}
      dpr={[1, 1.75]}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#bfe3f2']} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <GroundGrid />
      <Tiles />
      <Buildings />
      <Truck />
      <Customers />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.15}
        minDistance={6}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.15}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
    </Canvas>
  );
}
