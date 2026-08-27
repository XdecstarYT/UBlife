export const GRID_WIDTH = 14;
export const GRID_HEIGHT = 10;
export const CELL_SIZE = 2;

export const WAREHOUSE_POS = { x: 1, y: 4 };
export const STORE_POS = { x: 12, y: 5 };

export const STARTING_MONEY = 500;
export const DELIVERY_CAPACITY = 20;
export const TRUCK_SPEED = 2.2; // tiles per second
export const TRUCK_LOAD_SECONDS = 1.2;

export const BASE_SPAWN_INTERVAL = 3.2; // seconds, with zero residential zoned
export const SPAWN_INTERVAL_PER_HOUSE = 0.35; // reduction per zoned residential tile
export const MIN_SPAWN_INTERVAL = 0.8;
export const CUSTOMER_SPEED = 1.6; // tiles per second

export const HAPPINESS_GAIN_ON_SALE = 3;
export const HAPPINESS_LOSS_ON_EMPTY = 6;
export const HAPPINESS_DECAY_TOWARD_NEUTRAL = 0.6; // per second, pulls toward 50

export const ROAD_COST = 10;
export const RESIDENTIAL_COST = 25;

// --- Phase 2: store interior ---

export const INTERIOR_WIDTH = 6;
export const INTERIOR_HEIGHT = 5;
export const INTERIOR_CELL_SIZE = 2;

/** Corner of the interior grid representing the stockroom door — staff paths start/end here. */
export const BACKROOM_POS = { x: 0, y: 0 };

export const SHELF_COST = 40;
export const CHECKOUT_COST = 90;
export const DECOR_COST = 20;

export const BACKROOM_CAPACITY = 60;
/** Units/second that shelve themselves with zero stockers hired — keeps the store playable understaffed. */
export const BASE_RESTOCK_TRICKLE = 0.6;

export const STAFF_SPEED = 1.8; // tiles per second, interior pathing
export const STOCKER_BATCH_SIZE = 6;
export const STOCKER_WORK_SECONDS = 0.6;
export const STOCKER_HIRE_COST = 80;
export const STOCKER_WAGE_PER_SEC = 0.15;

export const CASHIER_HIRE_COST = 100;
export const CASHIER_WAGE_PER_SEC = 0.2;

export const BASE_CHECKOUT_SERVICE_SECONDS = 3.2;
export const CASHIER_SERVICE_BONUS_SECONDS = 1.0;
export const MIN_CHECKOUT_SERVICE_SECONDS = 1.0;

export const CUSTOMER_PATIENCE_SECONDS = 4.5;
