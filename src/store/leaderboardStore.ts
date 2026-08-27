import { create } from 'zustand';

const LEADERBOARD_KEY = 'tradecity-leaderboard-v1';
const MAX_ENTRIES = 10;

export interface LeaderboardEntry {
  netWorth: number;
  day: number;
  date: string; // ISO string
}

interface LeaderboardState {
  entries: LeaderboardEntry[];
  loadFromStorage: () => void;
  addRun: (netWorth: number, day: number) => void;
}

function readEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // storage unavailable — fail silently, this is a nice-to-have
  }
}

/**
 * A purely local "personal best runs" tracker — there is no backend, so this
 * cannot be a real multiplayer leaderboard. It records net worth reached
 * each time a run ends (the player resets), sorted best-first.
 */
export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  entries: [],

  loadFromStorage: () => set({ entries: readEntries() }),

  addRun: (netWorth, day) => {
    if (netWorth <= 0) return; // not worth recording an empty/failed run
    const entries = [...get().entries, { netWorth, day, date: new Date().toISOString() }]
      .sort((a, b) => b.netWorth - a.netWorth)
      .slice(0, MAX_ENTRIES);
    set({ entries });
    writeEntries(entries);
  },
}));
