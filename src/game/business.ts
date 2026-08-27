import type { CampaignKind, Rival, RivalStance } from './types';

export interface CampaignConfig {
  label: string;
  cost: number;
  duration: number; // seconds
  spawnMultiplier: number;
}

export const CAMPAIGNS: Record<CampaignKind, CampaignConfig> = {
  flyer: { label: 'Flyer Campaign', cost: 80, duration: 45, spawnMultiplier: 1.5 },
  radio: { label: 'Radio Campaign', cost: 250, duration: 75, spawnMultiplier: 2.2 },
};

/** How much a rival's price stance alone adds to its pull on customers. */
export const RIVAL_STANCE_ATTRACTIVENESS: Record<RivalStance, number> = {
  low: 0.3,
  normal: 0,
  high: -0.3,
};

export const RIVAL_STANCE_LABEL: Record<RivalStance, string> = {
  low: 'Discount',
  normal: 'Standard',
  high: 'Premium',
};

export function initialRivals(): Rival[] {
  return [
    { id: 1, name: 'Discount Mart', stance: 'low', stockLevel: 70 },
    { id: 2, name: 'Corner Store', stance: 'normal', stockLevel: 60 },
    { id: 3, name: 'Luxury Emporium', stance: 'high', stockLevel: 55 },
  ];
}

/** Staff level (1-5) from accumulated active-work seconds. */
export function levelFromExperience(experience: number, thresholds: number[]): number {
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (experience >= thresholds[i]) level = i + 1;
  }
  return level;
}
