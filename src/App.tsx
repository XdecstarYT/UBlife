import { useEffect } from 'react';
import { Scene } from './components/Scene';
import { HUD } from './components/HUD';
import { useGameStore } from './store/gameStore';
import './App.css';

function App() {
  const loadIfPresent = useGameStore((s) => s.loadIfPresent);

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
      <Scene />
      <HUD />
    </div>
  );
}

export default App;
