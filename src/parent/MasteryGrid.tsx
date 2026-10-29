import { useMemo, useState } from 'react';
import { factId, formatFact, OP_SYMBOL, parseFactId, type Op } from '../lib/math/facts';
import { gridColor, medianCorrectMs, outcomeOf, recentAccuracy, type FactStats, type GridColor } from '../lib/learning/mastery';
import { weakest } from '../lib/analytics';
import type { Settings } from '../lib/settings';

export const STATUS: Record<GridColor, { bg: string; fg: string; glyph: string; label: string }> = {
  mastered: { bg: '#2fb171', fg: '#fff', glyph: '✓', label: 'Mastered' },
  developing: { bg: '#f5c542', fg: '#4a3b00', glyph: '·', label: 'Developing' },
  struggling: { bg: '#e5534b', fg: '#fff', glyph: '!', label: 'Struggling' },
  none: { bg: '#e9ecef', fg: '#868e96', glyph: '', label: 'Not enough practice' },
};

/** Grid with one operand per axis; each cell is a fact, color-coded by mastery. */
export function MasteryGrid({
  stats,
  settings,
  onPractice,
}: {
  stats: Map<string, FactStats>;
  settings: Settings;
  onPractice: (ids: string[]) => void;
}) {
  const enabled = (['add', 'sub', 'mul', 'div'] as Op[]).filter((o) => settings.ops[o].enabled);
  const [op, setOp] = useState<Op>(enabled[0] ?? 'add');
  const defaultSize = op === 'mul' || op === 'div' ? 12 : Math.min(20, Math.max(10, settings.ops.add.a.max));
  const [size, setSize] = useState<number>(defaultSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const axis = useMemo(() => {
    const lo = op === 'div' ? 1 : 0;
    return { rows: range(lo, size), cols: range(0, size) };
  }, [op, size]);

  const cellId = (r: number, c: number): string | null => {
    switch (op) {
      case 'add':
        return factId('add', r, c);
      case 'sub':
        return c > r && !settings.ops.sub.allowNegative ? null : factId('sub', r, c);
      case 'mul':
        return factId('mul', r, c);
      case 'div':
        return factId('div', r * c, r); // row = divisor, col = quotient
    }
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const cellPx = size > 12 ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['add', 'sub', 'mul', 'div'] as Op[]).map((o) => (
          <button
            key={o}
            onClick={() => {
              setOp(o);
              setSize(o === 'mul' || o === 'div' ? 12 : 10);
            }}
            className={`h-9 w-11 rounded-lg text-xl font-bold ${op === o ? 'bg-ink text-white' : 'bg-gray-100'}`}
            aria-pressed={op === o}
          >
            {OP_SYMBOL[o]}
          </button>
        ))}
        <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-9 rounded-lg border px-2" aria-label="Grid size">
          {[5, 10, 12, 20].map((n) => (
            <option key={n} value={n}>
              {op === 'div' ? `1–${n}` : `0–${n}`}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => setSelecting((s) => !s)}
            className={`h-9 rounded-lg px-3 text-sm font-semibold ${selecting ? 'bg-ink text-white' : 'bg-gray-100'}`}
          >
            {selecting ? 'Selecting…' : 'Select facts'}
          </button>
          <button
            onClick={() => {
              setSelecting(true);
              setSelected(new Set(weakest(stats, 10)));
            }}
            className="h-9 rounded-lg bg-gray-100 px-3 text-sm font-semibold"
          >
            Pick 10 weakest
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <table className="border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="text-xs opacity-60">{op === 'div' ? '÷ \\ =' : OP_SYMBOL[op]}</th>
              {axis.cols.map((c) => (
                <th key={c} className="text-xs font-semibold opacity-70">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {axis.rows.map((r) => (
              <tr key={r}>
                <th className="pr-1 text-right text-xs font-semibold opacity-70">{r}</th>
                {axis.cols.map((c) => {
                  const id = cellId(r, c);
                  if (!id) return <td key={c} className={cellPx} />;
                  const s = stats.get(id);
                  const color = gridColor(s);
                  const st = STATUS[color];
                  const isSel = selected.has(id);
                  const f = parseFactId(id);
                  return (
                    <td key={c} className="p-0">
                      <button
                        onClick={() => (selecting ? toggle(id) : setOpen(id))}
                        className={`${cellPx} grid place-items-center rounded font-bold`}
                        style={{
                          background: st.bg,
                          color: st.fg,
                          outline: isSel ? '3px solid #2d3047' : open === id ? '2px solid #2d3047' : undefined,
                          outlineOffset: 1,
                        }}
                        title={`${formatFact(f)} = ${f.answer} — ${st.label}${s ? ` (${s.firstCorrect}/${s.presented} first try)` : ''}`}
                        aria-label={`${formatFact(f)}: ${st.label}`}
                      >
                        {isSel ? '●' : st.glyph}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-sm" aria-label="Legend">
        {(Object.keys(STATUS) as GridColor[]).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="grid h-4 w-4 place-items-center rounded text-[10px] font-bold" style={{ background: STATUS[k].bg, color: STATUS[k].fg }}>
              {STATUS[k].glyph}
            </span>
            {STATUS[k].label}
          </span>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-2 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink p-3 text-white shadow-lg">
          <span className="font-semibold">{selected.size} selected</span>
          <span className="flex-1 truncate text-sm opacity-80">
            {[...selected].slice(0, 8).map((id) => formatFact(parseFactId(id))).join(', ')}
            {selected.size > 8 ? '…' : ''}
          </span>
          <button onClick={() => setSelected(new Set())} className="rounded-lg bg-white/20 px-3 py-1.5 text-sm">
            Clear
          </button>
          <button
            onClick={() => onPractice([...selected])}
            className="rounded-lg px-3 py-1.5 font-semibold"
            style={{ background: '#2fb171' }}
            data-testid="practice-selected"
          >
            ▶ Practice these
          </button>
        </div>
      )}

      {open && !selecting && <FactDetail id={open} stats={stats.get(open)} settings={settings} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function FactDetail({ id, stats, settings, onClose }: { id: string; stats?: FactStats; settings: Settings; onClose: () => void }) {
  const f = parseFactId(id);
  const t = { fastMs: settings.fastMs, slowMs: settings.slowMs };
  const color = gridColor(stats);
  const fmt = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`);
  const avg = stats && stats.timedCorrect ? stats.totalCorrectMs / stats.timedCorrect : null;
  return (
    <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm" data-testid="fact-detail">
      <div className="flex items-center justify-between">
        <h4 className="text-2xl font-bold">
          {formatFact(f)} = {f.answer}
        </h4>
        <button onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-1" aria-label="Close">
          ✕
        </button>
      </div>
      <p className="mt-1 text-sm">
        <span className="rounded px-2 py-0.5 font-semibold" style={{ background: STATUS[color].bg, color: STATUS[color].fg }}>
          {STATUS[color].label}
        </span>{' '}
        <span className="opacity-70">Level: {stats?.level ?? 'new'}</span>
      </p>
      {!stats ? (
        <p className="mt-3 text-sm opacity-70">Not practiced yet.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <Item k="Times practiced" v={stats.presented} />
            <Item k="Right first try" v={`${stats.firstCorrect} (${Math.round((stats.firstCorrect / stats.presented) * 100)}%)`} />
            <Item k="Wrong answers" v={stats.incorrect} />
            <Item k="Needed retries" v={stats.retries} />
            <Item k="Average time" v={fmt(avg)} />
            <Item k="Recent median" v={fmt(medianCorrectMs(stats, 10))} />
            <Item k="Recent accuracy" v={`${Math.round((recentAccuracy(stats) ?? 0) * 100)}%`} />
            <Item k="Last practiced" v={new Date(stats.lastPracticed).toLocaleDateString()} />
          </dl>
          <div className="mt-3">
            <div className="mb-1 text-xs opacity-60">History (oldest → newest): 🟩 fast · 🟨 slow · 🟥 missed first try</div>
            <div className="flex flex-wrap gap-1">
              {stats.history.map((h, i) => {
                const o = outcomeOf(h, t);
                const bg = o === 'fast' ? STATUS.mastered.bg : o === 'slow' ? STATUS.developing.bg : STATUS.struggling.bg;
                return (
                  <span
                    key={i}
                    className="h-5 w-5 rounded"
                    style={{ background: bg }}
                    title={`${new Date(h.at).toLocaleString()} — ${h.firstCorrect ? 'correct' : `missed (${h.wrongs} wrong)`}${h.ms !== null ? `, ${fmt(h.ms)}` : ''}${h.hinted ? ', used hint' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs opacity-60">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}

function range(lo: number, hi: number) {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}
