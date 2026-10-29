// Visual hints: ten-frames, make-ten, number lines, arrays and groups.
// They show HOW to get the answer; the final step is left as "?" to solve.

import type { Fact } from '../lib/math/facts';

const A = '#4dabf7'; // first number
const B = '#ff922b'; // second number

type Cell = { color: string; crossed?: boolean } | null;

function TenFrame({ cells, label }: { cells: Cell[]; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="grid grid-cols-5 gap-1 rounded-xl border-4 border-ink/70 bg-white p-1">
        {Array.from({ length: 10 }, (_, i) => {
          const c = cells[i];
          return (
            <div key={i} className="relative grid h-8 w-8 place-items-center rounded-md bg-soft sm:h-10 sm:w-10">
              {c && (
                <span className="block h-6 w-6 rounded-full sm:h-8 sm:w-8" style={{ background: c.color, opacity: c.crossed ? 0.35 : 1 }} />
              )}
              {c?.crossed && <span className="absolute text-2xl font-bold text-red-500">✕</span>}
            </div>
          );
        })}
      </div>
      {label && <span className="text-lg font-semibold">{label}</span>}
    </div>
  );
}

/** Fill frames left to right from a list of cells. */
function Frames({ cells }: { cells: Cell[] }) {
  const n = Math.max(1, Math.ceil(cells.length / 10));
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {Array.from({ length: n }, (_, i) => (
        <TenFrame key={i} cells={cells.slice(i * 10, i * 10 + 10)} />
      ))}
    </div>
  );
}

function Eq({ parts }: { parts: (string | number)[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-3xl font-bold">
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            p === '?' ? 'rounded-xl bg-accent px-3 text-white' : typeof p === 'number' ? 'rounded-xl bg-white px-2 shadow' : 'opacity-70'
          }
          style={p === '?' ? { background: 'var(--accent)' } : undefined}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

function NumberLine({ from, to, jumps }: { from: number; to: number; jumps: { start: number; end: number; color: string }[] }) {
  const lo = Math.min(from, to, ...jumps.map((j) => Math.min(j.start, j.end)));
  const hi = Math.max(from, to, ...jumps.map((j) => Math.max(j.start, j.end)));
  const span = Math.max(1, hi - lo);
  const W = 600;
  const pad = 30;
  const x = (v: number) => pad + ((v - lo) / span) * (W - pad * 2);
  const step = span <= 20 ? 1 : span <= 50 ? 5 : 10;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const shown = new Set([lo, hi, ...jumps.flatMap((j) => [j.start])]);
  return (
    <svg viewBox={`0 0 ${W} 130`} className="w-full max-w-xl">
      <line x1={pad - 10} x2={W - pad + 10} y1={95} y2={95} stroke="#2d3047" strokeWidth={3} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={88} y2={102} stroke="#2d3047" strokeWidth={2} />
          {(span <= 20 || shown.has(t) || t % 10 === 0) && (
            <text x={x(t)} y={124} textAnchor="middle" fontSize={16} fill="#2d3047">
              {t}
            </text>
          )}
        </g>
      ))}
      {jumps.map((j, i) => {
        const x1 = x(j.start);
        const x2 = x(j.end);
        const h = Math.min(70, 20 + Math.abs(x2 - x1) / 3);
        return (
          <g key={i}>
            <path d={`M${x1} 92 Q${(x1 + x2) / 2} ${92 - h} ${x2} 92`} stroke={j.color} strokeWidth={4} fill="none" />
            <text x={(x1 + x2) / 2} y={92 - h / 2 - 6} textAnchor="middle" fontSize={18} fontWeight={700} fill={j.color}>
              {j.end > j.start ? '+' : '−'}
              {Math.abs(j.end - j.start)}
            </text>
          </g>
        );
      })}
      <circle cx={x(from)} cy={95} r={8} fill={A} />
      <circle cx={x(to)} cy={95} r={10} fill="var(--accent)" />
      <text x={x(to)} y={70} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--accent)">
        ?
      </text>
    </svg>
  );
}

function AdditionHint({ a, b }: { a: number; b: number }) {
  const sum = a + b;
  if (a <= 10 && b <= 10 && sum <= 10) {
    const cells: Cell[] = [...Array(a).fill({ color: A }), ...Array(b).fill({ color: B })];
    return (
      <>
        <Frames cells={cells} />
        <Eq parts={[a, '+', b, '=', '?']} />
      </>
    );
  }
  if (a <= 10 && b <= 10) {
    // Make ten: move part of the smaller number to fill the bigger one's frame.
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    const bigColor = big === a ? A : B;
    const smallColor = big === a ? B : A;
    const need = 10 - big;
    const rest = small - need;
    const cells: Cell[] = [...Array(big).fill({ color: bigColor }), ...Array(need).fill({ color: smallColor }), ...Array(rest).fill({ color: smallColor })];
    return (
      <>
        <Frames cells={cells} />
        <Eq parts={[big, '+', need, '+', rest]} />
        <Eq parts={[10, '+', rest, '=', '?']} />
      </>
    );
  }
  // Bigger numbers: tens and ones.
  const ta = Math.floor(a / 10) * 10;
  const tb = Math.floor(b / 10) * 10;
  return (
    <>
      <NumberLine
        from={a}
        to={sum}
        jumps={[
          ...(tb ? [{ start: a, end: a + tb, color: A }] : []),
          ...(b - tb ? [{ start: a + tb, end: sum, color: B }] : []),
        ]}
      />
      <Eq parts={[ta, '+', tb, '=', ta + tb]} />
      <Eq parts={[a - ta, '+', b - tb, '=', a - ta + b - tb]} />
      <Eq parts={[ta + tb, '+', a - ta + b - tb, '=', '?']} />
    </>
  );
}

function SubtractionHint({ a, b }: { a: number; b: number }) {
  const diff = a - b;
  if (diff >= 0 && a <= 20) {
    const cells: Cell[] = Array.from({ length: a }, (_, i) => ({ color: A, crossed: i >= a - b }));
    const crossesTen = a > 10 && diff < 10;
    return (
      <>
        <Frames cells={cells} />
        {crossesTen ? (
          <>
            <Eq parts={[a, '−', a - 10, '−', b - (a - 10)]} />
            <Eq parts={[10, '−', b - (a - 10), '=', '?']} />
          </>
        ) : (
          <Eq parts={[a, '−', b, '=', '?']} />
        )}
      </>
    );
  }
  const tb = Math.floor(b / 10) * 10;
  return (
    <>
      <NumberLine
        from={a}
        to={diff}
        jumps={[
          ...(tb ? [{ start: a, end: a - tb, color: B }] : []),
          ...(b - tb ? [{ start: a - tb, end: diff, color: B }] : []),
        ]}
      />
      {tb > 0 && b - tb > 0 ? (
        <>
          <Eq parts={[a, '−', tb, '=', a - tb]} />
          <Eq parts={[a - tb, '−', b - tb, '=', '?']} />
        </>
      ) : (
        <Eq parts={[a, '−', b, '=', '?']} />
      )}
    </>
  );
}

function MultiplicationHint({ a, b }: { a: number; b: number }) {
  if (a === 0 || b === 0)
    return (
      <div className="text-center text-2xl font-semibold">
        <div className="text-5xl">0️⃣ 🧺</div>
        <Eq parts={[a, '×', b, '=', '?']} />
        <p className="mt-2 opacity-70">{a === 0 ? `0 groups of ${b}` : `${a} groups of 0`}</p>
      </div>
    );
  const rows = Math.min(a, 12);
  const cols = Math.min(b, 12);
  const dot = cols > 8 ? 'h-4 w-4' : 'h-6 w-6';
  return (
    <>
      <div className="flex flex-col gap-1.5 rounded-2xl bg-white p-3 shadow">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-1.5">
            {Array.from({ length: cols }, (_, c) => (
              <span key={c} className={`${dot} rounded-full`} style={{ background: r % 2 ? B : A }} />
            ))}
            <span className="ml-2 w-10 text-right text-lg font-bold opacity-70">{r < rows - 1 ? (r + 1) * b : '?'}</span>
          </div>
        ))}
      </div>
      <Eq parts={[a, 'rows of', b]} />
    </>
  );
}

function DivisionHint({ a, b, q }: { a: number; b: number; q: number }) {
  // Share a dots into b groups, skip-count by b.
  const skip = Array.from({ length: Math.min(q, 12) }, (_, i) => (i + 1) * b);
  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: Math.min(q, 12) }, (_, g) => (
          <div key={g} className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border-4 border-dashed bg-white p-2" style={{ borderColor: g % 2 ? B : A, maxWidth: 110 }}>
            {Array.from({ length: b }, (_, i) => (
              <span key={i} className="h-4 w-4 rounded-full" style={{ background: g % 2 ? B : A }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xl font-bold">
        {skip.map((s, i) => (
          <span key={i} className="rounded-lg bg-white px-2 shadow">
            {s}
          </span>
        ))}
      </div>
      <Eq parts={['?', '×', b, '=', a]} />
    </>
  );
}

export function Hint({ fact }: { fact: Fact }) {
  return (
    <div className="anim-pop flex flex-col items-center gap-3 rounded-3xl bg-white/70 p-4 backdrop-blur" data-testid="hint">
      {fact.op === 'add' && <AdditionHint a={fact.a} b={fact.b} />}
      {fact.op === 'sub' && <SubtractionHint a={fact.a} b={fact.b} />}
      {fact.op === 'mul' && <MultiplicationHint a={fact.a} b={fact.b} />}
      {fact.op === 'div' && <DivisionHint a={fact.a} b={fact.b} q={fact.answer} />}
    </div>
  );
}
