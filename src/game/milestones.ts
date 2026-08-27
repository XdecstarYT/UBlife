import type { GameState } from './types';
import { CELEBRATION_DURATION_SECONDS } from './constants';

export interface MilestoneDef {
  id: string;
  label: string;
  check: (state: GameState) => boolean;
}

/** Order matters only for readability — each is checked independently every tick. */
export const MILESTONES: MilestoneDef[] = [
  { id: 'networth_1000', label: '$1,000 Net Worth', check: (s) => s.money - s.loanBalance >= 1000 },
  { id: 'networth_5000', label: '$5,000 Net Worth', check: (s) => s.money - s.loanBalance >= 5000 },
  { id: 'networth_25000', label: '$25,000 Net Worth', check: (s) => s.money - s.loanBalance >= 25000 },
  { id: 'first_satellite_store', label: 'First Satellite Store', check: (s) => s.satelliteStores.length >= 1 },
  { id: 'first_satellite_warehouse', label: 'First Satellite Warehouse', check: (s) => s.satelliteWarehouses.length >= 1 },
  {
    id: 'first_train',
    label: 'First Train',
    check: (s) => s.truck.mode === 'train' || s.satelliteStores.some((st) => st.vehicle.mode === 'train'),
  },
  { id: 'day_7', label: 'Day 7 Reached', check: (s) => s.dayNumber >= 7 },
  { id: 'day_30', label: 'Day 30 Reached', check: (s) => s.dayNumber >= 30 },
  { id: 'reputation_90', label: '90+ Reputation', check: (s) => s.reputation >= 90 },
];

/** Returns the ids of milestones that just became true and aren't already recorded. */
export function checkNewMilestones(state: GameState): MilestoneDef[] {
  return MILESTONES.filter((m) => !state.milestones[m.id] && m.check(state));
}

/** Pops the front of the celebration queue into a fresh activeCelebration (or null if empty). */
export function popCelebrationQueue(
  queue: string[]
): Pick<GameState, 'activeCelebration' | 'celebrationQueue'> {
  const [frontId, ...rest] = queue;
  const def = frontId ? MILESTONES.find((m) => m.id === frontId) : undefined;
  return {
    celebrationQueue: rest,
    activeCelebration: def ? { id: def.id, label: def.label, remaining: CELEBRATION_DURATION_SECONDS } : null,
  };
}
