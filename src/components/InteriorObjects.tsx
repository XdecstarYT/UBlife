import { useGameStore } from '../store/gameStore';
import { gridToWorld } from '../game/grid';
import { keyToPos } from '../game/pathfinding';
import { CATEGORIES } from '../game/retail';

export function InteriorObjects() {
  const interiorTiles = useGameStore((s) => s.interiorTiles);
  const width = useGameStore((s) => s.interiorWidth);
  const height = useGameStore((s) => s.interiorHeight);
  const cellSize = useGameStore((s) => s.interiorCellSize);

  return (
    <group>
      {Object.entries(interiorTiles).map(([key, tile]) => {
        const pos = keyToPos(key);
        const [wx, , wz] = gridToWorld(pos, width, height, cellSize);

        if (tile.type === 'shelf' && tile.shelf) {
          const ratio = tile.shelf.capacity > 0 ? tile.shelf.stock / tile.shelf.capacity : 0;
          const color = CATEGORIES[tile.shelf.category].color;
          return (
            <group key={key} position={[wx, 0, wz]}>
              <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[1.7, 1, 0.6]} />
                <meshStandardMaterial color="#8c6a45" />
              </mesh>
              <mesh position={[0, 0.72, 0.35]} scale={[Math.max(ratio, 0.001), 1, 1]}>
                <boxGeometry args={[1.5, 0.35, 0.15]} />
                <meshStandardMaterial color={color} />
              </mesh>
            </group>
          );
        }

        if (tile.type === 'checkout') {
          return (
            <group key={key} position={[wx, 0, wz]}>
              <mesh position={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[1.5, 0.8, 0.7]} />
                <meshStandardMaterial color="#e0e0e0" />
              </mesh>
              <mesh position={[0, 0.85, -0.15]}>
                <boxGeometry args={[0.15, 0.9, 0.15]} />
                <meshStandardMaterial color="#333" />
              </mesh>
            </group>
          );
        }

        // decor
        return (
          <group key={key} position={[wx, 0, wz]}>
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.35, 0.4, 0.1, 8]} />
              <meshStandardMaterial color="#7a5a3a" />
            </mesh>
            <mesh position={[0, 0.45, 0]} castShadow>
              <coneGeometry args={[0.4, 0.8, 8]} />
              <meshStandardMaterial color="#4a8f4a" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
