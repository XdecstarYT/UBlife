import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';
import { BACKROOM_POS } from '../game/constants';
import type { StaffRole } from '../game/types';

const ROLE_COLOR: Record<StaffRole, string> = {
  stocker: '#e0a83a',
  cashier: '#3d7fd9',
};

function StaffAgent({ id, role }: { id: number; role: StaffRole }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const { staff, interiorWidth, interiorHeight, interiorCellSize } = useGameStore.getState();
    const member = staff.find((m) => m.id === id);
    if (!member) {
      g.visible = false;
      return;
    }
    g.visible = true;

    const a = member.path[member.segmentIndex] ?? BACKROOM_POS;
    const b = member.path[Math.min(member.segmentIndex + 1, member.path.length - 1)] ?? a;
    const [ax, , az] = gridToWorld(a, interiorWidth, interiorHeight, interiorCellSize);
    const [bx, , bz] = gridToWorld(b, interiorWidth, interiorHeight, interiorCellSize);
    const x = THREE.MathUtils.lerp(ax, bx, member.segmentT);
    const z = THREE.MathUtils.lerp(az, bz, member.segmentT);
    g.position.set(x, 0, z);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
        <meshStandardMaterial color={ROLE_COLOR[role]} roughness={0.65} metalness={0} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#f0c9a0" roughness={0.55} metalness={0} />
      </mesh>
    </group>
  );
}

export function StaffAgents() {
  // Select a primitive "signature" so this only re-renders on hire/fire, not every tick.
  const rosterKey = useGameStore((s) => s.staff.map((m) => `${m.id}:${m.role}`).join(','));
  const roster = rosterKey
    ? rosterKey.split(',').map((entry) => {
        const [idStr, role] = entry.split(':');
        return { id: Number(idStr), role: role as StaffRole };
      })
    : [];

  return (
    <group>
      {roster.map((m) => (
        <StaffAgent key={m.id} id={m.id} role={m.role} />
      ))}
    </group>
  );
}
