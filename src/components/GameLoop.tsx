import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';

const MAX_DT = 0.1; // clamp to avoid huge jumps after a tab is backgrounded
const AUTOSAVE_INTERVAL = 10;

export function GameLoop() {
  const saveTimer = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, MAX_DT);
    useGameStore.getState().tick(dt);

    saveTimer.current += dt;
    if (saveTimer.current >= AUTOSAVE_INTERVAL) {
      saveTimer.current = 0;
      useGameStore.getState().save();
    }
  });

  return null;
}
