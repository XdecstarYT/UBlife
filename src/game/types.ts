// Shared grid-based world model: the single data structure that underpins
// zoning, buildings, and the supply route (trucks travel along road tiles).

export type TileType = 'empty' | 'road' | 'rail' | 'residential' | 'commercial' | 'industrial';

export type TileKey = string; // `${x},${y}`

export interface GridPos {
  x: number;
  y: number;
}

export type TruckPhase = 'idle' | 'to-store' | 'to-warehouse' | 'blocked';
export type VehicleMode = 'truck' | 'train';

export interface TruckState {
  phase: TruckPhase;
  /** World-space waypoints for the current leg, warehouse -> store or reverse. */
  path: GridPos[];
  /** Index of the waypoint the truck just left. */
  segmentIndex: number;
  /** 0..1 progress along the current segment. */
  segmentT: number;
  cargo: number;
  /** Truck (road, congestion-affected) or train (rail, faster, immune to congestion). */
  mode: VehicleMode;
}

export type PlaceMode =
  | 'select'
  | 'road'
  | 'rail'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'bulldoze';

// --- Phase 3: full zoning, multi-store logistics ---

export interface SatelliteStore {
  id: number;
  pos: GridPos;
  stock: number;
  capacity: number;
  /** Warehouse currently supplying this store: -1 = original warehouse, >0 = a satellite warehouse id, null = none found. */
  warehouseId: number | null;
  vehicle: TruckState;
  hasRoute: boolean;
}

export interface SatelliteWarehouse {
  id: number;
  pos: GridPos;
}

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
  /** Seconds of active work accumulated — drives level. */
  experience: number;
  /** 1..5, derived from experience; improves batch size / service bonus. */
  level: number;
  /** 0..100; hits 0 and the employee quits. */
  morale: number;
  /** Extra wage/sec granted by raises, on top of the role's base wage. */
  wageBonus: number;
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
  /** 0 = the flagship store; otherwise a SatelliteStore id. */
  targetStoreId: number;
}

// --- Business depth: finance, marketing, competition ---

export type CampaignKind = 'flyer' | 'radio';

export interface ActiveCampaign {
  kind: CampaignKind;
  remaining: number;
  spawnMultiplier: number;
}

export interface DaySummary {
  day: number;
  revenue: number;
  wages: number;
  interest: number;
  marketing: number;
  netWorth: number;
}

export type RivalStance = 'low' | 'normal' | 'high';

export interface Rival {
  id: number;
  name: string;
  stance: RivalStance;
  /** 0..100, random-walks day to day — how well-stocked they currently are. */
  stockLevel: number;
}

export interface GameNotification {
  id: number;
  text: string;
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

  // --- Phase 3: zoning-grown satellite stores/warehouses + logistics ---
  satelliteStores: SatelliteStore[];
  satelliteWarehouses: SatelliteWarehouse[];
  nextSatelliteStoreId: number;
  nextSatelliteWarehouseId: number;
  /** Concurrent-route load per road tile this tick, for congestion + visualization. */
  roadLoad: Record<TileKey, number>;

  // --- Business depth: finance ---
  loanBalance: number;
  dayNumber: number;
  dayTimer: number;
  dayAccumulators: { revenue: number; wages: number; marketing: number };
  financeHistory: DaySummary[];
  netWorthHistory: number[];

  // --- Business depth: marketing ---
  reputation: number; // 0..100, a slow-moving trailing average of happiness
  activeCampaign: ActiveCampaign | null;

  // --- Business depth: employees ---
  // (StaffMember itself carries experience/level/morale/wageBonus)

  // --- Business depth: competition ---
  rivals: Rival[];
  lostSalesToday: number;

  // --- Business depth: notifications ---
  notifications: GameNotification[];
  nextNotificationId: number;

  // --- Phase 4: virality layer ---
  /** Milestone id -> achieved. */
  milestones: Record<string, boolean>;
  /** Labels of newly-achieved milestones waiting for their camera-pan moment. */
  celebrationQueue: string[];
  activeCelebration: { id: string; label: string; remaining: number } | null;
}
