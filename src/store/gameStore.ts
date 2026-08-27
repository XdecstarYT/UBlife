import { create } from 'zustand';
import type {
  CustomerState,
  GameState,
  GridPos,
  InteriorPlaceMode,
  PlaceMode,
  PriceLevel,
  ProductCategory,
  SatelliteStore,
  StaffMember,
  StaffRole,
  StoreType,
  TileType,
  TruckState,
  View,
} from '../game/types';
import { findPath, tileKey, keyToPos } from '../game/pathfinding';
import { advanceAlongPath } from '../game/motion';
import {
  categoryShelfStock,
  findCheckoutKeys,
  pickNeediestShelf,
  pickShelfForCategory,
  totalShelfStock,
} from '../game/interior';
import { CATEGORIES, DEMAND_MULTIPLIER, PRICE_MULTIPLIER, PRICE_TIER_ORDER, STORE_TYPES, shelfCapacityFor } from '../game/retail';
import {
  congestionSpeedMultiplier,
  computeRoadLoad,
  findBestRoute,
  vehicleBaseSpeed,
  vehicleCapacity,
  warehouseCandidates,
} from '../game/logistics';
import {
  BACKROOM_CAPACITY,
  BACKROOM_POS,
  BASE_CHECKOUT_SERVICE_SECONDS,
  BASE_RESTOCK_TRICKLE,
  BASE_SPAWN_INTERVAL,
  CASHIER_HIRE_COST,
  CASHIER_SERVICE_BONUS_SECONDS,
  CASHIER_WAGE_PER_SEC,
  CELL_SIZE,
  CHECKOUT_COST,
  COMMERCIAL_COST,
  CUSTOMER_PATIENCE_SECONDS,
  CUSTOMER_SPEED,
  DECOR_COST,
  GRID_HEIGHT,
  GRID_WIDTH,
  HAPPINESS_DECAY_TOWARD_NEUTRAL,
  HAPPINESS_GAIN_ON_SALE,
  HAPPINESS_LOSS_ON_EMPTY,
  INDUSTRIAL_COST,
  INTERIOR_CELL_SIZE,
  INTERIOR_HEIGHT,
  INTERIOR_WIDTH,
  MIN_CHECKOUT_SERVICE_SECONDS,
  MIN_SPAWN_INTERVAL,
  RAIL_COST,
  ROAD_COST,
  RESIDENTIAL_COST,
  SATELLITE_HAPPINESS_GAIN,
  SATELLITE_HAPPINESS_LOSS,
  SATELLITE_PRICE,
  SATELLITE_STORE_CAPACITY,
  SHELF_COST,
  SPAWN_INTERVAL_PER_HOUSE,
  STAFF_SPEED,
  STARTING_MONEY,
  STOCKER_BATCH_SIZE,
  STOCKER_HIRE_COST,
  STOCKER_WAGE_PER_SEC,
  STOCKER_WORK_SECONDS,
  STORE_POS,
  WAREHOUSE_POS,
} from '../game/constants';

const SAVE_KEY = 'tradecity-save-v3';

interface GameActions {
  setMode: (mode: PlaceMode) => void;
  placeAt: (pos: GridPos) => void;
  setView: (view: View) => void;
  setInteriorMode: (mode: InteriorPlaceMode) => void;
  placeInteriorAt: (pos: GridPos) => void;
  setStoreType: (storeType: StoreType) => void;
  cyclePriceTier: (category: ProductCategory) => void;
  hireStaff: (role: StaffRole) => void;
  fireStaff: (id: number) => void;
  tick: (dt: number) => void;
  save: () => void;
  loadIfPresent: () => void;
  resetGame: () => void;
}

function initialTruck(): TruckState {
  return { phase: 'idle', path: [], segmentIndex: 0, segmentT: 0, cargo: 0, mode: 'truck' };
}

function newStaffMember(id: number, role: StaffRole): StaffMember {
  return { id, role, path: [], segmentIndex: 0, segmentT: 0, task: 'idle', targetKey: null, workTimer: 0 };
}

function starterInteriorTiles(): GameState['interiorTiles'] {
  const capacity = shelfCapacityFor('general');
  return {
    [tileKey(4, 3)]: { type: 'checkout' },
    [tileKey(2, 2)]: { type: 'shelf', shelf: { category: 'grocery', stock: 10, capacity } },
  };
}

function freshState(): GameState {
  const interiorTiles = starterInteriorTiles();
  const totals = totalShelfStock(interiorTiles);
  return {
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    cellSize: CELL_SIZE,
    tiles: {},
    warehousePos: WAREHOUSE_POS,
    storePos: STORE_POS,
    mode: 'road',
    view: 'city',
    money: STARTING_MONEY,
    stock: totals.stock,
    maxStock: totals.capacity,
    happiness: 70,
    truck: initialTruck(),
    customers: [],
    nextCustomerId: 1,
    customerSpawnTimer: BASE_SPAWN_INTERVAL,
    hasRoute: false,

    interiorWidth: INTERIOR_WIDTH,
    interiorHeight: INTERIOR_HEIGHT,
    interiorCellSize: INTERIOR_CELL_SIZE,
    interiorTiles,
    interiorMode: 'shelf-grocery',
    storeType: 'general',
    priceTiers: { grocery: 'normal', clothing: 'normal', electronics: 'normal' },

    backroomStock: 0,
    backroomCapacity: BACKROOM_CAPACITY,

    staff: [],
    nextStaffId: 1,

    checkoutCooldown: 0,

    satelliteStores: [],
    satelliteWarehouses: [],
    nextSatelliteStoreId: 1,
    nextSatelliteWarehouseId: 1,
    roadLoad: {},
  };
}

/** Flagship route: fixed warehouse<->store pair, but prefers a rail connection over road if one exists. */
function computeFlagshipRoute(state: GameState): { path: GridPos[]; mode: TruckState['mode'] } | null {
  const railPath = findPath(state.tiles, state.warehousePos, state.storePos, state.gridWidth, state.gridHeight, 'rail');
  if (railPath) return { path: railPath, mode: 'train' };
  const roadPath = findPath(state.tiles, state.warehousePos, state.storePos, state.gridWidth, state.gridHeight, 'road');
  if (roadPath) return { path: roadPath, mode: 'truck' };
  return null;
}

function recomputeRoute(state: GameState) {
  const route = computeFlagshipRoute(state);
  state.hasRoute = !!route;
  if (!route) {
    state.truck = initialTruck();
    return;
  }
  if (state.truck.phase === 'idle' || state.truck.phase === 'blocked') {
    state.truck = { ...initialTruck(), phase: 'to-store', path: route.path, cargo: 0, mode: route.mode };
  } else {
    const isOutbound = state.truck.phase === 'to-store';
    state.truck.path = isOutbound ? route.path : [...route.path].reverse();
    state.truck.mode = route.mode;
  }
}

/** Satellite store: connects to whichever warehouse (original or satellite) gives it the best route. */
function recomputeSatelliteRoute(state: GameState, store: SatelliteStore) {
  const best = findBestRoute(state.tiles, store.pos, warehouseCandidates(state), state.gridWidth, state.gridHeight);
  store.hasRoute = !!best;
  if (!best) {
    store.warehouseId = null;
    store.vehicle = initialTruck();
    return;
  }
  store.warehouseId = best.warehouseId;
  if (store.vehicle.phase === 'idle' || store.vehicle.phase === 'blocked') {
    store.vehicle = { ...initialTruck(), phase: 'to-store', path: best.path, cargo: 0, mode: best.mode };
  } else {
    const isOutbound = store.vehicle.phase === 'to-store';
    store.vehicle.path = isOutbound ? best.path : [...best.path].reverse();
    store.vehicle.mode = best.mode;
  }
}

function recomputeAllRoutes(state: GameState) {
  recomputeRoute(state);
  for (const store of state.satelliteStores) {
    recomputeSatelliteRoute(state, store);
  }
}

function warehousePosById(state: GameState, id: number | null): GridPos {
  if (id === null || id === -1) return state.warehousePos;
  return state.satelliteWarehouses.find((w) => w.id === id)?.pos ?? state.warehousePos;
}

function residentialCount(tiles: Record<string, TileType>): number {
  let count = 0;
  for (const t of Object.values(tiles)) if (t === 'residential') count++;
  return count;
}

/** Grid edge cell customers walk in from / out to, opposite the target store's own row. */
function edgePos(targetY: number): GridPos {
  return { x: 0, y: targetY === 0 ? 1 : 0 };
}

function storePosById(state: GameState, id: number): GridPos {
  if (id === 0) return state.storePos;
  return state.satelliteStores.find((s) => s.id === id)?.pos ?? state.storePos;
}

/** Weighted-random product category among what the current store type can carry (flagship customers only). */
function pickDesiredCategory(state: GameState): ProductCategory {
  const allowed = STORE_TYPES[state.storeType].allowedCategories;
  const weights = allowed.map(
    (cat) => CATEGORIES[cat].baseDemandWeight * DEMAND_MULTIPLIER[state.priceTiers[cat]]
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < allowed.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return allowed[i];
  }
  return allowed[allowed.length - 1];
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...freshState(),

  setMode: (mode) => set({ mode }),

  placeAt: (pos) => {
    const state = get();
    const { x, y } = pos;
    if (x < 0 || y < 0 || x >= state.gridWidth || y >= state.gridHeight) return;
    if (
      (x === state.warehousePos.x && y === state.warehousePos.y) ||
      (x === state.storePos.x && y === state.storePos.y)
    ) {
      return; // fixed lots aren't editable
    }

    const key = tileKey(x, y);
    const current = state.tiles[key] ?? 'empty';
    const mode = state.mode;
    let nextTiles = state.tiles;
    let moneyDelta = 0;

    if (mode === 'bulldoze') {
      if (current === 'empty') return;
      nextTiles = { ...state.tiles };
      delete nextTiles[key];
    } else if (mode === 'road') {
      if (current === 'road') return;
      if (current === 'rail' || current === 'commercial' || current === 'industrial') return;
      if (state.money < ROAD_COST) return;
      nextTiles = { ...state.tiles, [key]: 'road' };
      moneyDelta = -ROAD_COST;
    } else if (mode === 'rail') {
      if (current === 'rail') return;
      if (current === 'road' || current === 'commercial' || current === 'industrial') return;
      if (state.money < RAIL_COST) return;
      nextTiles = { ...state.tiles, [key]: 'rail' };
      moneyDelta = -RAIL_COST;
    } else if (mode === 'residential') {
      if (current !== 'empty') return;
      if (state.money < RESIDENTIAL_COST) return;
      nextTiles = { ...state.tiles, [key]: 'residential' };
      moneyDelta = -RESIDENTIAL_COST;
    } else if (mode === 'commercial') {
      if (current !== 'empty') return;
      if (state.money < COMMERCIAL_COST) return;
      nextTiles = { ...state.tiles, [key]: 'commercial' };
      moneyDelta = -COMMERCIAL_COST;
    } else if (mode === 'industrial') {
      if (current !== 'empty') return;
      if (state.money < INDUSTRIAL_COST) return;
      nextTiles = { ...state.tiles, [key]: 'industrial' };
      moneyDelta = -INDUSTRIAL_COST;
    } else {
      return;
    }

    set((s) => {
      const next: GameState = {
        ...s,
        tiles: nextTiles,
        money: s.money + moneyDelta,
        satelliteStores: s.satelliteStores.map((st) => ({ ...st, vehicle: { ...st.vehicle } })),
        satelliteWarehouses: [...s.satelliteWarehouses],
      };

      if (mode === 'bulldoze') {
        if (current === 'commercial') {
          next.satelliteStores = next.satelliteStores.filter((st) => !(st.pos.x === x && st.pos.y === y));
        } else if (current === 'industrial') {
          next.satelliteWarehouses = next.satelliteWarehouses.filter((w) => !(w.pos.x === x && w.pos.y === y));
        }
      } else if (mode === 'commercial') {
        next.satelliteStores = [
          ...next.satelliteStores,
          {
            id: next.nextSatelliteStoreId,
            pos: { x, y },
            stock: 0,
            capacity: SATELLITE_STORE_CAPACITY,
            warehouseId: null,
            vehicle: initialTruck(),
            hasRoute: false,
          },
        ];
        next.nextSatelliteStoreId += 1;
      } else if (mode === 'industrial') {
        next.satelliteWarehouses = [
          ...next.satelliteWarehouses,
          { id: next.nextSatelliteWarehouseId, pos: { x, y } },
        ];
        next.nextSatelliteWarehouseId += 1;
      }

      recomputeAllRoutes(next);
      return next;
    });
  },

  setView: (view) => set({ view }),
  setInteriorMode: (mode) => set({ interiorMode: mode }),

  placeInteriorAt: (pos) => {
    const state = get();
    const { x, y } = pos;
    if (x < 0 || y < 0 || x >= state.interiorWidth || y >= state.interiorHeight) return;
    if (x === BACKROOM_POS.x && y === BACKROOM_POS.y) return; // stockroom door stays clear

    const key = tileKey(x, y);
    const current = state.interiorTiles[key];
    const mode = state.interiorMode;
    let nextTiles = state.interiorTiles;
    let moneyDelta = 0;

    if (mode === 'bulldoze') {
      if (!current) return;
      nextTiles = { ...state.interiorTiles };
      delete nextTiles[key];
    } else if (mode === 'checkout') {
      if (current) return;
      if (state.money < CHECKOUT_COST) return;
      nextTiles = { ...state.interiorTiles, [key]: { type: 'checkout' } };
      moneyDelta = -CHECKOUT_COST;
    } else if (mode === 'decor') {
      if (current) return;
      if (state.money < DECOR_COST) return;
      nextTiles = { ...state.interiorTiles, [key]: { type: 'decor' } };
      moneyDelta = -DECOR_COST;
    } else if (mode.startsWith('shelf-')) {
      const category = mode.slice('shelf-'.length) as ProductCategory;
      if (!STORE_TYPES[state.storeType].allowedCategories.includes(category)) return;
      if (current) return;
      if (state.money < SHELF_COST) return;
      nextTiles = {
        ...state.interiorTiles,
        [key]: { type: 'shelf', shelf: { category, stock: 0, capacity: shelfCapacityFor(state.storeType) } },
      };
      moneyDelta = -SHELF_COST;
    } else {
      return;
    }

    set({ interiorTiles: nextTiles, money: state.money + moneyDelta });
  },

  setStoreType: (storeType) => set({ storeType }),

  cyclePriceTier: (category) =>
    set((s) => {
      const idx = PRICE_TIER_ORDER.indexOf(s.priceTiers[category]);
      const next: PriceLevel = PRICE_TIER_ORDER[(idx + 1) % PRICE_TIER_ORDER.length];
      return { priceTiers: { ...s.priceTiers, [category]: next } };
    }),

  hireStaff: (role) =>
    set((s) => {
      const cost = role === 'stocker' ? STOCKER_HIRE_COST : CASHIER_HIRE_COST;
      if (s.money < cost) return {};
      return {
        money: s.money - cost,
        staff: [...s.staff, newStaffMember(s.nextStaffId, role)],
        nextStaffId: s.nextStaffId + 1,
      };
    }),

  fireStaff: (id) => set((s) => ({ staff: s.staff.filter((m) => m.id !== id) })),

  tick: (dt) => {
    set((s) => {
      const next: GameState = {
        ...s,
        truck: { ...s.truck },
        customers: s.customers.map((c) => ({ ...c })),
        staff: s.staff.map((m) => ({ ...m })),
        satelliteStores: s.satelliteStores.map((st) => ({ ...st, vehicle: { ...st.vehicle } })),
      };

      // --- Congestion snapshot, taken before anything moves this tick ---
      const roadLoad = computeRoadLoad(next);
      next.roadLoad = roadLoad;

      // --- Flagship truck/train movement ---
      if (!next.hasRoute) {
        next.truck.phase = 'blocked';
      } else if (next.truck.phase === 'to-store' || next.truck.phase === 'to-warehouse') {
        const speed = vehicleBaseSpeed(next.truck.mode) * congestionSpeedMultiplier(next.truck, next.tiles, roadLoad);
        const { segmentIndex, segmentT, arrived } = advanceAlongPath(
          next.truck.path,
          next.truck.segmentIndex,
          next.truck.segmentT,
          speed,
          dt
        );
        next.truck.segmentIndex = segmentIndex;
        next.truck.segmentT = segmentT;

        if (arrived) {
          if (next.truck.phase === 'to-store') {
            next.backroomStock = Math.min(
              next.backroomCapacity,
              next.backroomStock + vehicleCapacity(next.truck.mode)
            );
            const returnPath = [...next.truck.path].reverse();
            next.truck = { ...initialTruck(), phase: 'to-warehouse', path: returnPath, mode: next.truck.mode };
          } else {
            const route = computeFlagshipRoute(next);
            next.truck = {
              phase: 'to-store',
              path: route?.path ?? [],
              segmentIndex: 0,
              segmentT: 0,
              cargo: route ? vehicleCapacity(route.mode) : 0,
              mode: route?.mode ?? next.truck.mode,
            };
            if (!route) next.hasRoute = false;
          }
        }
      }

      // --- Satellite truck/train movement (deliver straight to store stock, no backroom stage) ---
      for (const store of next.satelliteStores) {
        const vehicle = store.vehicle;
        if (!store.hasRoute) {
          vehicle.phase = 'blocked';
          continue;
        }
        if (vehicle.phase !== 'to-store' && vehicle.phase !== 'to-warehouse') continue;

        const speed = vehicleBaseSpeed(vehicle.mode) * congestionSpeedMultiplier(vehicle, next.tiles, roadLoad);
        const { segmentIndex, segmentT, arrived } = advanceAlongPath(
          vehicle.path,
          vehicle.segmentIndex,
          vehicle.segmentT,
          speed,
          dt
        );
        vehicle.segmentIndex = segmentIndex;
        vehicle.segmentT = segmentT;

        if (!arrived) continue;

        if (vehicle.phase === 'to-store') {
          store.stock = Math.min(store.capacity, store.stock + vehicleCapacity(vehicle.mode));
          const returnPath = [...vehicle.path].reverse();
          store.vehicle = { ...initialTruck(), phase: 'to-warehouse', path: returnPath, mode: vehicle.mode };
        } else {
          const warehousePos = warehousePosById(next, store.warehouseId);
          const freshPath = findPath(
            next.tiles,
            warehousePos,
            store.pos,
            next.gridWidth,
            next.gridHeight,
            vehicle.mode === 'train' ? 'rail' : 'road'
          );
          store.vehicle = {
            phase: 'to-store',
            path: freshPath ?? [],
            segmentIndex: 0,
            segmentT: 0,
            cargo: freshPath ? vehicleCapacity(vehicle.mode) : 0,
            mode: vehicle.mode,
          };
          if (!freshPath) store.hasRoute = false;
        }
      }

      // --- Baseline restock trickle (keeps the flagship playable with zero staff) ---
      if (next.backroomStock > 0) {
        const trickleKey = pickNeediestShelf(next.interiorTiles);
        if (trickleKey) {
          const tile = next.interiorTiles[trickleKey];
          const room = tile.shelf!.capacity - tile.shelf!.stock;
          const amount = Math.min(BASE_RESTOCK_TRICKLE * dt, room, next.backroomStock);
          if (amount > 0) {
            next.interiorTiles = {
              ...next.interiorTiles,
              [trickleKey]: { ...tile, shelf: { ...tile.shelf!, stock: tile.shelf!.stock + amount } },
            };
            next.backroomStock -= amount;
          }
        }
      }

      // --- Staff AI (flagship interior only) ---
      const claimedCheckouts = new Set(
        next.staff.filter((m) => m.role === 'cashier' && m.targetKey).map((m) => m.targetKey)
      );
      for (const member of next.staff) {
        if (member.role === 'stocker') {
          if (member.task === 'walking') {
            const { segmentIndex, segmentT, arrived } = advanceAlongPath(
              member.path,
              member.segmentIndex,
              member.segmentT,
              STAFF_SPEED,
              dt
            );
            member.segmentIndex = segmentIndex;
            member.segmentT = segmentT;
            if (arrived) {
              const last = member.path[member.path.length - 1];
              const atBackroom = last.x === BACKROOM_POS.x && last.y === BACKROOM_POS.y;
              if (atBackroom) {
                member.task = 'idle';
                member.targetKey = null;
              } else if (member.targetKey) {
                const tile = next.interiorTiles[member.targetKey];
                if (tile?.shelf && next.backroomStock > 0) {
                  const room = tile.shelf.capacity - tile.shelf.stock;
                  const amount = Math.min(STOCKER_BATCH_SIZE, room, Math.floor(next.backroomStock));
                  if (amount > 0) {
                    next.interiorTiles = {
                      ...next.interiorTiles,
                      [member.targetKey]: {
                        ...tile,
                        shelf: { ...tile.shelf, stock: tile.shelf.stock + amount },
                      },
                    };
                    next.backroomStock -= amount;
                  }
                }
                member.task = 'working';
                member.workTimer = STOCKER_WORK_SECONDS;
              }
            }
          } else if (member.task === 'working') {
            member.workTimer -= dt;
            if (member.workTimer <= 0) {
              member.path = [...member.path].reverse();
              member.segmentIndex = 0;
              member.segmentT = 0;
              member.task = 'walking';
            }
          } else if (next.backroomStock > 0) {
            const shelfKey = pickNeediestShelf(next.interiorTiles);
            if (shelfKey) {
              member.path = [BACKROOM_POS, keyToPos(shelfKey)];
              member.segmentIndex = 0;
              member.segmentT = 0;
              member.task = 'walking';
              member.targetKey = shelfKey;
            }
          }
        } else if (member.task === 'working') {
          // cashier parked at the register — walk back if its checkout got bulldozed.
          const stillValid = member.targetKey && next.interiorTiles[member.targetKey]?.type === 'checkout';
          if (!stillValid) {
            const lastPos = member.path[member.path.length - 1];
            member.path = [lastPos, BACKROOM_POS];
            member.segmentIndex = 0;
            member.segmentT = 0;
            member.task = 'walking';
            member.targetKey = null;
          }
        } else if (member.task === 'idle') {
          const openCheckout = findCheckoutKeys(next.interiorTiles).find((k) => !claimedCheckouts.has(k));
          if (openCheckout) {
            member.path = [BACKROOM_POS, keyToPos(openCheckout)];
            member.segmentIndex = 0;
            member.segmentT = 0;
            member.task = 'walking';
            member.targetKey = openCheckout;
            claimedCheckouts.add(openCheckout);
          }
        } else {
          // cashier walking
          const { segmentIndex, segmentT, arrived } = advanceAlongPath(
            member.path,
            member.segmentIndex,
            member.segmentT,
            STAFF_SPEED,
            dt
          );
          member.segmentIndex = segmentIndex;
          member.segmentT = segmentT;
          if (arrived) {
            const last = member.path[member.path.length - 1];
            const atBackroom = last.x === BACKROOM_POS.x && last.y === BACKROOM_POS.y;
            if (atBackroom) {
              member.task = 'idle';
              member.targetKey = null;
            } else {
              const stillThere = member.targetKey && next.interiorTiles[member.targetKey]?.type === 'checkout';
              if (stillThere) {
                member.task = 'working';
              } else {
                member.path = [...member.path].reverse();
                member.segmentIndex = 0;
                member.segmentT = 0;
                member.targetKey = null;
              }
            }
          }
        }
      }

      // --- Customer spawning (picks a target store: flagship or any zoned satellite) ---
      const houses = residentialCount(next.tiles);
      const spawnInterval = Math.max(
        MIN_SPAWN_INTERVAL,
        BASE_SPAWN_INTERVAL - houses * SPAWN_INTERVAL_PER_HOUSE
      );
      next.customerSpawnTimer -= dt;
      if (next.customerSpawnTimer <= 0) {
        next.customerSpawnTimer = spawnInterval;
        const storeIds = [0, ...next.satelliteStores.map((st) => st.id)];
        const targetStoreId = storeIds[Math.floor(Math.random() * storeIds.length)];
        const targetPos = storePosById(next, targetStoreId);
        const edge = edgePos(targetPos.y);
        const newCustomer: CustomerState = {
          id: next.nextCustomerId,
          phase: 'entering',
          path: [edge, targetPos],
          segmentIndex: 0,
          segmentT: 0,
          category: pickDesiredCategory(next),
          patience: 0,
          targetStoreId,
        };
        next.nextCustomerId = next.nextCustomerId + 1;
        next.customers = [...next.customers, newCustomer];
      }

      // --- Flagship checkout throughput ---
      const cashierCount = next.staff.filter((m) => m.role === 'cashier' && m.task === 'working').length;
      const serviceSeconds = Math.max(
        MIN_CHECKOUT_SERVICE_SECONDS,
        BASE_CHECKOUT_SERVICE_SECONDS - cashierCount * CASHIER_SERVICE_BONUS_SECONDS
      );
      next.checkoutCooldown = Math.max(0, next.checkoutCooldown - dt);
      const hasCheckout = findCheckoutKeys(next.interiorTiles).length > 0;

      let happinessDelta = 0;

      const sendAway = (c: CustomerState, happy: boolean, targetPos: GridPos) => {
        c.phase = happy ? 'leaving-happy' : 'leaving-sad';
        happinessDelta += happy ? HAPPINESS_GAIN_ON_SALE : -HAPPINESS_LOSS_ON_EMPTY;
        c.path = [targetPos, edgePos(targetPos.y)];
        c.segmentIndex = 0;
        c.segmentT = 0;
      };

      const attemptServeFlagship = (c: CustomerState): boolean => {
        const shelfKey = pickShelfForCategory(next.interiorTiles, c.category);
        if (!shelfKey) return false;
        const tile = next.interiorTiles[shelfKey];
        next.interiorTiles = {
          ...next.interiorTiles,
          [shelfKey]: { ...tile, shelf: { ...tile.shelf!, stock: Math.max(0, tile.shelf!.stock - 1) } },
        };
        const tier = next.priceTiers[c.category];
        const price = CATEGORIES[c.category].basePrice * PRICE_MULTIPLIER[tier];
        next.money += price;
        sendAway(c, true, next.storePos);
        return true;
      };

      // --- Customer movement / resolution ---
      const remaining: CustomerState[] = [];
      for (const c of next.customers) {
        if (c.phase === 'entering') {
          const { segmentIndex, segmentT, arrived } = advanceAlongPath(
            c.path,
            c.segmentIndex,
            c.segmentT,
            CUSTOMER_SPEED,
            dt
          );
          c.segmentIndex = segmentIndex;
          c.segmentT = segmentT;
          if (!arrived) {
            remaining.push(c);
            continue;
          }

          if (c.targetStoreId === 0) {
            if (!hasCheckout || categoryShelfStock(next.interiorTiles, c.category) < 1) {
              sendAway(c, false, next.storePos);
            } else if (next.checkoutCooldown <= 0 && attemptServeFlagship(c)) {
              next.checkoutCooldown = serviceSeconds;
            } else {
              c.phase = 'waiting';
              c.patience = CUSTOMER_PATIENCE_SECONDS;
            }
          } else {
            // Satellite store: simple, immediate self-checkout — no queue.
            const store = next.satelliteStores.find((st) => st.id === c.targetStoreId);
            const targetPos = store ? store.pos : next.storePos;
            if (store && store.stock >= 1) {
              store.stock -= 1;
              next.money += SATELLITE_PRICE;
              c.phase = 'leaving-happy';
              happinessDelta += SATELLITE_HAPPINESS_GAIN;
              c.path = [targetPos, edgePos(targetPos.y)];
              c.segmentIndex = 0;
              c.segmentT = 0;
            } else {
              c.phase = 'leaving-sad';
              happinessDelta -= SATELLITE_HAPPINESS_LOSS;
              c.path = [targetPos, edgePos(targetPos.y)];
              c.segmentIndex = 0;
              c.segmentT = 0;
            }
          }
          remaining.push(c);
        } else if (c.phase === 'waiting') {
          // Only flagship customers ever reach this phase.
          c.patience -= dt;
          if (next.checkoutCooldown <= 0) {
            if (attemptServeFlagship(c)) {
              next.checkoutCooldown = serviceSeconds;
            } else {
              sendAway(c, false, next.storePos);
            }
          } else if (c.patience <= 0) {
            sendAway(c, false, next.storePos);
          }
          remaining.push(c);
        } else {
          const { segmentIndex, segmentT, arrived } = advanceAlongPath(
            c.path,
            c.segmentIndex,
            c.segmentT,
            CUSTOMER_SPEED,
            dt
          );
          c.segmentIndex = segmentIndex;
          c.segmentT = segmentT;
          if (!arrived) remaining.push(c);
        }
      }
      next.customers = remaining;

      next.happiness = clamp(next.happiness + happinessDelta, 0, 100);
      const towardNeutral = (50 - next.happiness) * 0.02 * HAPPINESS_DECAY_TOWARD_NEUTRAL * dt;
      next.happiness = clamp(next.happiness + towardNeutral, 0, 100);

      // --- Wages ---
      const wagePerSec = next.staff.reduce(
        (sum, m) => sum + (m.role === 'stocker' ? STOCKER_WAGE_PER_SEC : CASHIER_WAGE_PER_SEC),
        0
      );
      next.money = Math.max(0, next.money - wagePerSec * dt);

      // --- Derived totals for HUD ---
      const totals = totalShelfStock(next.interiorTiles);
      next.stock = totals.stock;
      next.maxStock = totals.capacity;

      return next;
    });
  },

  save: () => {
    const s = get();
    const payload = {
      tiles: s.tiles,
      money: s.money,
      happiness: s.happiness,
      interiorTiles: s.interiorTiles,
      storeType: s.storeType,
      priceTiers: s.priceTiers,
      backroomStock: s.backroomStock,
      staff: s.staff,
      nextStaffId: s.nextStaffId,
      satelliteStores: s.satelliteStores,
      satelliteWarehouses: s.satelliteWarehouses,
      nextSatelliteStoreId: s.nextSatelliteStoreId,
      nextSatelliteWarehouseId: s.nextSatelliteWarehouseId,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      // storage unavailable (private mode, quota) — fail silently for MVP
    }
  },

  loadIfPresent: () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      set((s) => {
        const interiorTiles = payload.interiorTiles ?? s.interiorTiles;
        const totals = totalShelfStock(interiorTiles);
        const next: GameState = {
          ...s,
          tiles: payload.tiles ?? {},
          money: typeof payload.money === 'number' ? payload.money : s.money,
          happiness: typeof payload.happiness === 'number' ? payload.happiness : s.happiness,
          interiorTiles,
          storeType: payload.storeType ?? s.storeType,
          priceTiers: payload.priceTiers ?? s.priceTiers,
          backroomStock: typeof payload.backroomStock === 'number' ? payload.backroomStock : 0,
          staff: Array.isArray(payload.staff) ? payload.staff : [],
          nextStaffId: typeof payload.nextStaffId === 'number' ? payload.nextStaffId : 1,
          satelliteStores: Array.isArray(payload.satelliteStores) ? payload.satelliteStores : [],
          satelliteWarehouses: Array.isArray(payload.satelliteWarehouses) ? payload.satelliteWarehouses : [],
          nextSatelliteStoreId:
            typeof payload.nextSatelliteStoreId === 'number' ? payload.nextSatelliteStoreId : 1,
          nextSatelliteWarehouseId:
            typeof payload.nextSatelliteWarehouseId === 'number' ? payload.nextSatelliteWarehouseId : 1,
          stock: totals.stock,
          maxStock: totals.capacity,
        };
        recomputeAllRoutes(next);
        return next;
      });
    } catch {
      // corrupt save — ignore and keep fresh state
    }
  },

  resetGame: () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    set(freshState());
  },
}));

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
