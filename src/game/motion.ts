import type { GridPos } from './types';

/**
 * Advances an entity a fixed speed along a polyline of grid waypoints.
 * Shared by the delivery truck, shoppers, and store staff — all three are
 * "walk this path at this speed" the same way, just at different scales.
 */
export function advanceAlongPath(
  path: GridPos[],
  segmentIndex: number,
  segmentT: number,
  speedTilesPerSec: number,
  dt: number
): { segmentIndex: number; segmentT: number; arrived: boolean } {
  if (path.length < 2) return { segmentIndex, segmentT, arrived: true };

  let idx = segmentIndex;
  let t = segmentT + dt * speedTilesPerSec;

  while (idx < path.length - 1 && t >= 1) {
    t -= 1;
    idx += 1;
  }

  if (idx >= path.length - 1) {
    return { segmentIndex: path.length - 2, segmentT: 1, arrived: true };
  }
  return { segmentIndex: idx, segmentT: t, arrived: false };
}
