import type { GridPos } from './types';

/** Converts a grid cell to a world-space position, centering the grid at the origin. */
export function gridToWorld(
  pos: GridPos,
  gridWidth: number,
  gridHeight: number,
  cellSize: number
): [number, number, number] {
  const originX = -((gridWidth - 1) * cellSize) / 2;
  const originZ = -((gridHeight - 1) * cellSize) / 2;
  return [originX + pos.x * cellSize, 0, originZ + pos.y * cellSize];
}

/** Converts a world-space X/Z coordinate back to the nearest grid cell. */
export function worldToGrid(
  worldX: number,
  worldZ: number,
  gridWidth: number,
  gridHeight: number,
  cellSize: number
): GridPos {
  const originX = -((gridWidth - 1) * cellSize) / 2;
  const originZ = -((gridHeight - 1) * cellSize) / 2;
  return {
    x: Math.round((worldX - originX) / cellSize),
    y: Math.round((worldZ - originZ) / cellSize),
  };
}
