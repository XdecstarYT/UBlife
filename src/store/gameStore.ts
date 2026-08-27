import { create } from 'zustand';
import type {
  CustomerState,
  GameState,
  GridPos,
  PlaceMode,
  TileType,
} from '../game/types';
import { findRoadPath, tileKey } from '../game/pathfinding';
import {
  BASE_SPAWN_INTERVAL,
  CELL_SIZE,
  CUSTOMER_SPEED,
  DELIVERY_CAPACITY,
  GRID_HEIGHT,
  GRID_WIDTH,
  HAPPINESS_DECAY_TOWARD_NEUTRAL,
  HAPPINESS_GAIN_ON_SALE,
  HAPPINESS_LOSS_ON_EMPTY,
  MAX_STOCK,
  MIN_SPAWN_INTERVAL,
  PRICE_PER_ITEM,
  ROAD_COST,
  RESIDENTIAL_COST,
  SPAWN_INTERVAL_PER_HOUSE,
  STARTING_MONEY,
  STARTING_STOCK,
  STORE_POS,
  TRUCK_SPEED,
  WAREHOUSE_POS,
} from '../game/constants';

const SAVE_KEY = 'tradecity-save-v1';

interface GameActions {
  setMode: (mode: PlaceMode) => void;
  placeAt: (pos: GridPos) => void;
  tick: (dt: number) => void;
  save: () => void;
  loadIfPresent: () => void;
  resetGame: () => void;
}

function initialTruck(): GameState['truck'] {
  return { phase: 'idle', path: [], segmentIndex: 0, segmentT: 0, cargo: 0 };
}

function freshState(): GameState {
  return {
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    cellSize: CELL_SIZE,
    tiles: {},
    warehousePos: WAREHOUSE_POS,
    storePos: STORE_POS,
    mode: 'road',
    money: STARTING_MONEY,
    stock: STARTING_STOCK,
    maxStock: MAX_STOCK,
    pricePerItem: PRICE_PER_ITEM,
    deliveryCapacity: DELIVERY_CAPACITY,
    truckSpeed: TRUCK_SPEED,
    happiness: 70,
    truck: initialTruck(),
    customers: [],
    nextCustomerId: 1,
    customerSpawnTimer: BASE_SPAWN_INTERVAL,
    hasRoute: false,
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
  // Only reset the truck's path if it doesn't already have a job in flight.
  if (state.truck.phase === 'idle' || state.truck.phase === 'blocked') {
    state.truck = { ...initialTruck(), phase: 'to-store', path, cargo: 0 };
  } else {
    // Keep direction but refresh geometry in case the road changed shape.
    const isOutbound = state.truck.phase === 'to-store';
    state.truck.path = isOutbound ? path : [...path].reverse();
  }
}

function residentialCount(tiles: Record<string, TileType>): number {
  let count = 0;
  for (const t of Object.values(tiles)) if (t === 'residential') count++;
  return count;
}

function advanceAlongPath(
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

  tick: (dt) => {
    set((s) => {
      const next: GameState = {
        ...s,
        truck: { ...s.truck },
        customers: s.customers.map((c) => ({ ...c })),
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
            next.stock = Math.min(next.maxStock, next.stock + next.deliveryCapacity);
            const returnPath = [...next.truck.path].reverse();
            next.truck = {
              phase: 'to-warehouse',
              path: returnPath,
              segmentIndex: 0,
              segmentT: 0,
              cargo: 0,
            };
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

      // --- Customer spawning ---
      const houses = residentialCount(next.tiles);
      const spawnInterval = Math.max(
        MIN_SPAWN_INTERVAL,
        BASE_SPAWN_INTERVAL - houses * SPAWN_INTERVAL_PER_HOUSE
      );
      next.customerSpawnTimer -= dt;
      if (next.customerSpawnTimer <= 0) {
        next.customerSpawnTimer = spawnInterval;
        const entryPath: GridPos[] = [
          { x: 0, y: next.storePos.y === 0 ? 1 : 0 },
          next.storePos,
        ];
        const newCustomer: CustomerState = {
          id: next.nextCustomerId,
          phase: 'entering',
          path: entryPath,
          segmentIndex: 0,
          segmentT: 0,
        };
        next.nextCustomerId = next.nextCustomerId + 1;
        next.customers = [...next.customers, newCustomer];
      }

      // --- Customer movement / resolution ---
      const remaining: CustomerState[] = [];
      let happinessDelta = 0;
      for (const c of next.customers) {
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

        if (c.phase === 'entering') {
          if (next.stock > 0) {
            next.stock -= 1;
            next.money += next.pricePerItem;
            happinessDelta += HAPPINESS_GAIN_ON_SALE;
            c.phase = 'leaving-happy';
          } else {
            happinessDelta -= HAPPINESS_LOSS_ON_EMPTY;
            c.phase = 'leaving-sad';
          }
          c.path = [next.storePos, { x: 0, y: next.storePos.y === 0 ? 1 : 0 }];
          c.segmentIndex = 0;
          c.segmentT = 0;
          remaining.push(c);
        }
        // leaving-happy / leaving-sad customers that just arrived at exit: drop them.
      }
      next.customers = remaining;

      next.happiness = clamp(next.happiness + happinessDelta, 0, 100);
      const towardNeutral = (50 - next.happiness) * 0.02 * HAPPINESS_DECAY_TOWARD_NEUTRAL * dt;
      next.happiness = clamp(next.happiness + towardNeutral, 0, 100);

      return next;
    });
  },

  save: () => {
    const s = get();
    const payload = {
      tiles: s.tiles,
      money: s.money,
      stock: s.stock,
      happiness: s.happiness,
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
        const next: GameState = {
          ...s,
          tiles: payload.tiles ?? {},
          money: typeof payload.money === 'number' ? payload.money : s.money,
          stock: typeof payload.stock === 'number' ? payload.stock : s.stock,
          happiness:
            typeof payload.happiness === 'number' ? payload.happiness : s.happiness,
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
