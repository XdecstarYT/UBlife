import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';
import type { GameState, TruckState } from '../game/types';

interface VehicleProps {
  select: (state: GameState) => TruckState | undefined;
}

function Vehicle({ select }: VehicleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const truckRef = useRef<THREE.Group>(null);
  const trainRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const state = useGameStore.getState();
    const vehicle = select(state);

    if (!vehicle || vehicle.phase === 'idle' || vehicle.phase === 'blocked' || vehicle.path.length < 2) {
      group.visible = false;
      return;
    }
    group.visible = true;
    if (truckRef.current) truckRef.current.visible = vehicle.mode !== 'train';
    if (trainRef.current) trainRef.current.visible = vehicle.mode === 'train';

    const { gridWidth, gridHeight, cellSize } = state;
    const a = vehicle.path[vehicle.segmentIndex];
    const b = vehicle.path[Math.min(vehicle.segmentIndex + 1, vehicle.path.length - 1)];
    const [ax, , az] = gridToWorld(a, gridWidth, gridHeight, cellSize);
    const [bx, , bz] = gridToWorld(b, gridWidth, gridHeight, cellSize);

    const x = THREE.MathUtils.lerp(ax, bx, vehicle.segmentT);
    const z = THREE.MathUtils.lerp(az, bz, vehicle.segmentT);
    group.position.set(x, 0.35, z);

    const dx = bx - ax;
    const dz = bz - az;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      group.rotation.y = Math.atan2(dx, dz);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={truckRef}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.5, 1.1]} />
          <meshStandardMaterial color="#3d7fd9" roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.05, -0.65]} castShadow>
          <boxGeometry args={[0.65, 0.4, 0.3]} />
          <meshStandardMaterial color="#dfe6ee" roughness={0.4} metalness={0.5} />
        </mesh>
      </group>

      <group ref={trainRef}>
        <mesh position={[0, 0.06, 0.5]} castShadow>
          <boxGeometry args={[0.75, 0.55, 0.9]} />
          <meshStandardMaterial color="#e0433a" roughness={0.3} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.14, -0.4]} castShadow>
          <boxGeometry args={[0.7, 0.4, 0.75]} />
          <meshStandardMaterial color="#d9d9d9" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.78, 0.08, 1.75]} />
          <meshStandardMaterial color="#333" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export function Vehicles() {
  const satelliteIdsKey = useGameStore((s) => s.satelliteStores.map((st) => st.id).join(','));
  const ids = satelliteIdsKey ? satelliteIdsKey.split(',').map(Number) : [];

  return (
    <group>
      <Vehicle select={(s) => s.truck} />
      {ids.map((id) => (
        <Vehicle key={id} select={(s) => s.satelliteStores.find((st) => st.id === id)?.vehicle} />
      ))}
    </group>
  );
}
