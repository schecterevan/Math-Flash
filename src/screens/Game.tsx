import { useEffect, useState } from 'react';
import { useGame, type Game as GameApi } from '../hooks/useGame';
import { OP_SYMBOL, type Fact } from '../lib/math/facts';
import type { FactStats } from '../lib/learning/mastery';
import type { Mode } from '../lib/settings';
import type { Profile, SessionRecord } from '../lib/storage/db';
import { Mascot, type Mood } from '../components/Mascot';
import { muscleLevel, wornProps } from '../lib/rewards';
import { MicStatus } from '../components/MicStatus';
import { NumberPad } from '../components/NumberPad';
import { Hint } from '../components/Hint';
import { Confetti } from '../components/Confetti';

export interface GameResult {
  record: SessionRecord;
  profile: Profile;
  stats: Map<string, FactStats>;
  improved: number;
}

export function GameScreen(props: {
  profile: Profile;
  stats: Map<string, FactStats>;
  pool: Fact[];
  mode: Mode;
  targeted: boolean;
  onDone: (r: GameResult | null) => void;
}) {
  const g = useGame({ ...props, voice: props.profile.settings.voice });
  const [padOpen, setPadOpen] = useState(!g.voiceOk);
  const s = props.profile.settings;

  useEffect(() => {
    if (!g.voiceOk) setPadOpen(true);
  }, [g.voiceOk]);

  useEffect(() => {
    if (g.phase === 'done' && g.record) {
      props.onDone(
        g.record.items.length
          ? { record: g.record, profile: g.finalProfile(), stats: g.finalStats(), improved: g.improvedCount() }
          : null,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.phase]);

  const fact = g.fact;
  const mood: Mood =
    g.phase === 'correct' ? 'cheer' : g.phase === 'wrong' ? 'oops' : g.phase === 'reveal' ? 'thinking' : g.phase === 'hearing' || g.phase === 'listening' ? 'listening' : 'idle';
  const hintsAllowed = props.mode === 'practice' && s.hints;
  const allowNegative = s.ops.sub.enabled && s.ops.sub.allowNegative;

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
      <TopBar g={g} mode={props.mode} />

      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="relative flex w-full flex-col items-center">
          {g.phase === 'correct' && <Confetti key={g.answered} />}
          <Mascot mood={mood} {...wornProps(props.profile.rewards)} muscle={muscleLevel(props.profile.rewards.wins)} size={110} />
          {fact && <ProblemCard fact={fact} g={g} showTiming={s.showTiming} />}
        </div>

        <div className="flex flex-col items-center gap-2">
          <MicStatus phase={g.phase} voiceOk={g.voiceOk} />
          <HeardBubble g={g} />
        </div>

        {g.showHint && fact && <Hint fact={fact} />}

        {g.phase === 'reveal' && (
          <button
            onClick={g.continueAfterReveal}
            className="btn-big anim-pop h-20 w-40 text-5xl text-white"
            style={{ background: 'var(--accent)' }}
            aria-label="Next question"
          >
            ▶
          </button>
        )}

        {padOpen && g.phase !== 'reveal' && (
          <NumberPad
            onSubmit={g.submit}
            onFirstKey={g.keypadInput}
            allowNegative={allowNegative}
            disabled={g.phase === 'correct' || g.phase === 'done'}
          />
        )}
      </main>

      <footer className="mt-4 flex items-center justify-center gap-3">
        {hintsAllowed && (
          <RoundButton label="Hint" onClick={g.requestHint} active={g.showHint}>
            💡
          </RoundButton>
        )}
        {s.readAloud && (
          <RoundButton label="Read the problem" onClick={g.readAloud}>
            🔊
          </RoundButton>
        )}
        {g.voiceOk && (
          <RoundButton label="Number pad" onClick={() => setPadOpen((o) => !o)} active={padOpen}>
            ⌨️
          </RoundButton>
        )}
        {!g.voiceOk && s.voice && (
          <RoundButton label="Try microphone again" onClick={() => void g.retryVoice()}>
            🎤
          </RoundButton>
        )}
      </footer>
      {!g.voiceOk && s.voice && <VoiceProblem kind={g.voiceError} />}
    </div>
  );
}

function TopBar({ g, mode }: { g: GameApi; mode: Mode }) {
  const finite = Number.isFinite(g.total);
  const pct = finite ? Math.min(100, (g.answered / g.total) * 100) : 0;
  return (
    <header className="flex items-center gap-3">
      <button onClick={g.stop} className="btn-big grid h-12 w-12 place-items-center bg-white text-2xl" aria-label="Stop">
        ✕
      </button>
      <div className="flex-1">
        {finite ? (
          <div className="h-5 overflow-hidden rounded-full bg-white/70 shadow-inner" role="progressbar" aria-valuenow={g.answered} aria-valuemax={g.total}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
          </div>
        ) : (
          <div className="text-center text-xl font-bold">
            {g.timeLeft !== null ? `⏳ ${Math.floor(g.timeLeft / 60)}:${String(g.timeLeft % 60).padStart(2, '0')}` : `✔️ ${g.answered}`}
          </div>
        )}
      </div>
      <span className="text-2xl" title={mode === 'challenge' ? 'Challenge' : 'Practice'}>
        {mode === 'challenge' ? '⚡' : '🧠'}
      </span>
      <div className="rounded-full bg-white px-3 py-1 text-xl font-bold shadow" aria-label="Points">
        🪙 {g.points}
      </div>
    </header>
  );
}

function ProblemCard({ fact, g, showTiming }: { fact: Fact; g: GameApi; showTiming: boolean }) {
  const anim = g.phase === 'wrong' ? 'anim-wiggle' : '';
  const showAnswer = g.phase === 'correct' || g.phase === 'reveal';
  const answerColor = g.phase === 'correct' ? 'var(--color-good)' : '#f59f00';
  return (
    <div
      key={fact.id + g.answered}
      className={`anim-pop -mt-3 w-full max-w-xl rounded-[2rem] px-4 py-6 shadow-xl sm:py-10 ${anim}`}
      style={{ background: 'var(--card)', outline: g.phase === 'correct' ? '6px solid var(--color-good)' : undefined }}
      data-testid="problem"
      data-answer-shown={showAnswer}
    >
      <div className="flex items-center justify-center gap-3 text-[clamp(3.5rem,14vw,7.5rem)] font-bold leading-none tracking-tight">
        <span>{fact.a}</span>
        <span style={{ color: 'var(--accent)' }}>{OP_SYMBOL[fact.op]}</span>
        <span>{fact.b}</span>
        <span className="opacity-40">=</span>
        <span
          className={`inline-grid min-w-[1.3em] place-items-center rounded-2xl px-2 ${showAnswer ? 'anim-pop text-white' : 'bg-soft'}`}
          style={showAnswer ? { background: answerColor } : { color: 'var(--accent)' }}
        >
          {showAnswer ? fact.answer : '?'}
        </span>
      </div>
      <div className="mt-3 flex h-8 items-center justify-center gap-2 text-2xl">
        {g.wrongCount > 0 && g.phase !== 'correct' && (
          <span aria-label={`${g.wrongCount} tries`}>{Array.from({ length: g.wrongCount }, () => '🔸').join(' ')}</span>
        )}
        {g.phase === 'correct' && showTiming && g.lastMs !== null && (
          <span className="anim-pop rounded-full bg-soft px-3 text-xl font-semibold">⏱ {(g.lastMs / 1000).toFixed(1)}s</span>
        )}
      </div>
    </div>
  );
}

function HeardBubble({ g }: { g: GameApi }) {
  if (!g.heard) return <div className="h-8" />;
  return (
    <div className="flex h-8 items-center gap-2 rounded-full bg-white/80 px-3 text-base opacity-80 shadow-sm" data-testid="heard">
      <span>🗣</span>
      <span className="max-w-[16rem] truncate italic">“{g.heard.text}”</span>
      {g.heard.value !== null && <span className="font-bold">→ {g.heard.value}</span>}
    </div>
  );
}

function RoundButton({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="btn-big grid h-16 w-16 place-items-center text-3xl"
      style={{ background: active ? 'var(--accent2)' : 'white' }}
    >
      {children}
    </button>
  );
}

function VoiceProblem({ kind }: { kind: string | null }) {
  const msg =
    kind === 'not-allowed'
      ? 'Microphone is blocked. Allow it in the browser address bar, or use the number pad.'
      : kind === 'unsupported'
        ? 'This browser can’t do voice answers. Try Chrome, Edge or Safari, or use the number pad.'
        : kind === 'network'
          ? 'Voice needs an internet connection in this browser. Using the number pad.'
          : kind === 'no-microphone'
            ? 'No microphone found. Using the number pad.'
            : 'Voice stopped working. Using the number pad.';
  return (
    <p className="mt-3 text-center text-sm opacity-70" data-testid="voice-problem">
      🎤🚫 {msg}
    </p>
  );
}
