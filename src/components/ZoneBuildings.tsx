import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';

export function ZoneBuildings() {
  const satelliteStores = useGameStore((s) => s.satelliteStores);
  const satelliteWarehouses = useGameStore((s) => s.satelliteWarehouses);
  const gridWidth = useGameStore((s) => s.gridWidth);
  const gridHeight = useGameStore((s) => s.gridHeight);
  const cellSize = useGameStore((s) => s.cellSize);

  return (
    <group>
      {satelliteWarehouses.map((w) => {
        const [wx, , wz] = gridToWorld(w.pos, gridWidth, gridHeight, cellSize);
        return (
          <group key={`wh-${w.id}`} position={[wx, 0, wz]}>
            <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.3, 1.2, 1.3]} />
              <meshStandardMaterial color="#8a7860" roughness={0.65} metalness={0.25} />
            </mesh>
            <mesh position={[0, 1.3, 0]} castShadow>
              <coneGeometry args={[1, 0.4, 4]} />
              <meshStandardMaterial color="#665842" roughness={0.6} metalness={0.2} />
            </mesh>
          </group>
        );
      })}

      {satelliteStores.map((store) => {
        const [wx, , wz] = gridToWorld(store.pos, gridWidth, gridHeight, cellSize);
        const stockRatio = store.capacity > 0 ? store.stock / store.capacity : 0;
        return (
          <group key={`st-${store.id}`} position={[wx, 0, wz]}>
            <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.4, 1.1, 1.4]} />
              <meshStandardMaterial color="#3d8f8a" roughness={0.55} metalness={0.05} />
            </mesh>
            <mesh position={[0, 1.15, 0]} castShadow>
              <boxGeometry args={[1.55, 0.12, 1.55]} />
              <meshStandardMaterial color="#f2f2f2" roughness={0.3} metalness={0.1} />
            </mesh>
            <mesh position={[0, 1.35, 0]}>
              <boxGeometry args={[1.1, 0.1, 0.1]} />
              <meshStandardMaterial color="#333" roughness={0.4} />
            </mesh>
            <mesh
              position={[-0.55 + (1.1 * stockRatio) / 2, 1.35, 0.06]}
              scale={[Math.max(stockRatio, 0.001), 1, 1]}
            >
              <boxGeometry args={[1.1, 0.1, 0.02]} />
              <meshStandardMaterial
                color={stockRatio > 0.25 ? '#4caf50' : '#e0433a'}
                emissive={stockRatio > 0.25 ? '#1c5c22' : '#5c1a15'}
                emissiveIntensity={0.4}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
