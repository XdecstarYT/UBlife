import { useGameStore } from '../store/gameStore';
import type { PlaceMode } from '../game/types';
import { ROAD_COST, RESIDENTIAL_COST } from '../game/constants';

const MODES: { id: PlaceMode; label: string; cost?: number }[] = [
  { id: 'road', label: '🛣️ Road', cost: ROAD_COST },
  { id: 'residential', label: '🏠 Zone', cost: RESIDENTIAL_COST },
  { id: 'bulldoze', label: '🧹 Clear' },
  { id: 'select', label: '👆 Look' },
];

function StatusPill({ hasRoute, truckPhase }: { hasRoute: boolean; truckPhase: string }) {
  let label = 'No route';
  let color = '#e0433a';
  if (hasRoute) {
    if (truckPhase === 'to-store') {
      label = 'Delivering';
      color = '#4caf50';
    } else if (truckPhase === 'to-warehouse') {
      label = 'Returning';
      color = '#3d7fd9';
    } else {
      label = 'Loading';
      color = '#e0a83a';
    }
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.35)',
        color: '#fff',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

export function HUD() {
  const money = useGameStore((s) => s.money);
  const stock = useGameStore((s) => s.stock);
  const maxStock = useGameStore((s) => s.maxStock);
  const happiness = useGameStore((s) => s.happiness);
  const mode = useGameStore((s) => s.mode);
  const setMode = useGameStore((s) => s.setMode);
  const hasRoute = useGameStore((s) => s.hasRoute);
  const truckPhase = useGameStore((s) => s.truck.phase);
  const save = useGameStore((s) => s.save);
  const resetGame = useGameStore((s) => s.resetGame);

  const stockRatio = maxStock > 0 ? stock / maxStock : 0;

  return (
    <div className="hud-root">
      <div className="hud-top">
        <div className="hud-stat">
          <span className="hud-stat-label">Money</span>
          <span className="hud-stat-value">${money}</span>
        </div>

        <div className="hud-stat hud-stat-grow">
          <span className="hud-stat-label">Stock</span>
          <div className="hud-bar">
            <div
              className="hud-bar-fill"
              style={{
                width: `${Math.round(stockRatio * 100)}%`,
                background: stockRatio > 0.25 ? '#4caf50' : '#e0433a',
              }}
            />
          </div>
        </div>

        <div className="hud-stat hud-stat-grow">
          <span className="hud-stat-label">Happiness</span>
          <div className="hud-bar">
            <div
              className="hud-bar-fill"
              style={{ width: `${Math.round(happiness)}%`, background: '#f5c542' }}
            />
          </div>
        </div>

        <StatusPill hasRoute={hasRoute} truckPhase={truckPhase} />
      </div>

      <div className="hud-bottom">
        <div className="hud-modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`hud-mode-btn${mode === m.id ? ' active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <span>{m.label}</span>
              {m.cost ? <span className="hud-mode-cost">${m.cost}</span> : null}
            </button>
          ))}
        </div>
        <div className="hud-actions">
          <button className="hud-action-btn" onClick={() => save()}>
            💾 Save
          </button>
          <button
            className="hud-action-btn"
            onClick={() => {
              if (confirm('Reset your city? This clears your save.')) resetGame();
            }}
          >
            ♻️ Reset
          </button>
        </div>
      </div>
    </div>
  );
}
