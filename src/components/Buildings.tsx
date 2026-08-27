import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';
import { STORE_TYPES } from '../game/retail';
import { findCheckoutKeys } from '../game/interior';

export function Buildings() {
  const warehousePos = useGameStore((s) => s.warehousePos);
  const storePos = useGameStore((s) => s.storePos);
  const gridWidth = useGameStore((s) => s.gridWidth);
  const gridHeight = useGameStore((s) => s.gridHeight);
  const cellSize = useGameStore((s) => s.cellSize);
  const stock = useGameStore((s) => s.stock);
  const maxStock = useGameStore((s) => s.maxStock);
  const storeType = useGameStore((s) => s.storeType);
  const hasCheckout = useGameStore((s) => findCheckoutKeys(s.interiorTiles).length > 0);
  const setView = useGameStore((s) => s.setView);

  const warehouseWorld = gridToWorld(warehousePos, gridWidth, gridHeight, cellSize);
  const storeWorld = gridToWorld(storePos, gridWidth, gridHeight, cellSize);
  const stockRatio = maxStock > 0 ? stock / maxStock : 0;
  const wallColor = hasCheckout ? STORE_TYPES[storeType].wallColor : '#8a8a8a';

  return (
    <group>
      {/* Warehouse */}
      <group position={warehouseWorld}>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 1.8, 1.8]} />
          <meshStandardMaterial color="#7c6a52" roughness={0.6} metalness={0.35} />
        </mesh>
        <mesh position={[0, 1.85, 0]} castShadow>
          <coneGeometry args={[1.4, 0.6, 4]} />
          <meshStandardMaterial color="#5a4c3a" roughness={0.55} metalness={0.3} />
        </mesh>
      </group>

      {/* Store */}
      <group position={storeWorld}>
        <mesh
          position={[0, 0.75, 0]}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            setView('store');
          }}
        >
          <boxGeometry args={[1.8, 1.5, 1.8]} />
          <meshStandardMaterial color={wallColor} roughness={0.55} metalness={0.05} />
        </mesh>
        {/* Storefront glass */}
        <mesh position={[0, 0.7, 0.91]}>
          <boxGeometry args={[1.3, 0.7, 0.02]} />
          <meshPhysicalMaterial
            color="#bcdcec"
            roughness={0.05}
            metalness={0}
            transmission={0.85}
            thickness={0.15}
            ior={1.4}
          />
        </mesh>
        <mesh position={[0, 1.55, 0]} castShadow>
          <boxGeometry args={[2, 0.15, 2]} />
          <meshStandardMaterial color="#f2f2f2" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Stock indicator bar */}
        <mesh position={[0, 1.9, 0]}>
          <boxGeometry args={[1.6, 0.12, 0.12]} />
          <meshStandardMaterial color="#333" roughness={0.4} metalness={0.1} />
        </mesh>
        <mesh
          position={[-0.8 + (1.6 * stockRatio) / 2, 1.9, 0.13]}
          scale={[Math.max(stockRatio, 0.001), 1, 1]}
        >
          <boxGeometry args={[1.6, 0.12, 0.02]} />
          <meshStandardMaterial
            color={stockRatio > 0.25 ? '#4caf50' : '#e0433a'}
            emissive={stockRatio > 0.25 ? '#1c5c22' : '#5c1a15'}
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}
