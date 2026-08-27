import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameCanvas } from './GameCanvas';
import { SceneEffects } from './SceneEffects';
import { SkyDome } from './SkyDome';
import { GroundGrid } from './GroundGrid';
import { Tiles } from './Tiles';
import { Buildings } from './Buildings';
import { ZoneBuildings } from './ZoneBuildings';
import { Vehicles } from './Vehicles';
import { Customers } from './Customers';

export function Scene() {
  return (
    <GameCanvas camera={{ position: [20, 19, 20], fov: 50 }}>
      <fog attach="fog" args={['#bcdcec', 32, 95]} />
      <SkyDome topColor="#3f7fd0" horizonColor="#d8ecf5" exponent={0.55} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <SceneEffects contactShadowScale={30} contactShadowOpacity={0.4} contactShadowFar={8} />

      <GroundGrid />
      <Tiles />
      <Buildings />
      <ZoneBuildings />
      <Vehicles />
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
    </GameCanvas>
  );
}
