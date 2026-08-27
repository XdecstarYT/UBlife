import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { worldToGrid, gridToWorld } from '../game/grid';
import { BACKROOM_POS } from '../game/constants';

const TAP_THRESHOLD_PX = 6;

export function InteriorGround() {
  const width = useGameStore((s) => s.interiorWidth);
  const height = useGameStore((s) => s.interiorHeight);
  const cellSize = useGameStore((s) => s.interiorCellSize);
  const placeInteriorAt = useGameStore((s) => s.placeInteriorAt);

  const downPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    downPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    const start = downPos.current;
    downPos.current = null;
    if (!start) return;
    const dx = e.nativeEvent.clientX - start.x;
    const dy = e.nativeEvent.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_THRESHOLD_PX) return;

    const gridPos = worldToGrid(e.point.x, e.point.z, width, height, cellSize);
    placeInteriorAt(gridPos);
  };

  const w = width * cellSize;
  const d = height * cellSize;

  const lineGeometry = useMemo(() => {
    const points: number[] = [];
    const halfW = w / 2;
    const halfD = d / 2;
    for (let i = 0; i <= width; i++) {
      const x = -halfW + i * cellSize;
      points.push(x, 0, -halfD, x, 0, halfD);
    }
    for (let j = 0; j <= height; j++) {
      const z = -halfD + j * cellSize;
      points.push(-halfW, 0, z, halfW, 0, z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, [width, height, cellSize, w, d]);

  const backroomWorld = gridToWorld(BACKROOM_POS, width, height, cellSize);
  const wallHeight = 1.6;
  const halfW = w / 2;
  const halfD = d / 2;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        receiveShadow
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#d8cdb8" />
      </mesh>
      <lineSegments geometry={lineGeometry} position={[0, 0.01, 0]} raycast={() => null}>
        <lineBasicMaterial color="#a89a7c" transparent opacity={0.6} />
      </lineSegments>

      {/* Back + side walls for spatial framing, front stays open toward the camera */}
      <mesh position={[0, wallHeight / 2, -halfD]} raycast={() => null}>
        <boxGeometry args={[w, wallHeight, 0.2]} />
        <meshStandardMaterial color="#efe6d3" />
      </mesh>
      <mesh position={[-halfW, wallHeight / 2, 0]} raycast={() => null}>
        <boxGeometry args={[0.2, wallHeight, d]} />
        <meshStandardMaterial color="#efe6d3" />
      </mesh>
      <mesh position={[halfW, wallHeight / 2, 0]} raycast={() => null}>
        <boxGeometry args={[0.2, wallHeight, d]} />
        <meshStandardMaterial color="#efe6d3" />
      </mesh>

      {/* Stockroom door marker */}
      <mesh position={[backroomWorld[0], 0.03, backroomWorld[2]]} raycast={() => null}>
        <boxGeometry args={[1.9, 0.05, 1.9]} />
        <meshStandardMaterial color="#5a5248" />
      </mesh>
    </group>
  );
}
