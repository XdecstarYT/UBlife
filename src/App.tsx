import { useEffect } from 'react';
import { Scene } from './components/Scene';
import { HUD } from './components/HUD';
import { InteriorScene } from './components/InteriorScene';
import { InteriorHUD } from './components/InteriorHUD';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './game/useGameLoop';
import './App.css';

function App() {
  const loadIfPresent = useGameStore((s) => s.loadIfPresent);
  const view = useGameStore((s) => s.view);

  useGameLoop();

  useEffect(() => {
    loadIfPresent();
  }, [loadIfPresent]);

  useEffect(() => {
    const handler = () => useGameStore.getState().save();
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, []);

  return (
    <div className="game-root">
      {view === 'city' ? (
        <>
          <Scene />
          <HUD />
        </>
      ) : (
        <>
          <InteriorScene />
          <InteriorHUD />
        </>
      )}
    </div>
  );
}

export default App;
