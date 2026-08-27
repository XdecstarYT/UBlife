// Shared grid-based world model: the single data structure that underpins
// zoning, buildings, and the supply route (trucks travel along road tiles).

export type TileType = 'empty' | 'road' | 'residential';

export type TileKey = string; // `${x},${y}`

export interface GridPos {
  x: number;
  y: number;
}

export type TruckPhase = 'idle' | 'to-store' | 'to-warehouse' | 'blocked';

export interface TruckState {
  phase: TruckPhase;
  /** World-space waypoints for the current leg, warehouse -> store or reverse. */
  path: GridPos[];
  /** Index of the waypoint the truck just left. */
  segmentIndex: number;
  /** 0..1 progress along the current segment. */
  segmentT: number;
  cargo: number;
}

export type CustomerPhase = 'entering' | 'leaving-happy' | 'leaving-sad';

export interface CustomerState {
  id: number;
  phase: CustomerPhase;
  path: GridPos[];
  segmentIndex: number;
  segmentT: number;
}

export type PlaceMode = 'select' | 'road' | 'residential' | 'bulldoze';

export interface GameState {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;

  tiles: Record<TileKey, TileType>;
  warehousePos: GridPos;
  storePos: GridPos;

  mode: PlaceMode;

  money: number;
  stock: number;
  maxStock: number;
  pricePerItem: number;
  deliveryCapacity: number;
  truckSpeed: number; // tiles per second

  happiness: number; // 0..100

  truck: TruckState;
  customers: CustomerState[];
  nextCustomerId: number;
  customerSpawnTimer: number;

  hasRoute: boolean;
}
