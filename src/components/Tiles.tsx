import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';
import { tileKey } from '../game/pathfinding';
import { getAsphaltTexture } from '../game/proceduralTextures';

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3(1, 1, 1);
const tmpColor = new THREE.Color();

const LOAD_FREE = new THREE.Color('#ffffff');
const LOAD_BUSY = new THREE.Color('#ffd97a');
const LOAD_CONGESTED = new THREE.Color('#ff8a78');

export function Tiles() {
  const tiles = useGameStore((s) => s.tiles);
  const gridWidth = useGameStore((s) => s.gridWidth);
  const gridHeight = useGameStore((s) => s.gridHeight);
  const cellSize = useGameStore((s) => s.cellSize);

  const maxTiles = gridWidth * gridHeight;
  const roadRef = useRef<THREE.InstancedMesh>(null);
  const railRef = useRef<THREE.InstancedMesh>(null);
  const houseRef = useRef<THREE.InstancedMesh>(null);

  const { roadCells, railCells, houseCells } = useMemo(() => {
    const roads: [number, number][] = [];
    const rails: [number, number][] = [];
    const houses: [number, number][] = [];
    for (const [key, type] of Object.entries(tiles)) {
      const [x, y] = key.split(',').map(Number);
      if (type === 'road') roads.push([x, y]);
      else if (type === 'rail') rails.push([x, y]);
      else if (type === 'residential') houses.push([x, y]);
    }
    return { roadCells: roads, railCells: rails, houseCells: houses };
  }, [tiles]);

  const roadCellsRef = useRef<[number, number][]>([]);
  useEffect(() => {
    roadCellsRef.current = roadCells;
  }, [roadCells]);

  useLayoutEffect(() => {
    const mesh = roadRef.current;
    if (!mesh) return;
    roadCells.forEach(([x, y], i) => {
      const [wx, , wz] = gridToWorld({ x, y }, gridWidth, gridHeight, cellSize);
      tmpPos.set(wx, 0.02, wz);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, LOAD_FREE);
    });
    mesh.count = roadCells.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [roadCells, gridWidth, gridHeight, cellSize]);

  useLayoutEffect(() => {
    const mesh = railRef.current;
    if (!mesh) return;
    railCells.forEach(([x, y], i) => {
      const [wx, , wz] = gridToWorld({ x, y }, gridWidth, gridHeight, cellSize);
      tmpPos.set(wx, 0.03, wz);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
    });
    mesh.count = railCells.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [railCells, gridWidth, gridHeight, cellSize]);

  useLayoutEffect(() => {
    const mesh = houseRef.current;
    if (!mesh) return;
    houseCells.forEach(([x, y], i) => {
      const [wx, , wz] = gridToWorld({ x, y }, gridWidth, gridHeight, cellSize);
      tmpPos.set(wx, 0.4, wz);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
    });
    mesh.count = houseCells.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [houseCells, gridWidth, gridHeight, cellSize]);

  // Tint road tiles by current congestion (recomputed every simulation tick).
  useFrame(() => {
    const mesh = roadRef.current;
    if (!mesh) return;
    const { roadLoad } = useGameStore.getState();
    const cells = roadCellsRef.current;
    cells.forEach(([x, y], i) => {
      const load = roadLoad[tileKey(x, y)] ?? 0;
      const color = load <= 1 ? LOAD_FREE : load === 2 ? LOAD_BUSY : LOAD_CONGESTED;
      tmpColor.copy(color);
      mesh.setColorAt(i, tmpColor);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={roadRef} args={[undefined, undefined, maxTiles]} raycast={() => null} receiveShadow>
        <boxGeometry args={[1.9, 0.05, 1.9]} />
        <meshStandardMaterial map={getAsphaltTexture()} roughness={0.85} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={railRef} args={[undefined, undefined, maxTiles]} raycast={() => null} receiveShadow>
        <boxGeometry args={[1.9, 0.07, 1.9]} />
        <meshStandardMaterial color="#8f7c5c" roughness={0.85} metalness={0.15} />
      </instancedMesh>
      <instancedMesh ref={houseRef} args={[undefined, undefined, maxTiles]} raycast={() => null} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.8, 1.1]} />
        <meshStandardMaterial color="#c97b4a" roughness={0.75} metalness={0} />
      </instancedMesh>
    </group>
  );
}
