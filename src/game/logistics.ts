import type { GameState, GridPos, TileKey, TileType, TruckState, VehicleMode } from './types';
import { findPath, tileKey } from './pathfinding';
import { CONGESTION_FACTOR, DELIVERY_CAPACITY, TRAIN_CAPACITY, TRAIN_SPEED, TRUCK_SPEED } from './constants';

export interface WarehouseCandidate {
  /** -1 = the original fixed warehouse; positive = a satellite warehouse id. */
  id: number;
  pos: GridPos;
}

export function warehouseCandidates(state: GameState): WarehouseCandidate[] {
  return [
    { id: -1, pos: state.warehousePos },
    ...state.satelliteWarehouses.map((w) => ({ id: w.id, pos: w.pos })),
  ];
}

interface RouteMatch {
  warehouseId: number;
  path: GridPos[];
}

function shortestAmong(
  tiles: Record<TileKey, TileType>,
  storePos: GridPos,
  candidates: WarehouseCandidate[],
  width: number,
  height: number,
  walkableType: TileType
): RouteMatch | null {
  let best: RouteMatch | null = null;
  for (const candidate of candidates) {
    const path = findPath(tiles, candidate.pos, storePos, width, height, walkableType);
    if (path && (!best || path.length < best.path.length)) {
      best = { warehouseId: candidate.id, path };
    }
  }
  return best;
}

/**
 * Picks the store's supplying warehouse: prefer any rail-connected candidate
 * (fastest, congestion-immune — the "trucks to trains" upgrade), falling
 * back to the nearest road-connected one. Null if nothing reaches at all.
 */
export function findBestRoute(
  tiles: Record<TileKey, TileType>,
  storePos: GridPos,
  candidates: WarehouseCandidate[],
  width: number,
  height: number
): { warehouseId: number; path: GridPos[]; mode: VehicleMode } | null {
  const rail = shortestAmong(tiles, storePos, candidates, width, height, 'rail');
  if (rail) return { ...rail, mode: 'train' };
  const road = shortestAmong(tiles, storePos, candidates, width, height, 'road');
  if (road) return { ...road, mode: 'truck' };
  return null;
}

/** How many active truck routes currently share each road tile — trains don't count, they don't share the road. */
export function computeRoadLoad(state: GameState): Record<TileKey, number> {
  const load: Record<TileKey, number> = {};
  const register = (vehicle: TruckState) => {
    if (vehicle.mode !== 'truck') return;
    if (vehicle.phase !== 'to-store' && vehicle.phase !== 'to-warehouse') return;
    for (const pos of vehicle.path) {
      const key = tileKey(pos.x, pos.y);
      if (state.tiles[key] === 'road') load[key] = (load[key] ?? 0) + 1;
    }
  };
  register(state.truck);
  for (const store of state.satelliteStores) register(store.vehicle);
  return load;
}

/** 1.0 with no competing traffic, falling off as more routes share the truck's current tile. Trains are immune. */
export function congestionSpeedMultiplier(
  vehicle: TruckState,
  tiles: Record<TileKey, TileType>,
  roadLoad: Record<TileKey, number>
): number {
  if (vehicle.mode !== 'truck') return 1;
  const pos = vehicle.path[vehicle.segmentIndex];
  if (!pos) return 1;
  const key = tileKey(pos.x, pos.y);
  if (tiles[key] !== 'road') return 1;
  const load = roadLoad[key] ?? 1;
  return 1 / (1 + CONGESTION_FACTOR * Math.max(0, load - 1));
}

export function vehicleBaseSpeed(mode: VehicleMode): number {
  return mode === 'train' ? TRAIN_SPEED : TRUCK_SPEED;
}

export function vehicleCapacity(mode: VehicleMode): number {
  return mode === 'train' ? TRAIN_CAPACITY : DELIVERY_CAPACITY;
}
