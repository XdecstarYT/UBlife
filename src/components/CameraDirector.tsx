import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGameStore } from '../store/gameStore';

const PAN_IN_SECONDS = 1.1;
const HOLD_SECONDS = 2.2;
const PAN_OUT_SECONDS = 1.1;
const TOTAL_SECONDS = PAN_IN_SECONDS + HOLD_SECONDS + PAN_OUT_SECONDS;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Takes over the camera for a brief celebratory pan whenever the store has an
 * active milestone celebration — a wide establishing shot with a slow orbit,
 * then hands control back to OrbitControls exactly where it left off.
 *
 * Dismissal is owned by the game store's tick loop (celebration.remaining
 * counts down like every other in-game timer), not by this component — that
 * keeps the celebration's lifetime correct even if the player switches to
 * the store interior mid-celebration and this component unmounts.
 */
export function CameraDirector({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const active = useRef(false);
  const lastId = useRef<string | null>(null);
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const flyPos = useRef(new THREE.Vector3(0, 26, 32));
  const flyTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const celebration = useGameStore.getState().activeCelebration;

    if (celebration && celebration.id !== lastId.current) {
      // A new celebration started (either the first, or the next one in a queue).
      lastId.current = celebration.id;
      elapsed.current = 0;
      if (!active.current) {
        active.current = true;
        startPos.current.copy(camera.position);
        startTarget.current.copy(controls.target);
        controls.enabled = false;
      }
    }

    if (!celebration) {
      lastId.current = null;
      if (active.current) {
        active.current = false;
        controls.enabled = true;
      }
      return;
    }

    elapsed.current += dt;
    const t = elapsed.current;

    if (t < PAN_IN_SECONDS) {
      const k = easeInOut(t / PAN_IN_SECONDS);
      camera.position.lerpVectors(startPos.current, flyPos.current, k);
      controls.target.lerpVectors(startTarget.current, flyTarget.current, k);
    } else if (t < PAN_IN_SECONDS + HOLD_SECONDS) {
      const holdT = (t - PAN_IN_SECONDS) / HOLD_SECONDS;
      const angle = holdT * Math.PI * 0.5;
      const radius = Math.hypot(flyPos.current.x, flyPos.current.z);
      camera.position.set(Math.sin(angle) * radius, flyPos.current.y, Math.cos(angle) * radius);
      controls.target.copy(flyTarget.current);
    } else if (t < TOTAL_SECONDS) {
      const k = easeInOut((t - PAN_IN_SECONDS - HOLD_SECONDS) / PAN_OUT_SECONDS);
      camera.position.lerpVectors(flyPos.current, startPos.current, k);
      controls.target.lerpVectors(flyTarget.current, startTarget.current, k);
    }
    // Past TOTAL_SECONDS: hold at the eased-back position: the game store's
    // celebration.remaining will hit zero at roughly the same time and clear
    // activeCelebration, which is what actually restores control next frame.

    controls.update();
  });

  return null;
}
