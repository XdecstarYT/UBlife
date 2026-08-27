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

// --- Phase 3: full zoning, multi-store logistics ---

export const COMMERCIAL_COST = 120;
export const INDUSTRIAL_COST = 100;
export const RAIL_COST = 30;

export const SATELLITE_STORE_CAPACITY = 30;
export const SATELLITE_DELIVERY_CAPACITY = 20;
export const SATELLITE_PRICE = 9;
export const SATELLITE_HAPPINESS_GAIN = 2;
export const SATELLITE_HAPPINESS_LOSS = 3;

export const TRAIN_SPEED = 3.6; // tiles per second — faster than a truck's 2.2
export const TRAIN_CAPACITY = 36; // per delivery run — more than a truck's 20

/** Congestion penalty per additional concurrent route sharing a road tile. */
export const CONGESTION_FACTOR = 0.35;

// --- Business depth ---

/** One in-game "day" — the cadence for the P&L report, loan interest, and rival AI. */
export const DAY_LENGTH_SECONDS = 90;
export const FINANCE_HISTORY_LENGTH = 14; // days kept in the report

export const MAX_LOAN = 3000;
export const LOAN_INTEREST_RATE_PER_DAY = 0.05;

/** Reputation is a long-memory trailing average of happiness — this is how fast it catches up. */
export const REPUTATION_TREND_RATE = 0.015;
/** Spawn-interval multiplier ranges from ~0.5x (rep 0) to ~1.5x faster (rep 100). */
export const REPUTATION_SPAWN_FACTOR_MIN = 0.5;
export const REPUTATION_SPAWN_FACTOR_MAX = 1.5;

export const STAFF_XP_PER_SECOND_WORKED = 1;
export const STAFF_LEVEL_THRESHOLDS = [0, 40, 100, 200, 400]; // cumulative seconds worked for levels 1-5
export const STOCKER_BATCH_PER_LEVEL = 2;
export const CASHIER_BONUS_PER_LEVEL = 0.2;

export const MORALE_BASE_DECAY_PER_SEC = 0.08;
export const MORALE_UNDERPAID_PENALTY_PER_SEC = 0.6;
export const MORALE_PAID_RECOVERY_PER_SEC = 0.15;
export const RAISE_COST = 50;
export const RAISE_WAGE_INCREMENT = 0.05;
export const RAISE_MORALE_BOOST = 25;

/** Baseline pull weight for the player vs each rival when a customer decides where to shop. */
export const PLAYER_BASE_PULL_WEIGHT = 1;
export const RIVAL_BASE_PULL_WEIGHT = 0.5;
export const RIVAL_STOCK_RESTOCK_MIN = -20;
export const RIVAL_STOCK_RESTOCK_MAX = 20;

export const MAX_NOTIFICATIONS = 20;

// --- Phase 4: virality layer ---

/** Matches CameraDirector's total pan duration so the banner and camera move stay in sync. */
export const CELEBRATION_DURATION_SECONDS = 4.4;
