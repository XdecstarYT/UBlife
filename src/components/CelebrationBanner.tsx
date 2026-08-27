import { useGameStore } from '../store/gameStore';

const PARTICLE_EMOJI = ['🎉', '✨', '🎊', '⭐'];

export function CelebrationBanner() {
  const celebration = useGameStore((s) => s.activeCelebration);
  if (!celebration) return null;

  return (
    <div className="celebration-overlay" key={celebration.id}>
      <div className="celebration-particles">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="celebration-particle"
            style={{ left: `${5 + (i / 9) * 90}%`, animationDelay: `${i * 0.15}s` }}
          >
            {PARTICLE_EMOJI[i % PARTICLE_EMOJI.length]}
          </span>
        ))}
      </div>
      <div className="celebration-card">
        <span className="celebration-title">Milestone Unlocked!</span>
        <span className="celebration-label">{celebration.label}</span>
      </div>
    </div>
  );
}
