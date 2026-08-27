import { useGameStore } from '../store/gameStore';
import type { PlaceMode } from '../game/types';
import { COMMERCIAL_COST, INDUSTRIAL_COST, RAIL_COST, ROAD_COST, RESIDENTIAL_COST } from '../game/constants';

const MODES: { id: PlaceMode; label: string; cost?: number }[] = [
  { id: 'road', label: '🛣️ Road', cost: ROAD_COST },
  { id: 'rail', label: '🚆 Rail', cost: RAIL_COST },
  { id: 'residential', label: '🏠 Houses', cost: RESIDENTIAL_COST },
  { id: 'commercial', label: '🏪 Shop', cost: COMMERCIAL_COST },
  { id: 'industrial', label: '🏭 Factory', cost: INDUSTRIAL_COST },
  { id: 'bulldoze', label: '🧹 Clear' },
  { id: 'select', label: '👆 Look' },
];

function routeStatus(hasRoute: boolean, phase: string): { label: string; color: string } {
  if (!hasRoute) return { label: 'No route', color: '#e0433a' };
  if (phase === 'to-store') return { label: 'Delivering', color: '#4caf50' };
  if (phase === 'to-warehouse') return { label: 'Returning', color: '#3d7fd9' };
  return { label: 'Loading', color: '#e0a83a' };
}

function StatusPill({ hasRoute, truckPhase }: { hasRoute: boolean; truckPhase: string }) {
  const { label, color } = routeStatus(hasRoute, truckPhase);
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

function RoutesPanel() {
  const hasRoute = useGameStore((s) => s.hasRoute);
  const truckPhase = useGameStore((s) => s.truck.phase);
  const truckMode = useGameStore((s) => s.truck.mode);
  // Primitive signature so this only re-renders when a route's status actually
  // changes, not every tick (the store's array is a fresh reference each tick).
  const satelliteSignature = useGameStore((s) =>
    s.satelliteStores.map((st) => `${st.id}:${st.hasRoute}:${st.vehicle.phase}:${st.vehicle.mode}`).join('|')
  );

  const satellites = satelliteSignature
    ? satelliteSignature.split('|').map((entry) => {
        const [id, hasRouteStr, phase, vmode] = entry.split(':');
        return { id, hasRoute: hasRouteStr === 'true', phase, mode: vmode };
      })
    : [];

  if (satellites.length === 0) {
    // Only the flagship exists — its status is already shown as the top-right pill, no need to repeat it here.
    return null;
  }

  const rows = [
    { key: 'flagship', label: 'Flagship Store', hasRoute, phase: truckPhase, mode: truckMode },
    ...satellites.map((s) => ({
      key: `sat-${s.id}`,
      label: `Store #${s.id}`,
      hasRoute: s.hasRoute,
      phase: s.phase,
      mode: s.mode,
    })),
  ];

  return (
    <div className="hud-panel">
      <span className="hud-section-label">Routes</span>
      <div className="hud-modes">
        {rows.map((row) => {
          const { label, color } = routeStatus(row.hasRoute, row.phase);
          return (
            <div key={row.key} className="hud-mode-btn" style={{ cursor: 'default' }}>
              <span>
                {row.mode === 'train' ? '🚆' : '🚚'} {row.label}
              </span>
              <span className="hud-mode-cost" style={{ color }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
  const setView = useGameStore((s) => s.setView);

  const stockRatio = maxStock > 0 ? stock / maxStock : 0;

  return (
    <div className="hud-root">
      <div className="hud-top">
        <div className="hud-stat">
          <span className="hud-stat-label">Money</span>
          <span className="hud-stat-value">${Math.floor(money)}</span>
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
        <div className="hud-panel">
          <span className="hud-section-label">Build</span>
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
        </div>

        <RoutesPanel />

        <div className="hud-actions">
          <button className="hud-action-btn" onClick={() => setView('store')}>
            🏬 Manage Store
          </button>
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
