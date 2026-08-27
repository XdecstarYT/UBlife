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
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[1.8, 1.8, 1.8]} />
          <meshStandardMaterial color="#7c6a52" />
        </mesh>
        <mesh position={[0, 1.85, 0]}>
          <coneGeometry args={[1.4, 0.6, 4]} />
          <meshStandardMaterial color="#5a4c3a" />
        </mesh>
      </group>

      {/* Store */}
      <group position={storeWorld}>
        <mesh
          position={[0, 0.75, 0]}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            setView('store');
          }}
        >
          <boxGeometry args={[1.8, 1.5, 1.8]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[2, 0.15, 2]} />
          <meshStandardMaterial color="#f2f2f2" />
        </mesh>
        {/* Stock indicator bar */}
        <mesh position={[0, 1.9, 0]}>
          <boxGeometry args={[1.6, 0.12, 0.12]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh
          position={[-0.8 + (1.6 * stockRatio) / 2, 1.9, 0.13]}
          scale={[Math.max(stockRatio, 0.001), 1, 1]}
        >
          <boxGeometry args={[1.6, 0.12, 0.02]} />
          <meshStandardMaterial color={stockRatio > 0.25 ? '#4caf50' : '#e0433a'} />
        </mesh>
      </group>
    </group>
  );
}
