import type { GridPos, TileKey, TileType } from './types';

export function tileKey(x: number, y: number): TileKey {
  return `${x},${y}`;
}

export function keyToPos(key: TileKey): GridPos {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

const NEIGHBOR_OFFSETS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/**
 * BFS over tiles of a given type (plus the two endpoints themselves) to
 * find a connected path. Returns grid positions from `from` to `to`, or
 * null if they aren't connected by contiguous tiles of that type. Used for
 * both road (truck) and rail (train) routing — same graph search, different
 * walkable tile type.
 */
export function findPath(
  tiles: Record<TileKey, TileType>,
  from: GridPos,
  to: GridPos,
  width: number,
  height: number,
  walkableType: TileType
): GridPos[] | null {
  const isWalkable = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    if ((x === from.x && y === from.y) || (x === to.x && y === to.y)) return true;
    return tiles[tileKey(x, y)] === walkableType;
  };

  const startKey = tileKey(from.x, from.y);
  const goalKey = tileKey(to.x, to.y);
  if (startKey === goalKey) return [from];

  const visited = new Set<TileKey>([startKey]);
  const cameFrom = new Map<TileKey, TileKey>();
  const queue: GridPos[] = [from];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const currentKey = tileKey(current.x, current.y);

    for (const offset of NEIGHBOR_OFFSETS) {
      const nx = current.x + offset.x;
      const ny = current.y + offset.y;
      const nKey = tileKey(nx, ny);
      if (visited.has(nKey) || !isWalkable(nx, ny)) continue;

      visited.add(nKey);
      cameFrom.set(nKey, currentKey);

      if (nKey === goalKey) {
        const path: GridPos[] = [{ x: nx, y: ny }];
        let walk = currentKey;
        while (walk !== startKey) {
          path.unshift(keyToPos(walk));
          walk = cameFrom.get(walk)!;
        }
        path.unshift(from);
        return path;
      }

      queue.push({ x: nx, y: ny });
    }
  }

  return null;
}

/** Convenience wrapper for the common case of routing over 'road' tiles. */
export function findRoadPath(
  tiles: Record<TileKey, TileType>,
  from: GridPos,
  to: GridPos,
  width: number,
  height: number
): GridPos[] | null {
  return findPath(tiles, from, to, width, height, 'road');
}
