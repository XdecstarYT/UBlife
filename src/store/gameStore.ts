import { create } from 'zustand';
import type {
  CustomerState,
  GameState,
  GridPos,
  InteriorPlaceMode,
  PlaceMode,
  PriceLevel,
  ProductCategory,
  StaffMember,
  StaffRole,
  StoreType,
  TileType,
  View,
} from '../game/types';
import { findRoadPath, tileKey, keyToPos } from '../game/pathfinding';
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
  CUSTOMER_PATIENCE_SECONDS,
  CUSTOMER_SPEED,
  DECOR_COST,
  DELIVERY_CAPACITY,
  GRID_HEIGHT,
  GRID_WIDTH,
  HAPPINESS_DECAY_TOWARD_NEUTRAL,
  HAPPINESS_GAIN_ON_SALE,
  HAPPINESS_LOSS_ON_EMPTY,
  INTERIOR_CELL_SIZE,
  INTERIOR_HEIGHT,
  INTERIOR_WIDTH,
  MIN_CHECKOUT_SERVICE_SECONDS,
  MIN_SPAWN_INTERVAL,
  ROAD_COST,
  RESIDENTIAL_COST,
  SHELF_COST,
  SPAWN_INTERVAL_PER_HOUSE,
  STAFF_SPEED,
  STARTING_MONEY,
  STOCKER_BATCH_SIZE,
  STOCKER_HIRE_COST,
  STOCKER_WAGE_PER_SEC,
  STOCKER_WORK_SECONDS,
  STORE_POS,
  TRUCK_SPEED,
  WAREHOUSE_POS,
} from '../game/constants';

const SAVE_KEY = 'tradecity-save-v2';

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

function initialTruck(): GameState['truck'] {
  return { phase: 'idle', path: [], segmentIndex: 0, segmentT: 0, cargo: 0 };
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
    deliveryCapacity: DELIVERY_CAPACITY,
    truckSpeed: TRUCK_SPEED,
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
  };
}

function recomputeRoute(state: GameState) {
  const path = findRoadPath(
    state.tiles,
    state.warehousePos,
    state.storePos,
    state.gridWidth,
    state.gridHeight
  );
  state.hasRoute = !!path;
  if (!path) {
    state.truck = initialTruck();
    return;
  }
  if (state.truck.phase === 'idle' || state.truck.phase === 'blocked') {
    state.truck = { ...initialTruck(), phase: 'to-store', path, cargo: 0 };
  } else {
    const isOutbound = state.truck.phase === 'to-store';
    state.truck.path = isOutbound ? path : [...path].reverse();
  }
}

function residentialCount(tiles: Record<string, TileType>): number {
  let count = 0;
  for (const t of Object.values(tiles)) if (t === 'residential') count++;
  return count;
}

/** Grid edge cell customers walk in from / out to, opposite the store's own row. */
function edgePos(storeY: number): GridPos {
  return { x: 0, y: storeY === 0 ? 1 : 0 };
}

/** Weighted-random product category among what the current store type can carry. */
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
    let nextTiles = state.tiles;
    let moneyDelta = 0;

    if (state.mode === 'bulldoze') {
      if (current === 'empty') return;
      nextTiles = { ...state.tiles };
      delete nextTiles[key];
    } else if (state.mode === 'road') {
      if (current === 'road') return;
      if (state.money < ROAD_COST) return;
      nextTiles = { ...state.tiles, [key]: 'road' };
      moneyDelta = -ROAD_COST;
    } else if (state.mode === 'residential') {
      if (current === 'residential') return;
      if (state.money < RESIDENTIAL_COST) return;
      nextTiles = { ...state.tiles, [key]: 'residential' };
      moneyDelta = -RESIDENTIAL_COST;
    } else {
      return;
    }

    set((s) => {
      const next: GameState = { ...s, tiles: nextTiles, money: s.money + moneyDelta };
      recomputeRoute(next);
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
      };

      // --- Truck movement ---
      if (!next.hasRoute) {
        next.truck.phase = 'blocked';
      } else if (next.truck.phase === 'to-store' || next.truck.phase === 'to-warehouse') {
        const { segmentIndex, segmentT, arrived } = advanceAlongPath(
          next.truck.path,
          next.truck.segmentIndex,
          next.truck.segmentT,
          next.truckSpeed,
          dt
        );
        next.truck.segmentIndex = segmentIndex;
        next.truck.segmentT = segmentT;

        if (arrived) {
          if (next.truck.phase === 'to-store') {
            next.backroomStock = Math.min(
              next.backroomCapacity,
              next.backroomStock + next.deliveryCapacity
            );
            const returnPath = [...next.truck.path].reverse();
            next.truck = { phase: 'to-warehouse', path: returnPath, segmentIndex: 0, segmentT: 0, cargo: 0 };
          } else {
            const freshPath = findRoadPath(
              next.tiles,
              next.warehousePos,
              next.storePos,
              next.gridWidth,
              next.gridHeight
            );
            next.truck = {
              phase: 'to-store',
              path: freshPath ?? [],
              segmentIndex: 0,
              segmentT: 0,
              cargo: next.deliveryCapacity,
            };
            if (!freshPath) next.hasRoute = false;
          }
        }
      }

      // --- Baseline restock trickle (keeps the store playable with zero staff) ---
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

      // --- Staff AI ---
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

      // --- Customer spawning ---
      const houses = residentialCount(next.tiles);
      const spawnInterval = Math.max(
        MIN_SPAWN_INTERVAL,
        BASE_SPAWN_INTERVAL - houses * SPAWN_INTERVAL_PER_HOUSE
      );
      next.customerSpawnTimer -= dt;
      if (next.customerSpawnTimer <= 0) {
        next.customerSpawnTimer = spawnInterval;
        const edge = edgePos(next.storePos.y);
        const newCustomer: CustomerState = {
          id: next.nextCustomerId,
          phase: 'entering',
          path: [edge, next.storePos],
          segmentIndex: 0,
          segmentT: 0,
          category: pickDesiredCategory(next),
          patience: 0,
        };
        next.nextCustomerId = next.nextCustomerId + 1;
        next.customers = [...next.customers, newCustomer];
      }

      // --- Checkout throughput ---
      const cashierCount = next.staff.filter((m) => m.role === 'cashier' && m.task === 'working').length;
      const serviceSeconds = Math.max(
        MIN_CHECKOUT_SERVICE_SECONDS,
        BASE_CHECKOUT_SERVICE_SECONDS - cashierCount * CASHIER_SERVICE_BONUS_SECONDS
      );
      next.checkoutCooldown = Math.max(0, next.checkoutCooldown - dt);
      const hasCheckout = findCheckoutKeys(next.interiorTiles).length > 0;

      let happinessDelta = 0;
      const edge = edgePos(next.storePos.y);

      const sendAway = (c: CustomerState, happy: boolean) => {
        c.phase = happy ? 'leaving-happy' : 'leaving-sad';
        happinessDelta += happy ? HAPPINESS_GAIN_ON_SALE : -HAPPINESS_LOSS_ON_EMPTY;
        c.path = [next.storePos, edge];
        c.segmentIndex = 0;
        c.segmentT = 0;
      };

      const attemptServe = (c: CustomerState): boolean => {
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
        sendAway(c, true);
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
          if (!hasCheckout || categoryShelfStock(next.interiorTiles, c.category) < 1) {
            sendAway(c, false);
          } else if (next.checkoutCooldown <= 0 && attemptServe(c)) {
            next.checkoutCooldown = serviceSeconds;
          } else {
            c.phase = 'waiting';
            c.patience = CUSTOMER_PATIENCE_SECONDS;
          }
          remaining.push(c);
        } else if (c.phase === 'waiting') {
          c.patience -= dt;
          if (next.checkoutCooldown <= 0) {
            if (attemptServe(c)) {
              next.checkoutCooldown = serviceSeconds;
            } else {
              sendAway(c, false);
            }
          } else if (c.patience <= 0) {
            sendAway(c, false);
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
          stock: totals.stock,
          maxStock: totals.capacity,
        };
        recomputeRoute(next);
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
