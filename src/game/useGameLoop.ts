import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const MAX_DT = 0.1; // clamp to avoid huge jumps after a tab is backgrounded
const AUTOSAVE_INTERVAL = 10;

/**
 * Drives the simulation via requestAnimationFrame, independent of any R3F
 * Canvas — the truck, customers, and staff must keep moving while the
 * player is looking at either the city or the store interior.
 */
export function useGameLoop() {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const saveTimerRef = useRef(0);

  useEffect(() => {
    const loop = (now: number) => {
      if (lastRef.current !== null) {
        const dt = Math.min((now - lastRef.current) / 1000, MAX_DT);
        useGameStore.getState().tick(dt);

        saveTimerRef.current += dt;
        if (saveTimerRef.current >= AUTOSAVE_INTERVAL) {
          saveTimerRef.current = 0;
          useGameStore.getState().save();
        }
      }
      lastRef.current = now;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);
}
