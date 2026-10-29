import { useState } from 'react';
import { Mascot, type Mood } from '../components/Mascot';
import { OUTFITS, PIECES_PER_OUTFIT, type OutfitMeta } from '../lib/outfits';
import { MAX_MUSCLE, MUSCLE_LEVELS } from '../lib/rewards';
import { useStore } from '../store';

/** Parent preview: every outfit with a stepper through its 10 pieces. Changes nothing in the child's progress. */
export function OutfitPreview() {
  const { profile } = useStore();
  const [muscle, setMuscle] = useState(0);
  const [mood, setMood] = useState<Mood>('happy');
  const [all, setAll] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4">
        <div>
          <div className="text-xs font-semibold opacity-60">Muscles (wins needed)</div>
          <Stepper value={muscle} max={MAX_MUSCLE} onChange={setMuscle} label="Muscle level" />
          <div className="text-xs opacity-60">Level {muscle} · {MUSCLE_LEVELS[muscle]} wins</div>
        </div>
        <div>
          <div className="text-xs font-semibold opacity-60">Pose</div>
          <div className="mt-1 flex gap-1">
            {(
              [
                ['happy', '🙌 Celebrating'],
                ['idle', '🙂 Standing'],
              ] as [Mood, string][]
            ).map(([m, l]) => (
              <button key={m} onClick={() => setMood(m)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mood === m ? 'bg-ink text-white' : 'bg-gray-100'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold opacity-60">Set all outfits to</div>
          <div className="mt-1 flex gap-1">
            {[0, 5, 10].map((n) => (
              <button key={n} onClick={() => setAll(n)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold">
                {n} pieces
              </button>
            ))}
          </div>
        </div>
        <p className="w-full text-xs opacity-60">
          Preview only. {profile.name} earns one piece per win, in this order, starting with the outfit marked 🔨 in Dress Up. The 10th piece is the vehicle.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OUTFITS.map((o) => (
          <OutfitStepperCard key={`${o.id}-${all}`} outfit={o} muscle={muscle} mood={mood} initial={all ?? profile.rewards.outfits[o.id] ?? 0} />
        ))}
      </div>
    </div>
  );
}

function OutfitStepperCard({ outfit, muscle, mood, initial }: { outfit: OutfitMeta; muscle: number; mood: Mood; initial: number }) {
  const [pieces, setPieces] = useState(initial);
  return (
    <section className="flex flex-col items-center rounded-2xl border bg-white p-4" data-testid={`preview-${outfit.id}`}>
      <h3 className="self-start text-lg font-bold">
        {outfit.icon} {outfit.name}
      </h3>
      <div className="my-2 grid h-[220px] w-full place-items-center rounded-xl" style={{ background: 'linear-gradient(160deg, var(--bg1), var(--bg2))' }}>
        <Mascot outfit={outfit.id} pieces={pieces} muscle={muscle} mood={mood} size={210} className="animate-none!" />
      </div>
      <Stepper value={pieces} max={PIECES_PER_OUTFIT} onChange={setPieces} label={`${outfit.name} pieces`} />
      <input
        type="range"
        min={0}
        max={PIECES_PER_OUTFIT}
        value={pieces}
        onChange={(e) => setPieces(Number(e.target.value))}
        className="mt-2 w-full"
        aria-label={`${outfit.name} pieces slider`}
      />
      <ol className="mt-2 grid w-full grid-cols-2 gap-x-3 gap-y-0.5 text-sm">
        {outfit.pieces.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-1.5 rounded px-1 ${i < pieces ? '' : 'opacity-35'} ${i === pieces - 1 ? 'bg-yellow-100 font-semibold' : ''}`}>
            <span className="w-4 text-right text-xs opacity-60">{i + 1}</span>
            <span>{p.icon}</span>
            <span className="truncate">{p.name}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Stepper({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="mt-1 flex items-center gap-2" role="group" aria-label={label}>
      <button onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} className="h-9 w-9 rounded-lg bg-gray-100 text-xl font-bold disabled:opacity-30" aria-label="Previous">
        −
      </button>
      <span className="min-w-14 text-center text-lg font-bold tabular-nums" aria-live="polite">
        {value} / {max}
      </span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg bg-gray-100 text-xl font-bold disabled:opacity-30" aria-label="Next">
        +
      </button>
    </div>
  );
}
