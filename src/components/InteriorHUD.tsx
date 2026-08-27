import { useGameStore } from '../store/gameStore';
import type { InteriorPlaceMode, ProductCategory, StaffRole, StoreType } from '../game/types';
import { ALL_CATEGORIES, CATEGORIES, PRICE_MULTIPLIER, PRICE_TIER_LABEL, STORE_TYPES } from '../game/retail';
import {
  CASHIER_HIRE_COST,
  CASHIER_WAGE_PER_SEC,
  CHECKOUT_COST,
  DECOR_COST,
  RAISE_COST,
  SHELF_COST,
  STOCKER_HIRE_COST,
  STOCKER_WAGE_PER_SEC,
} from '../game/constants';
import { findCheckoutKeys } from '../game/interior';
import { NotificationToasts } from './NotificationToasts';
import { CelebrationBanner } from './CelebrationBanner';

const STORE_TYPE_IDS: StoreType[] = ['general', 'boutique'];

function ModeButton({
  active,
  label,
  cost,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  cost?: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`hud-mode-btn${active ? ' active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={disabled ? { opacity: 0.35 } : undefined}
    >
      <span>{label}</span>
      {cost ? <span className="hud-mode-cost">${cost}</span> : null}
    </button>
  );
}

export function InteriorHUD() {
  const money = useGameStore((s) => s.money);
  const backroomStock = useGameStore((s) => s.backroomStock);
  const backroomCapacity = useGameStore((s) => s.backroomCapacity);
  const stock = useGameStore((s) => s.stock);
  const maxStock = useGameStore((s) => s.maxStock);
  const interiorMode = useGameStore((s) => s.interiorMode);
  const setInteriorMode = useGameStore((s) => s.setInteriorMode);
  const storeType = useGameStore((s) => s.storeType);
  const setStoreType = useGameStore((s) => s.setStoreType);
  const priceTiers = useGameStore((s) => s.priceTiers);
  const cyclePriceTier = useGameStore((s) => s.cyclePriceTier);
  const staff = useGameStore((s) => s.staff);
  const hireStaff = useGameStore((s) => s.hireStaff);
  const fireStaff = useGameStore((s) => s.fireStaff);
  const giveRaise = useGameStore((s) => s.giveRaise);
  const hasCheckout = useGameStore((s) => findCheckoutKeys(s.interiorTiles).length > 0);
  const setView = useGameStore((s) => s.setView);

  const allowedCategories = STORE_TYPES[storeType].allowedCategories;
  const stockers = staff.filter((m) => m.role === 'stocker');
  const cashiers = staff.filter((m) => m.role === 'cashier');
  const wagePerSec = staff.reduce(
    (sum, m) => sum + (m.role === 'stocker' ? STOCKER_WAGE_PER_SEC : CASHIER_WAGE_PER_SEC) + m.wageBonus,
    0
  );

  return (
    <div className="hud-root">
      <NotificationToasts />
      <CelebrationBanner />
      <div className="hud-top">
        <button className="hud-action-btn" onClick={() => setView('city')}>
          ⬅ City
        </button>
        <div className="hud-stat">
          <span className="hud-stat-label">Money</span>
          <span className="hud-stat-value">${Math.floor(money)}</span>
        </div>
        <div className="hud-stat hud-stat-grow">
          <span className="hud-stat-label">Backroom {Math.floor(backroomStock)}/{backroomCapacity}</span>
          <div className="hud-bar">
            <div
              className="hud-bar-fill"
              style={{ width: `${(backroomStock / backroomCapacity) * 100}%`, background: '#3d7fd9' }}
            />
          </div>
        </div>
        <div className="hud-stat hud-stat-grow">
          <span className="hud-stat-label">
            Shelved {Math.floor(stock)}/{maxStock}
          </span>
          <div className="hud-bar">
            <div
              className="hud-bar-fill"
              style={{
                width: maxStock > 0 ? `${(stock / maxStock) * 100}%` : '0%',
                background: '#4caf50',
              }}
            />
          </div>
        </div>
        {!hasCheckout && (
          <span className="hud-warning">No checkout — store is closed!</span>
        )}
      </div>

      <div className="hud-bottom">
        <div className="hud-panel">
          <span className="hud-section-label">Build</span>
          <div className="hud-modes">
            {ALL_CATEGORIES.map((cat) => (
              <ModeButton
                key={cat}
                active={interiorMode === (`shelf-${cat}` as InteriorPlaceMode)}
                label={`🗄️ ${CATEGORIES[cat].label}`}
                cost={SHELF_COST}
                disabled={!allowedCategories.includes(cat)}
                onClick={() => setInteriorMode(`shelf-${cat}` as InteriorPlaceMode)}
              />
            ))}
            <ModeButton
              active={interiorMode === 'checkout'}
              label="🛒 Checkout"
              cost={CHECKOUT_COST}
              onClick={() => setInteriorMode('checkout')}
            />
            <ModeButton
              active={interiorMode === 'decor'}
              label="🪴 Decor"
              cost={DECOR_COST}
              onClick={() => setInteriorMode('decor')}
            />
            <ModeButton
              active={interiorMode === 'bulldoze'}
              label="🧹 Clear"
              onClick={() => setInteriorMode('bulldoze')}
            />
            <ModeButton
              active={interiorMode === 'select'}
              label="👆 Look"
              onClick={() => setInteriorMode('select')}
            />
          </div>
        </div>

        <div className="hud-panel">
          <span className="hud-section-label">Store type</span>
          <div className="hud-modes">
            {STORE_TYPE_IDS.map((id) => (
              <ModeButton
                key={id}
                active={storeType === id}
                label={STORE_TYPES[id].label}
                onClick={() => setStoreType(id)}
              />
            ))}
          </div>
        </div>

        <div className="hud-panel">
          <span className="hud-section-label">Pricing</span>
          <div className="hud-modes">
            {allowedCategories.map((cat: ProductCategory) => {
              const tier = priceTiers[cat];
              const price = (CATEGORIES[cat].basePrice * PRICE_MULTIPLIER[tier]).toFixed(2);
              return (
                <button key={cat} className="hud-mode-btn" onClick={() => cyclePriceTier(cat)}>
                  <span>{CATEGORIES[cat].label}</span>
                  <span className="hud-mode-cost">
                    {PRICE_TIER_LABEL[tier]} · ${price}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hud-panel">
          <span className="hud-section-label">
            Staff · ${wagePerSec.toFixed(2)}/s wages
          </span>
          <div className="hud-modes">
            <ModeButton
              active={false}
              label={`👷 Hire Stocker (${stockers.length})`}
              cost={STOCKER_HIRE_COST}
              onClick={() => hireStaff('stocker' as StaffRole)}
            />
            <ModeButton
              active={false}
              label={`🧾 Hire Cashier (${cashiers.length})`}
              cost={CASHIER_HIRE_COST}
              onClick={() => hireStaff('cashier' as StaffRole)}
            />
            {staff.map((m) => (
              <div key={m.id} style={{ display: 'flex', gap: 4 }}>
                <button
                  className="hud-mode-btn"
                  style={{ cursor: 'default' }}
                  title={`${m.role} #${m.id} — level ${m.level}, ${Math.round(m.morale)}% morale`}
                >
                  <span>
                    {m.role === 'stocker' ? '👷' : '🧾'} #{m.id} Lv.{m.level}
                  </span>
                  <span className="hud-mode-cost" style={{ color: m.morale < 30 ? '#e0433a' : undefined }}>
                    {'❤️'} {Math.round(m.morale)}%
                  </span>
                </button>
                <button className="hud-mode-btn" onClick={() => giveRaise(m.id)}>
                  <span>💰 Raise</span>
                  <span className="hud-mode-cost">${RAISE_COST}</span>
                </button>
                <button className="hud-mode-btn" onClick={() => fireStaff(m.id)}>
                  <span>❌ Fire</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
