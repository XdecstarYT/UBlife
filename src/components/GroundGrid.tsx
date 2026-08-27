import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { worldToGrid } from '../game/grid';
import { getGrassTexture } from '../game/proceduralTextures';

const TAP_THRESHOLD_PX = 6;

export function GroundGrid() {
  const gridWidth = useGameStore((s) => s.gridWidth);
  const gridHeight = useGameStore((s) => s.gridHeight);
  const cellSize = useGameStore((s) => s.cellSize);
  const placeAt = useGameStore((s) => s.placeAt);

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
    if (Math.hypot(dx, dy) > TAP_THRESHOLD_PX) return; // was a drag/orbit, not a tap

    const gridPos = worldToGrid(e.point.x, e.point.z, gridWidth, gridHeight, cellSize);
    placeAt(gridPos);
  };

  const width = gridWidth * cellSize;
  const depth = gridHeight * cellSize;
  const grassTexture = useMemo(() => getGrassTexture(Math.max(gridWidth, gridHeight)), [gridWidth, gridHeight]);

  const lineGeometry = useMemo(() => {
    const points: number[] = [];
    const halfW = width / 2;
    const halfD = depth / 2;
    for (let i = 0; i <= gridWidth; i++) {
      const x = -halfW + i * cellSize;
      points.push(x, 0, -halfD, x, 0, halfD);
    }
    for (let j = 0; j <= gridHeight; j++) {
      const z = -halfD + j * cellSize;
      points.push(-halfW, 0, z, halfW, 0, z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, [gridWidth, gridHeight, cellSize, width, depth]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={grassTexture} roughness={0.95} metalness={0} />
      </mesh>
      <lineSegments geometry={lineGeometry} position={[0, 0.01, 0]} raycast={() => null}>
        <lineBasicMaterial color="#3f6b34" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}
