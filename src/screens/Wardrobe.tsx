import { Mascot } from '../components/Mascot';
import { muscleLevel, THEMES, winsToNextMuscle, wornProps } from '../lib/rewards';
import { OUTFITS, PIECES_PER_OUTFIT, type OutfitId } from '../lib/outfits';
import { PieceProgress, StrengthMeter } from './Results';
import { sfx } from '../lib/sound';
import { useStore } from '../store';

/** Unlockable cosmetics: worlds (by stars); outfits + muscles (by wins). */
export function Wardrobe({ onBack }: { onBack: () => void }) {
  const { profile, updateProfile } = useStore();
  const r = profile.rewards;
  const toNext = winsToNextMuscle(r.wins);

  const set = (patch: Partial<typeof r>) => {
    sfx.tap();
    void updateProfile({ ...profile, rewards: { ...r, ...patch } });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 py-6">
      <button onClick={onBack} className="btn-big grid h-12 w-12 place-items-center bg-white text-2xl" aria-label="Back">
        ←
      </button>
      <div className="flex flex-col items-center gap-2">
        <Mascot mood="happy" {...wornProps(r)} muscle={muscleLevel(r.wins)} size={200} />
        <StrengthMeter level={muscleLevel(r.wins)} />
        <div className="text-lg font-semibold" aria-label={`${r.wins} wins`}>
          🏆 {r.wins}
          {toNext !== null && <span className="ml-2 opacity-60">(+{toNext} → 💪)</span>}
        </div>
        {r.wearing && <PieceProgress outfitId={r.wearing} pieces={r.outfits[r.wearing] ?? 0} />}
      </div>

      <section>
        <h2 className="mb-2 text-center text-3xl">🎁</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OutfitCard
            label="None"
            selected={r.wearing === null}
            onClick={() => set({ wearing: null })}
            muscle={muscleLevel(r.wins)}
          />
          {OUTFITS.map((o) => {
            const pieces = r.outfits[o.id] ?? 0;
            const done = pieces >= PIECES_PER_OUTFIT;
            return (
              <OutfitCard
                key={o.id}
                id={o.id}
                label={o.name}
                icon={o.icon}
                pieces={pieces}
                selected={r.wearing === o.id}
                building={r.building === o.id && !done}
                muscle={muscleLevel(r.wins)}
                // Tapping wears it (if it has pieces) and makes it the outfit the next win builds.
                onClick={() => set({ wearing: pieces > 0 ? o.id : r.wearing, building: done ? r.building : o.id })}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-center text-3xl">🌍</h2>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const locked = r.stars < t.stars;
            return (
              <button
                key={t.id}
                disabled={locked}
                onClick={() => set({ theme: t.id })}
                data-theme={t.id}
                className="btn-big relative flex h-24 flex-col items-center justify-center text-4xl disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(160deg, var(--bg1), var(--bg2))',
                  outline: r.theme === t.id ? '5px solid var(--accent)' : undefined,
                }}
                aria-label={locked ? `${t.name} – needs ${t.stars} stars` : t.name}
              >
                <span className={locked ? 'opacity-30 grayscale' : ''}>{t.emoji}</span>
                {locked && (
                  <span className="absolute bottom-1 rounded-full bg-white/90 px-2 text-base font-bold">🔒 {t.stars}⭐</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}

function OutfitCard({
  id,
  label,
  icon,
  pieces = 0,
  selected,
  building,
  muscle,
  onClick,
}: {
  id?: OutfitId;
  label: string;
  icon?: string;
  pieces?: number;
  selected: boolean;
  building?: boolean;
  muscle: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-big relative flex flex-col items-center bg-white px-2 pb-2 pt-1"
      style={{ outline: selected ? '5px solid var(--accent)' : undefined }}
      aria-label={id ? `${label}: ${pieces} of ${PIECES_PER_OUTFIT}${building ? ', building' : ''}` : label}
      data-testid={id ? `outfit-${id}` : 'outfit-none'}
    >
      {building && <span className="absolute right-1 top-1 rounded-full bg-yellow-200 px-1.5 text-lg" title="Next win adds a piece here">🔨</span>}
      <span className={id && pieces === 0 ? 'opacity-30 grayscale' : ''}>
        <Mascot outfit={id ?? null} pieces={id ? Math.max(pieces, 0) : 0} muscle={muscle} size={84} className="animate-none!" />
      </span>
      <span className="text-sm font-semibold">
        {icon} {label}
      </span>
      {id && (
        <span className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden>
          <span className="block h-full rounded-full" style={{ width: `${(pieces / PIECES_PER_OUTFIT) * 100}%`, background: 'var(--accent)' }} />
        </span>
      )}
      {id && <span className="text-xs font-bold opacity-60">{pieces}/{PIECES_PER_OUTFIT}</span>}
    </button>
  );
}
