import { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { liveStreak, muscleLevel, wornProps } from '../lib/rewards';
import type { Mode } from '../lib/settings';
import { sfx, unlockAudio } from '../lib/sound';
import { useStore } from '../store';

export function Home({
  onPlay,
  onParent,
  onWardrobe,
  starting,
}: {
  onPlay: (mode: Mode) => void;
  onParent: () => void;
  onWardrobe: () => void;
  starting: boolean;
}) {
  const { profile, profiles, switchProfile } = useStore();
  const s = profile.settings;
  const [mode, setMode] = useState<Mode>(s.mode);
  const [pickProfile, setPickProfile] = useState(false);
  const r = profile.rewards;
  const streak = liveStreak(r);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-2">
        <button
          onClick={() => setPickProfile((p) => !p)}
          className="btn-big flex items-center gap-2 bg-white py-1 pl-1 pr-4"
          aria-label="Switch player"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full text-xl font-bold text-white" style={{ background: profile.color }}>
            {profile.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="max-w-[8rem] truncate text-lg font-semibold">{profile.name}</span>
        </button>
        <div className="flex items-center gap-2 text-lg font-bold">
          <Chip label="Stars">⭐ {r.stars}</Chip>
          <Chip label="Day streak">🔥 {streak}</Chip>
          <Chip label="Points" className="hidden sm:flex">
            🪙 {r.points}
          </Chip>
        </div>
        <button onClick={onParent} className="btn-big grid h-12 w-12 place-items-center bg-white text-2xl" aria-label="Grown-ups">
          🔒
        </button>
      </header>

      {pickProfile && profiles.length > 1 && (
        <div className="anim-pop mt-3 flex flex-wrap justify-center gap-3 rounded-3xl bg-white/80 p-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPickProfile(false);
                void switchProfile(p.id);
              }}
              className="flex flex-col items-center gap-1"
            >
              <span
                className="grid h-14 w-14 place-items-center rounded-full text-2xl font-bold text-white"
                style={{ background: p.color, outline: p.id === profile.id ? '4px solid var(--accent)' : undefined }}
              >
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <button onClick={onWardrobe} aria-label="Dress up" className="relative">
          <Mascot mood="happy" {...wornProps(r)} muscle={muscleLevel(r.wins)} size={190} />
          <span className="absolute -right-2 bottom-4 grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow">🎨</span>
        </button>

        <button
          onClick={() => {
            unlockAudio();
            sfx.tap();
            onPlay(mode);
          }}
          disabled={starting}
          className="btn-big grid h-32 w-56 place-items-center text-7xl text-white disabled:opacity-60"
          style={{ background: 'var(--color-good)' }}
          aria-label="Play"
          data-testid="play"
        >
          {starting ? <span className="animate-pulse text-5xl">🎤</span> : '▶'}
        </button>

        {s.childCanPickMode && (
          <div className="flex gap-3 rounded-full bg-white/70 p-2 shadow-inner" role="radiogroup" aria-label="Game mode">
            <ModeButton active={mode === 'practice'} onClick={() => setMode('practice')} label="Practice">
              🧠
            </ModeButton>
            <ModeButton active={mode === 'challenge'} onClick={() => setMode('challenge')} label="Challenge">
              ⚡
            </ModeButton>
          </div>
        )}

        <OpsPreview />
      </main>
    </div>
  );
}

function OpsPreview() {
  const { profile } = useStore();
  const o = profile.settings.ops;
  const items = [
    o.add.enabled && '+',
    o.sub.enabled && '−',
    o.mul.enabled && '×',
    o.div.enabled && '÷',
  ].filter(Boolean) as string[];
  return (
    <div className="flex gap-2" aria-label="Practicing">
      {items.map((i) => (
        <span key={i} className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-3xl font-bold shadow" style={{ color: 'var(--accent)' }}>
          {i}
        </span>
      ))}
    </div>
  );
}

function Chip({ children, label, className = '' }: { children: React.ReactNode; label: string; className?: string }) {
  return (
    <span className={`flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow ${className}`} title={label} aria-label={label}>
      {children}
    </span>
  );
}

function ModeButton({ children, active, onClick, label }: { children: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      className="grid h-16 w-20 place-items-center rounded-full text-4xl transition"
      style={{ background: active ? 'var(--accent)' : 'transparent', transform: active ? 'scale(1.08)' : undefined }}
    >
      {children}
    </button>
  );
}
