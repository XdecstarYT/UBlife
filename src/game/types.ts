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

export type PlaceMode = 'select' | 'road' | 'residential' | 'bulldoze';

export type View = 'city' | 'store';

// --- Phase 2: retail depth ---

export type ProductCategory = 'grocery' | 'electronics' | 'clothing';

export type PriceLevel = 'low' | 'normal' | 'high';

export type StoreType = 'general' | 'boutique';

export type InteriorItemType = 'shelf' | 'checkout' | 'decor';

export interface ShelfContents {
  category: ProductCategory;
  stock: number;
  capacity: number;
}

export interface InteriorTile {
  type: InteriorItemType;
  shelf?: ShelfContents; // present iff type === 'shelf'
}

export type InteriorPlaceMode =
  | 'select'
  | 'shelf-grocery'
  | 'shelf-electronics'
  | 'shelf-clothing'
  | 'checkout'
  | 'decor'
  | 'bulldoze';

export type StaffRole = 'stocker' | 'cashier';
export type StaffTask = 'idle' | 'walking' | 'working';

export interface StaffMember {
  id: number;
  role: StaffRole;
  path: GridPos[];
  segmentIndex: number;
  segmentT: number;
  task: StaffTask;
  /** Stocker: shelf tile key currently targeted. Cashier: checkout tile key claimed. */
  targetKey: string | null;
  workTimer: number;
}

export type CustomerPhase = 'entering' | 'waiting' | 'leaving-happy' | 'leaving-sad';

export interface CustomerState {
  id: number;
  phase: CustomerPhase;
  path: GridPos[];
  segmentIndex: number;
  segmentT: number;
  category: ProductCategory;
  patience: number;
}

export interface GameState {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;

  tiles: Record<TileKey, TileType>;
  warehousePos: GridPos;
  storePos: GridPos;

  mode: PlaceMode;
  view: View;

  money: number;
  /** Derived each tick from shelf contents — total units on display / total shelf capacity. */
  stock: number;
  maxStock: number;
  deliveryCapacity: number;
  truckSpeed: number; // tiles per second

  happiness: number; // 0..100

  truck: TruckState;
  customers: CustomerState[];
  nextCustomerId: number;
  customerSpawnTimer: number;

  hasRoute: boolean;

  // --- Store interior ---
  interiorWidth: number;
  interiorHeight: number;
  interiorCellSize: number;
  interiorTiles: Record<TileKey, InteriorTile>;
  interiorMode: InteriorPlaceMode;
  storeType: StoreType;
  priceTiers: Record<ProductCategory, PriceLevel>;

  /** Goods delivered by the truck, waiting to be shelved. */
  backroomStock: number;
  backroomCapacity: number;

  staff: StaffMember[];
  nextStaffId: number;

  /** Seconds until the checkout can serve another customer. */
  checkoutCooldown: number;
}
