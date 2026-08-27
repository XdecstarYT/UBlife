import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameCanvas } from './GameCanvas';
import { SceneEffects } from './SceneEffects';
import { InteriorGround } from './InteriorGround';
import { InteriorObjects } from './InteriorObjects';
import { StaffAgents } from './StaffAgents';

export function InteriorScene() {
  return (
    <GameCanvas camera={{ position: [9, 10, 9], fov: 48 }}>
      <color attach="background" args={['#f2e9d8']} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      <SceneEffects contactShadowScale={13} contactShadowOpacity={0.5} contactShadowFar={4} />

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
    </GameCanvas>
  );
}
