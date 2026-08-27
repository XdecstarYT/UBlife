import { useGameStore } from '../store/gameStore';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { CAMPAIGNS, RIVAL_STANCE_LABEL } from '../game/business';
import { MAX_LOAN } from '../game/constants';
import type { CampaignKind } from '../game/types';

function NetWorthSparkline({ history }: { history: number[] }) {
  if (history.length < 2) {
    return <div className="sparkline-wrap" />;
  }
  const w = 400;
  const h = 44;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = max - min || 1;
  const points = history
    .map((v, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x},${y}`;
    })
    .join(' ');
  const positive = history[history.length - 1] >= history[0];

  return (
    <svg className="sparkline-wrap" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#4caf50' : '#e0433a'}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BusinessHUD({ onClose }: { onClose: () => void }) {
  const money = useGameStore((s) => s.money);
  const loanBalance = useGameStore((s) => s.loanBalance);
  const reputation = useGameStore((s) => s.reputation);
  const dayNumber = useGameStore((s) => s.dayNumber);
  const activeCampaign = useGameStore((s) => s.activeCampaign);
  const rivals = useGameStore((s) => s.rivals);
  const lostSalesToday = useGameStore((s) => s.lostSalesToday);
  const financeHistory = useGameStore((s) => s.financeHistory);
  const netWorthHistory = useGameStore((s) => s.netWorthHistory);
  const takeLoan = useGameStore((s) => s.takeLoan);
  const repayLoan = useGameStore((s) => s.repayLoan);
  const startCampaign = useGameStore((s) => s.startCampaign);
  const leaderboardEntries = useLeaderboardStore((s) => s.entries);

  const campaignKinds: CampaignKind[] = ['flyer', 'radio'];
  const recentDays = [...financeHistory].reverse().slice(0, 7);
  const currentNetWorth = money - loanBalance;

  return (
    <div className="business-overlay" onClick={onClose}>
      <div className="business-panel" onClick={(e) => e.stopPropagation()}>
        <div className="business-header">
          <h2>📊 Business — Day {dayNumber}</h2>
          <button className="business-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="business-section">
          <div className="business-row">
            <span className="hud-stat-label">Net worth</span>
            <span className="hud-stat-value">${Math.floor(money - loanBalance)}</span>
          </div>
          <NetWorthSparkline history={netWorthHistory} />
        </div>

        <div className="business-section">
          <span className="hud-section-label">Loan</span>
          <div className="business-row">
            <span>
              ${Math.floor(loanBalance)} / ${MAX_LOAN} owed
            </span>
          </div>
          <div className="business-btn-row">
            <button className="business-btn" onClick={() => takeLoan(500)} disabled={loanBalance >= MAX_LOAN}>
              Borrow $500
            </button>
            <button className="business-btn" onClick={() => repayLoan(500)} disabled={loanBalance <= 0 || money <= 0}>
              Repay $500
            </button>
            <button
              className="business-btn"
              onClick={() => repayLoan(loanBalance)}
              disabled={loanBalance <= 0 || money <= 0}
            >
              Repay All
            </button>
          </div>
        </div>

        <div className="business-section">
          <span className="hud-section-label">Reputation — {Math.round(reputation)}/100</span>
          <div className="hud-bar">
            <div className="hud-bar-fill" style={{ width: `${reputation}%`, background: '#4c9fe0' }} />
          </div>
        </div>

        <div className="business-section">
          <span className="hud-section-label">
            Marketing {activeCampaign ? `— ${CAMPAIGNS[activeCampaign.kind].label} (${Math.ceil(activeCampaign.remaining)}s left)` : ''}
          </span>
          <div className="business-btn-row">
            {campaignKinds.map((kind) => {
              const config = CAMPAIGNS[kind];
              return (
                <button
                  key={kind}
                  className="business-btn"
                  onClick={() => startCampaign(kind)}
                  disabled={!!activeCampaign || money < config.cost}
                >
                  {config.label}
                  <br />${config.cost} · {config.duration}s · {config.spawnMultiplier}x
                </button>
              );
            })}
          </div>
        </div>

        <div className="business-section">
          <span className="hud-section-label">Competitors — lost {lostSalesToday} sales today</span>
          {rivals.map((r) => (
            <div key={r.id} className="rival-row">
              <span className="rival-name">{r.name}</span>
              <span className="rival-stance">{RIVAL_STANCE_LABEL[r.stance]}</span>
              <div className="hud-bar" style={{ flex: '1 1 80px' }}>
                <div
                  className="hud-bar-fill"
                  style={{
                    width: `${r.stockLevel}%`,
                    background: r.stockLevel > 30 ? '#4caf50' : '#e0433a',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="business-section">
          <span className="hud-section-label">Recent days</span>
          {recentDays.length === 0 ? (
            <span style={{ fontSize: 12, opacity: 0.7 }}>No completed days yet.</span>
          ) : (
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Revenue</th>
                  <th>Wages</th>
                  <th>Interest</th>
                  <th>Marketing</th>
                  <th>Net worth</th>
                </tr>
              </thead>
              <tbody>
                {recentDays.map((d) => (
                  <tr key={d.day}>
                    <td>{d.day}</td>
                    <td>${Math.round(d.revenue)}</td>
                    <td>${Math.round(d.wages)}</td>
                    <td>${Math.round(d.interest)}</td>
                    <td>${Math.round(d.marketing)}</td>
                    <td>${Math.round(d.netWorth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="business-section">
          <span className="hud-section-label">Your best runs</span>
          {leaderboardEntries.length === 0 ? (
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              No finished runs yet — this record fills in once you reset your empire.
            </span>
          ) : (
            <table className="finance-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Net worth</th>
                  <th>Day</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardEntries.map((entry, i) => (
                  <tr key={`${entry.date}-${i}`}>
                    <td>{i + 1}</td>
                    <td>${Math.round(entry.netWorth)}</td>
                    <td>{entry.day}</td>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <span style={{ fontSize: 11, opacity: 0.6 }}>
            This run so far: ${Math.round(currentNetWorth)}. Records save locally on this device when you reset.
          </span>
        </div>
      </div>
    </div>
  );
}
