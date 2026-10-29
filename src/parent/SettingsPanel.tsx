import { useMemo, useState } from 'react';
import { generateFactPool, MAX_POOL, type Range } from '../lib/math/facts';
import { GRADES, gradePreset, RANGE_PRESETS, type Settings } from '../lib/settings';
import { useStore } from '../store';
import { Card } from './Dashboard';

const TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function SettingsPanel() {
  const { profile, updateProfile } = useStore();
  const s = profile.settings;
  const set = (patch: Partial<Settings>) => void updateProfile({ ...profile, settings: { ...s, ...patch } });
  const setOps = <K extends keyof Settings['ops']>(k: K, patch: Partial<Settings['ops'][K]>) =>
    // Hand-editing ranges turns the grade preset into a custom setup.
    set({ grade: null, ops: { ...s.ops, [k]: { ...s.ops[k], ...patch } } });

  const pool = useMemo(() => generateFactPool(s.ops, { skipEasy: s.skipEasy }), [s.ops, s.skipEasy]);
  const counts = pool.reduce<Record<string, number>>((m, f) => ((m[f.op] = (m[f.op] ?? 0) + 1), m), {});

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl p-3 text-sm ${pool.length ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}
        data-testid="pool-summary"
      >
        {pool.length
          ? `${pool.length.toLocaleString()} facts in the practice set: ${Object.entries(counts)
              .map(([k, v]) => `${v} ${({ add: 'addition', sub: 'subtraction', mul: 'multiplication', div: 'division' } as Record<string, string>)[k]}`)
              .join(', ')}.${pool.length >= MAX_POOL ? ' (Capped – narrow the ranges for best results.)' : ''}`
          : 'No facts selected – turn on at least one operation. The game will not start until you do.'}
      </div>

      <Card title="Grade level" subtitle="Pick a grade to set up the operations and number ranges below. You can still fine-tune them afterwards.">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Grade level">
          {GRADES.map((g) => (
            <button
              key={g.id}
              role="radio"
              aria-checked={s.grade === g.id}
              onClick={() => set(gradePreset(g.id))}
              className={`h-11 min-w-14 rounded-lg px-3 text-lg font-bold ${s.grade === g.id ? 'bg-ink text-white' : 'bg-gray-100'}`}
            >
              {g.label}
            </button>
          ))}
          <span className={`flex h-11 items-center rounded-lg px-3 text-sm font-semibold ${s.grade === null ? 'bg-ink text-white' : 'opacity-50'}`}>
            Custom
          </span>
        </div>
        <p className="mt-2 text-sm opacity-70" data-testid="grade-summary">
          {s.grade ? GRADES.find((g) => g.id === s.grade)!.summary : 'Custom ranges (edited below).'}
        </p>
        <Toggle
          label="Skip very easy facts (+0, −0, 7 − 7, ×0, ×1, ÷1)"
          checked={s.skipEasy}
          onChange={(v) => set({ skipEasy: v })}
        />
        <p className="text-xs opacity-60">Progress on facts already practiced is kept when you change grade.</p>
      </Card>

      <Card title="Addition">
        <Toggle label="Practice addition" checked={s.ops.add.enabled} onChange={(v) => setOps('add', { enabled: v })} />
        {s.ops.add.enabled && (
          <RangeControls presets={RANGE_PRESETS.add} a={s.ops.add.a} b={s.ops.add.b} onChange={(a, b) => setOps('add', { a, b })} />
        )}
      </Card>

      <Card title="Subtraction">
        <Toggle label="Practice subtraction" checked={s.ops.sub.enabled} onChange={(v) => setOps('sub', { enabled: v })} />
        {s.ops.sub.enabled && (
          <>
            <RangeControls
              presets={RANGE_PRESETS.sub}
              a={s.ops.sub.a}
              b={s.ops.sub.b}
              onChange={(a, b) => setOps('sub', { a, b })}
              labels={['First number (start)', 'Number taken away']}
            />
            <Toggle
              label="Allow negative answers (e.g. 3 − 5 = −2)"
              checked={s.ops.sub.allowNegative}
              onChange={(v) => setOps('sub', { allowNegative: v })}
            />
          </>
        )}
      </Card>

      <Card title="Multiplication">
        <Toggle label="Practice multiplication" checked={s.ops.mul.enabled} onChange={(v) => setOps('mul', { enabled: v })} />
        {s.ops.mul.enabled && (
          <>
            <TablePicker label="Times tables" value={s.ops.mul.tables} onChange={(tables) => setOps('mul', { tables })} />
            <RangeRow label="Multiplied by" value={s.ops.mul.factors} onChange={(factors) => setOps('mul', { factors })} />
          </>
        )}
      </Card>

      <Card title="Division">
        <Toggle label="Practice division (whole-number answers only)" checked={s.ops.div.enabled} onChange={(v) => setOps('div', { enabled: v })} />
        {s.ops.div.enabled && (
          <>
            <TablePicker
              label="Divide by (division facts from these tables)"
              value={s.ops.div.tables}
              onChange={(tables) => setOps('div', { tables: tables.filter((t) => t !== 0) })}
              hideZero
            />
            <button className="mt-1 text-sm underline" onClick={() => setOps('div', { tables: s.ops.mul.tables.filter((t) => t !== 0) })}>
              Match multiplication tables
            </button>
            <RangeRow label="Answers (quotients)" value={s.ops.div.quotients} onChange={(quotients) => setOps('div', { quotients })} />
          </>
        )}
      </Card>

      <Card title="Session">
        <Field label="Session length">
          <Segmented
            value={s.timeLimitMin ? `t${s.timeLimitMin}` : String(s.length)}
            options={[
              ['10', '10 questions'],
              ['20', '20'],
              ['30', '30'],
              ['50', '50'],
              ['unlimited', 'Unlimited'],
              ['t2', '2 min'],
              ['t5', '5 min'],
              ['t10', '10 min'],
            ]}
            onChange={(v) => {
              if (v.startsWith('t')) set({ timeLimitMin: Number(v.slice(1)) as Settings['timeLimitMin'] });
              else set({ timeLimitMin: 0, length: v === 'unlimited' ? 'unlimited' : (Number(v) as Settings['length']) });
            }}
          />
        </Field>
        <Field label="Default mode">
          <Segmented
            value={s.mode}
            options={[
              ['practice', '🧠 Practice (learning)'],
              ['challenge', '⚡ Challenge'],
            ]}
            onChange={(v) => set({ mode: v as Settings['mode'] })}
          />
          <p className="mt-1 text-xs opacity-60">
            Practice: hints, up to 4 tries, visual help after 2 misses. Challenge: no hints, 2 tries, focuses on recall.
          </p>
        </Field>
        <Toggle label="Let my child switch between Practice and Challenge" checked={s.childCanPickMode} onChange={(v) => set({ childCanPickMode: v })} />
        <Toggle label="Voice answers (microphone)" checked={s.voice} onChange={(v) => set({ voice: v })} />
        <Toggle label="Sound effects" checked={s.sound} onChange={(v) => set({ sound: v })} />
        <Toggle label="Visual hints (Practice mode)" checked={s.hints} onChange={(v) => set({ hints: v })} />
        <Toggle label="Show answer time to my child" checked={s.showTiming} onChange={(v) => set({ showTiming: v })} />
        <Toggle label="🔊 Read-aloud button" checked={s.readAloud} onChange={(v) => set({ readAloud: v })} />
      </Card>

      <Card title="Adaptive learning & speed">
        <Toggle label="Adaptive repetition (recommended)" checked={s.adaptive} onChange={(v) => set({ adaptive: v })} />
        <Field label={`Fast answer: ${(s.fastMs / 1000).toFixed(1)}s or less`}>
          <input
            type="range"
            min={1000}
            max={8000}
            step={250}
            value={s.fastMs}
            onChange={(e) => {
              const fastMs = Number(e.target.value);
              set({ fastMs, slowMs: Math.max(s.slowMs, fastMs + 1000) });
            }}
            className="w-full"
          />
        </Field>
        <Field label={`Slow answer: more than ${(s.slowMs / 1000).toFixed(1)}s`}>
          <input
            type="range"
            min={2000}
            max={15000}
            step={500}
            value={s.slowMs}
            onChange={(e) => {
              const slowMs = Number(e.target.value);
              set({ slowMs, fastMs: Math.min(s.fastMs, slowMs - 1000) });
            }}
            className="w-full"
          />
        </Field>
        <p className="text-xs opacity-60">
          Coaching thresholds, not school standards. Time is measured from when the question is shown and the mic is open until your child
          starts speaking (or presses the first key), so speech-recognition delay is not counted. A fact is “mastered” once it is answered
          right and fast in at least two different sessions. New facts get harder quickly while answers are fast, and ease off after a slow or missed one.
        </p>
        <Field label={`New facts per session (that turn out to be hard): ${s.newPerSession}`}>
          <input type="range" min={2} max={15} value={s.newPerSession} onChange={(e) => set({ newPerSession: Number(e.target.value) })} className="w-full" />
        </Field>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-sm font-semibold">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mt-2 flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
    </label>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${value === v ? 'bg-ink text-white' : 'bg-gray-100'}`}
          aria-pressed={value === v}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function RangeControls({
  presets,
  a,
  b,
  onChange,
  labels = ['First number', 'Second number'],
}: {
  presets: number[];
  a: Range;
  b: Range;
  onChange: (a: Range, b: Range) => void;
  labels?: [string, string];
}) {
  const isPreset = a.min === 0 && b.min === 0 && a.max === b.max && presets.includes(a.max);
  const [custom, setCustom] = useState(!isPreset);
  const preset = custom || !isPreset ? 'custom' : String(a.max);
  return (
    <>
      <Field label="Numbers">
        <Segmented
          value={preset}
          options={[...presets.map((p) => [String(p), `0–${p}`] as [string, string]), ['custom', 'Custom']]}
          onChange={(v) => {
            setCustom(v === 'custom');
            if (v !== 'custom') onChange({ min: 0, max: Number(v) }, { min: 0, max: Number(v) });
          }}
        />
      </Field>
      {preset === 'custom' && (
        <>
          <RangeRow label={labels[0]} value={a} onChange={(r) => onChange(r, b)} />
          <RangeRow label={labels[1]} value={b} onChange={(r) => onChange(a, r)} />
        </>
      )}
    </>
  );
}

function RangeRow({ label, value, onChange }: { label: string; value: Range; onChange: (r: Range) => void }) {
  const num = (v: string) => Math.max(0, Math.min(1000, Math.floor(Number(v) || 0)));
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <span className="w-44 font-semibold">{label}</span>
      <input type="number" min={0} value={value.min} onChange={(e) => onChange({ ...value, min: num(e.target.value) })} className="w-20 rounded-lg border p-1.5" aria-label={`${label} from`} />
      <span>to</span>
      <input type="number" min={0} value={value.max} onChange={(e) => onChange({ ...value, max: num(e.target.value) })} className="w-20 rounded-lg border p-1.5" aria-label={`${label} to`} />
    </div>
  );
}

function TablePicker({ label, value, onChange, hideZero }: { label: string; value: number[]; onChange: (v: number[]) => void; hideZero?: boolean }) {
  const tables = hideZero ? TABLES.filter((t) => t !== 0) : TABLES;
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {tables.map((t) => {
          const on = value.includes(t);
          return (
            <button
              key={t}
              onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t].sort((x, y) => x - y))}
              className={`h-10 w-10 rounded-lg text-lg font-bold ${on ? 'bg-ink text-white' : 'bg-gray-100'}`}
              aria-pressed={on}
            >
              {t}
            </button>
          );
        })}
        <button onClick={() => onChange(tables.filter((t) => t >= 1 && t <= 10))} className="rounded-lg bg-gray-100 px-3 text-sm">
          1–10
        </button>
        <button onClick={() => onChange([])} className="rounded-lg bg-gray-100 px-3 text-sm">
          None
        </button>
      </div>
    </Field>
  );
}
