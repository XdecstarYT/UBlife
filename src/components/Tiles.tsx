import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3(1, 1, 1);

export function Tiles() {
  const tiles = useGameStore((s) => s.tiles);
  const gridWidth = useGameStore((s) => s.gridWidth);
  const gridHeight = useGameStore((s) => s.gridHeight);
  const cellSize = useGameStore((s) => s.cellSize);

  const maxTiles = gridWidth * gridHeight;
  const roadRef = useRef<THREE.InstancedMesh>(null);
  const houseRef = useRef<THREE.InstancedMesh>(null);

  const { roadCells, houseCells } = useMemo(() => {
    const roads: [number, number][] = [];
    const houses: [number, number][] = [];
    for (const [key, type] of Object.entries(tiles)) {
      const [x, y] = key.split(',').map(Number);
      if (type === 'road') roads.push([x, y]);
      else if (type === 'residential') houses.push([x, y]);
    }
    return { roadCells: roads, houseCells: houses };
  }, [tiles]);

  useLayoutEffect(() => {
    const mesh = roadRef.current;
    if (!mesh) return;
    roadCells.forEach(([x, y], i) => {
      const [wx, , wz] = gridToWorld({ x, y }, gridWidth, gridHeight, cellSize);
      tmpPos.set(wx, 0.02, wz);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
    });
    mesh.count = roadCells.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [roadCells, gridWidth, gridHeight, cellSize]);

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

  return (
    <group>
      <instancedMesh ref={roadRef} args={[undefined, undefined, maxTiles]} raycast={() => null}>
        <boxGeometry args={[1.9, 0.05, 1.9]} />
        <meshStandardMaterial color="#4a4a4a" />
      </instancedMesh>
      <instancedMesh ref={houseRef} args={[undefined, undefined, maxTiles]} raycast={() => null}>
        <boxGeometry args={[1.1, 0.8, 1.1]} />
        <meshStandardMaterial color="#c97b4a" />
      </instancedMesh>
    </group>
  );
}
