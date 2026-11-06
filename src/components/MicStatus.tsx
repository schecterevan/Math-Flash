import type { Phase } from '../hooks/useGame';

/**
 * Big, icon-only indicator of what the game is doing right now. When voice is
 * available it is also the mute button: tap to turn the microphone off (e.g.
 * in a noisy room) and tap again to turn it back on.
 */
export function MicStatus({
  phase,
  voiceOk,
  muted = false,
  onToggleMute,
}: {
  phase: Phase;
  voiceOk: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
}) {
  const waiting = phase === 'listening' || phase === 'starting' || phase === 'hearing' || phase === 'unclear';
  if (!voiceOk && waiting) {
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
  const s = muted && waiting ? { icon: '🎤', bg: '#868e96', label: 'Microphone off' } : map[phase];
  const showMutedMark = muted && (waiting || phase === 'paused');

  const face = (
    <>
      {'ring' in s && s.ring && <span className="ring absolute inset-0 rounded-full" style={{ background: s.bg }} />}
      <span
        className="relative grid h-20 w-20 place-items-center rounded-full text-4xl font-bold text-white shadow-lg"
        style={{ background: s.bg }}
      >
        {'bars' in s && s.bars ? (
          <span className="flex h-9 items-end gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="bar block h-full w-2 rounded bg-white" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </span>
        ) : (
          <span className={showMutedMark ? 'opacity-60 grayscale' : ''}>{s.icon}</span>
        )}
        {showMutedMark && (
          // red "off" slash across the mic
          <span className="absolute h-1.5 w-16 rotate-45 rounded-full bg-red-500 shadow" aria-hidden />
        )}
      </span>
      {muted && !waiting && (
        <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-white text-base shadow" aria-hidden>
          🔇
        </span>
      )}
    </>
  );

  if (!voiceOk || !onToggleMute) {
    return (
      <div className="relative grid h-20 w-20 place-items-center" role="status" aria-label={s.label} data-phase={phase}>
        {face}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggleMute}
      className="relative grid h-20 w-20 place-items-center rounded-full transition active:scale-95"
      aria-pressed={muted}
      aria-label={muted ? 'Turn microphone on' : 'Turn microphone off'}
      title={muted ? 'Tap to turn the microphone on' : 'Tap to turn the microphone off'}
      data-phase={phase}
      data-testid="mic-button"
    >
      {face}
      <span className="sr-only" role="status">
        {s.label}
      </span>
    </button>
  );
}
