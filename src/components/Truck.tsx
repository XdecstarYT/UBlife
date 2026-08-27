import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';

export function Truck() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const mesh = groupRef.current;
    if (!mesh) return;

    const { truck, gridWidth, gridHeight, cellSize } = useGameStore.getState();
    const { path, segmentIndex, segmentT, phase } = truck;

    if (phase === 'idle' || phase === 'blocked' || path.length < 2) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const a = path[segmentIndex];
    const b = path[Math.min(segmentIndex + 1, path.length - 1)];
    const [ax, , az] = gridToWorld(a, gridWidth, gridHeight, cellSize);
    const [bx, , bz] = gridToWorld(b, gridWidth, gridHeight, cellSize);

    const x = THREE.MathUtils.lerp(ax, bx, segmentT);
    const z = THREE.MathUtils.lerp(az, bz, segmentT);
    mesh.position.set(x, 0.35, z);

    const dx = bx - ax;
    const dz = bz - az;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      mesh.rotation.y = Math.atan2(dx, dz);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.5, 1.1]} />
        <meshStandardMaterial color="#3d7fd9" />
      </mesh>
      <mesh position={[0, 0.05, -0.65]}>
        <boxGeometry args={[0.65, 0.4, 0.3]} />
        <meshStandardMaterial color="#dfe6ee" />
      </mesh>
    </group>
  );
}
