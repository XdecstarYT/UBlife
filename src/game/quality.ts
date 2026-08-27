import { create } from 'zustand';

export type QualityTier = 'low' | 'medium' | 'high';

const TIERS: QualityTier[] = ['low', 'medium', 'high'];

function detectDefaultTierIndex(): number {
  if (typeof window === 'undefined') return 2;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const smallScreen = window.innerWidth < 820;
  if (coarsePointer || smallScreen) return 1; // start conservative on phones/tablets
  return 2; // desktop starts at full quality
}

interface QualityState {
  tierIndex: number;
  tier: QualityTier;
  /** Nudge quality up (+1) or down (-1); clamped to the available tiers. */
  bump: (delta: number) => void;
}

export const useQualityStore = create<QualityState>((set, get) => {
  const initial = detectDefaultTierIndex();
  return {
    tierIndex: initial,
    tier: TIERS[initial],
    bump: (delta) => {
      const next = Math.max(0, Math.min(TIERS.length - 1, get().tierIndex + delta));
      if (next === get().tierIndex) return;
      set({ tierIndex: next, tier: TIERS[next] });
    },
  };
});

export const QUALITY_DPR: Record<QualityTier, [number, number]> = {
  low: [0.75, 1],
  medium: [1, 1.5],
  high: [1, 2],
};

export const QUALITY_ENV_RESOLUTION: Record<QualityTier, number> = {
  low: 16,
  medium: 32,
  high: 64,
};

export const QUALITY_CONTACT_SHADOW_RESOLUTION: Record<QualityTier, number> = {
  low: 128,
  medium: 256,
  high: 512,
};
