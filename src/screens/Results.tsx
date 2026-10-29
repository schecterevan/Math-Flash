import { useEffect, useState } from 'react';
import { Confetti } from '../components/Confetti';
import { Mascot } from '../components/Mascot';
import { formatFact, parseFactId } from '../lib/math/facts';
import type { SessionSummary } from '../lib/finishSession';
import { sfx } from '../lib/sound';
import { MAX_MUSCLE, wornProps } from '../lib/rewards';
import { outfitById, PIECES_PER_OUTFIT } from '../lib/outfits';

export function Results({ summary, onAgain, onHome }: { summary: SessionSummary; onAgain: () => void; onHome: () => void }) {
  const { record, profile, milestones, win } = summary;
  // Show the character as it was, then "power up" after the stars land.
  const [grown, setGrown] = useState(!win.won);
  const levelUp = win.muscleAfter > win.muscleBefore;
  const outfit = win.outfit ? outfitById(win.outfit) : null;
  const newPiece = outfit ? outfit.pieces[win.pieces - 1] : null;
  const n = record.items.length;
  const firstTry = record.items.filter((i) => i.firstCorrect).length;
  const timed = record.items.filter((i) => i.firstCorrect && i.ms !== null);
  const fast = timed.filter((i) => (i.ms as number) <= profile.settings.fastMs).length;

  useEffect(() => {
    if (record.stars) setTimeout(() => sfx.fanfare(), 200);
    for (let i = 0; i < record.stars; i++) setTimeout(() => sfx.star(), 500 + i * 450);
    if (!win.won) return;
    if (win.completed) setTimeout(() => sfx.fanfare(), 2600 + record.stars * 450);
    const t = setTimeout(() => {
      setGrown(true);
      if (levelUp || newPiece) sfx.fanfare();
    }, 900 + record.stars * 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.stars]);

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-5 px-4 py-8 text-center">
      {record.stars > 0 && <Confetti count={60} />}
      <div className={`relative ${grown && win.won ? 'anim-pop' : ''}`} key={String(grown)} data-testid="results-mascot">
        <Mascot
          mood="cheer"
          {...(grown ? wornProps(profile.rewards) : { outfit: win.wearingBefore, pieces: win.piecesBefore })}
          muscle={grown ? win.muscleAfter : win.muscleBefore}
          size={170}
        />
      </div>

      {win.won && grown && (
        <div className="anim-pop flex flex-col items-center gap-2" data-testid="win-reward">
          <StrengthMeter level={win.muscleAfter} />
          <div className="flex flex-wrap justify-center gap-2">
            {levelUp && (
              <span className="rounded-2xl bg-orange-100 px-4 py-2 text-2xl font-bold text-orange-800 shadow">💪 Stronger!</span>
            )}
            {newPiece && (
              <span className="rounded-2xl bg-pink-100 px-4 py-2 text-2xl font-bold text-pink-800 shadow">
                🎁 {newPiece.icon} {newPiece.name}!
              </span>
            )}
          </div>
          {outfit && <PieceProgress outfitId={outfit.id} pieces={win.pieces} />}
          {win.completed && outfit && (
            <div className="anim-pop rounded-2xl bg-yellow-100 px-5 py-3 text-2xl font-bold text-yellow-900 shadow">
              🎉 {outfit.icon} {outfit.name} complete!
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 text-7xl" aria-label={`${record.stars} stars`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={i < record.stars ? 'anim-star' : 'opacity-20 grayscale'}
            style={{ animationDelay: `${0.5 + i * 0.45}s` }}
          >
            ⭐
          </span>
        ))}
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        <Stat icon="✅" value={`${firstTry}/${n}`} label="First try" />
        <Stat icon="🪙" value={`+${record.points}`} label="Points" />
        <Stat icon="⚡" value={String(fast)} label="Quick answers" />
      </div>

      {record.newlyMastered.length > 0 && (
        <div className="w-full rounded-3xl bg-white/80 p-4 shadow">
          <div className="mb-2 text-3xl">🏅</div>
          <div className="flex flex-wrap justify-center gap-2">
            {record.newlyMastered.map((id) => (
              <span key={id} className="anim-pop rounded-xl bg-green-100 px-3 py-1 text-2xl font-bold text-green-800">
                {formatFact(parseFactId(id))}
              </span>
            ))}
          </div>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="flex w-full flex-wrap justify-center gap-2">
          {milestones.map((m) => (
            <div key={m.id} className="anim-pop rounded-2xl bg-yellow-100 px-4 py-2 text-xl font-semibold shadow">
              {m.emoji} {m.label}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-4">
        <button onClick={onHome} className="btn-big grid h-20 w-20 place-items-center bg-white text-4xl" aria-label="Home">
          🏠
        </button>
        <button
          onClick={onAgain}
          className="btn-big grid h-20 w-40 place-items-center text-5xl text-white"
          style={{ background: 'var(--color-good)' }}
          aria-label="Play again"
        >
          ↻
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-3xl bg-white/85 p-3 shadow" title={label}>
      <div className="text-3xl">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs opacity-60">{label}</div>
    </div>
  );
}

/** Five arm icons that fill up as the character gets stronger. */
export function StrengthMeter({ level }: { level: number }) {
  return (
    <div className="flex gap-1 rounded-full bg-white/80 px-3 py-1 text-2xl shadow" aria-label={`Strength ${level} of ${MAX_MUSCLE}`}>
      {Array.from({ length: MAX_MUSCLE }, (_, i) => (
        <span key={i} className={i < level ? '' : 'opacity-20 grayscale'}>
          💪
        </span>
      ))}
    </div>
  );
}

/** 10 slots for the outfit's pieces; collected ones show their icon. */
export function PieceProgress({ outfitId, pieces }: { outfitId: Parameters<typeof outfitById>[0]; pieces: number }) {
  const o = outfitById(outfitId);
  return (
    <div className="flex flex-wrap justify-center gap-1" aria-label={`${o.name}: ${pieces} of ${PIECES_PER_OUTFIT} pieces`} data-testid="piece-progress">
      {o.pieces.map((p, i) => (
        <span
          key={p.id}
          title={i < pieces ? p.name : '?'}
          className={`grid h-9 w-9 place-items-center rounded-xl text-xl shadow-sm ${i < pieces ? 'bg-white' : 'bg-white/40'} ${i === pieces - 1 ? 'anim-pop ring-4 ring-yellow-300' : ''}`}
        >
          {i < pieces ? p.icon : <span className="text-base opacity-30">?</span>}
        </span>
      ))}
    </div>
  );
}
