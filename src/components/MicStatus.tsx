import type { Phase } from '../hooks/useGame';

/** Big, icon-only indicator of what the game is doing right now. */
export function MicStatus({ phase, voiceOk }: { phase: Phase; voiceOk: boolean }) {
  if (!voiceOk && (phase === 'listening' || phase === 'starting' || phase === 'hearing')) {
    return (
      <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-4xl shadow" title="Type your answer">
        ⌨️
      </div>
    );
  }
  const map: Record<Phase, { icon: string; bg: string; ring?: boolean; bars?: boolean; label: string }> = {
    starting: { icon: '🎤', bg: '#adb5bd', label: 'Getting ready' },
    listening: { icon: '🎤', bg: 'var(--accent2)', ring: true, label: 'Listening' },
    hearing: { icon: '', bg: 'var(--color-good)', bars: true, label: 'Hearing you' },
    correct: { icon: '✓', bg: 'var(--color-good)', label: 'Correct' },
    wrong: { icon: '↻', bg: 'var(--color-warm)', label: 'Try again' },
    unclear: { icon: '👂', bg: '#b197fc', label: 'Say it again' },
    reveal: { icon: '💡', bg: '#ffd43b', label: 'Here is the answer' },
    paused: { icon: '🔊', bg: '#74c0fc', label: 'Reading the problem' },
    done: { icon: '🏁', bg: '#adb5bd', label: 'Done' },
  };
  const s = map[phase];
  return (
    <div className="relative grid h-20 w-20 place-items-center" role="status" aria-label={s.label} data-phase={phase}>
      {s.ring && <span className="ring absolute inset-0 rounded-full" style={{ background: s.bg }} />}
      <div
        className="relative grid h-20 w-20 place-items-center rounded-full text-4xl font-bold text-white shadow-lg"
        style={{ background: s.bg }}
      >
        {s.bars ? (
          <div className="flex h-9 items-end gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="bar block h-full w-2 rounded bg-white" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        ) : (
          s.icon
        )}
      </div>
    </div>
  );
}
