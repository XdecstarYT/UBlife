import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';

const MAX_CUSTOMERS = 48;
const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScaleVisible = new THREE.Vector3(1, 1, 1);
const tmpScaleHidden = new THREE.Vector3(0, 0, 0);

const happyColor = new THREE.Color('#f5c542');
const sadColor = new THREE.Color('#8a8a8a');

export function Customers() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { customers, gridWidth, gridHeight, cellSize } = useGameStore.getState();

    customers.forEach((c, i) => {
      if (i >= MAX_CUSTOMERS) return;
      const a = c.path[c.segmentIndex];
      const b = c.path[Math.min(c.segmentIndex + 1, c.path.length - 1)];
      const [ax, , az] = gridToWorld(a, gridWidth, gridHeight, cellSize);
      const [bx, , bz] = gridToWorld(b, gridWidth, gridHeight, cellSize);
      const x = THREE.MathUtils.lerp(ax, bx, c.segmentT);
      const z = THREE.MathUtils.lerp(az, bz, c.segmentT);
      tmpPos.set(x, 0.3, z);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScaleVisible);
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, c.phase === 'leaving-sad' ? sadColor : happyColor);
    });

    for (let i = customers.length; i < MAX_CUSTOMERS; i++) {
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScaleHidden);
      mesh.setMatrixAt(i, tmpMatrix);
    }

    mesh.count = Math.min(customers.length, MAX_CUSTOMERS);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_CUSTOMERS]} raycast={() => null}>
      <capsuleGeometry args={[0.18, 0.35, 4, 6]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
