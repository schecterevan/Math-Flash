import { accuracyBySession, byDay, byOpAndBand, learningNow, mostMissed, overview, slowest, type FactRow } from '../lib/analytics';
import { OP_NAME, parseFactId } from '../lib/math/facts';
import { useStore } from '../store';
import { BarChart, LineChart } from './Charts';
import { MasteryGrid, STATUS } from './MasteryGrid';
import type { Level } from '../lib/learning/mastery';

const LEVEL_COLOR: Record<Level, string> = {
  mastered: STATUS.mastered.bg,
  practicing: STATUS.developing.bg,
  learning: STATUS.struggling.bg,
  new: STATUS.none.bg,
};

export function Dashboard({ onPractice }: { onPractice: (ids: string[]) => void }) {
  const { profile, stats, sessions } = useStore();
  const o = overview(sessions, stats);
  const days = byDay(sessions, 14);
  const acc = accuracyBySession(sessions, 20);
  const bands = byOpAndBand(stats);
  const fmtS = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`);
  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Questions practiced" value={o.questions.toLocaleString()} />
        <Tile label="First-try accuracy" value={pct(o.firstTryAccuracy)} />
        <Tile label="Avg / median time" value={`${fmtS(o.avgMs)} / ${fmtS(o.medianMs)}`} sub="correct, unhinted answers" />
        <Tile label="Facts mastered" value={String(o.levels.mastered)} sub={`${o.levels.learning + o.levels.practicing} being learned`} />
        <Tile label="Sessions" value={String(o.sessions)} />
        <Tile label="Total practice" value={`${Math.round(o.practiceMinutes)} min`} />
        <Tile label="Stars earned" value={`⭐ ${profile.rewards.stars}`} />
        <Tile label="Best streak" value={`🔥 ${profile.rewards.streak.best} ${profile.rewards.streak.best === 1 ? 'day' : 'days'}`} />
      </section>

      <Card title="Practice time by day" subtitle="Last 14 days, minutes">
        <BarChart
          data={days.map((d) => ({
            label: d.day.slice(5),
            value: d.minutes,
            tip: `${d.day}: ${d.minutes.toFixed(1)} min, ${d.questions} questions${d.accuracy !== null ? `, ${Math.round(d.accuracy * 100)}% first try` : ''}`,
          }))}
          format={(v) => `${Math.round(v)}`}
        />
      </Card>

      <Card title="Accuracy over time" subtitle="First-try accuracy, last 20 sessions">
        <LineChart
          data={acc.map((a) => ({
            label: new Date(a.at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
            value: a.accuracy,
            tip: `${new Date(a.at).toLocaleString()}: ${Math.round(a.accuracy * 100)}% of ${a.questions} (${a.mode})`,
          }))}
        />
      </Card>

      <Card title="Math fact mastery grid" subtitle="Tap a fact for its history. Select facts to launch a targeted practice session.">
        <MasteryGrid stats={stats} settings={profile.settings} onPractice={onPractice} />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Most often missed">
          <FactList rows={mostMissed(stats)} render={(r) => `${r.stats.presented - r.stats.firstCorrect} of ${r.stats.presented} missed`} onPractice={onPractice} />
        </Card>
        <Card title="Slowest correct answers">
          <FactList rows={slowest(stats)} render={(r) => `median ${fmtS(r.medianMs)}`} onPractice={onPractice} />
        </Card>
      </div>

      <Card title="Currently learning" subtitle="Facts in the Learning or Practicing stage">
        <FactList rows={learningNow(stats).slice(0, 24)} render={(r) => r.stats.level} onPractice={onPractice} compact />
      </Card>

      <Card title="Progress by operation and difficulty">
        {bands.length === 0 ? (
          <Empty />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-3 text-xs">
              {(['mastered', 'practicing', 'learning', 'new'] as Level[]).map((l) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm" style={{ background: LEVEL_COLOR[l] }} /> {l}
                </span>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs opacity-60">
                  <th className="py-1">Operation</th>
                  <th>Numbers</th>
                  <th>Facts seen</th>
                  <th>First try</th>
                  <th className="w-1/3">Stages</th>
                </tr>
              </thead>
              <tbody>
                {bands.map((b) => (
                  <tr key={b.op + b.band} className="border-t">
                    <td className="py-1.5">{OP_NAME[b.op]}</td>
                    <td>{b.band}</td>
                    <td>{b.total}</td>
                    <td>{pct(b.accuracy)}</td>
                    <td>
                      <div className="flex h-3 gap-[2px] overflow-hidden rounded" title={`${b.levels.mastered} mastered, ${b.levels.practicing} practicing, ${b.levels.learning} learning, ${b.levels.new} new`}>
                        {(['mastered', 'practicing', 'learning', 'new'] as Level[]).map((l) =>
                          b.levels[l] ? <span key={l} style={{ flex: b.levels[l], background: LEVEL_COLOR[l] }} /> : null,
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  );
}

function FactList({ rows, render, onPractice, compact }: { rows: FactRow[]; render: (r: FactRow) => string; onPractice: (ids: string[]) => void; compact?: boolean }) {
  if (!rows.length) return <Empty />;
  return (
    <>
      <ul className={compact ? 'flex flex-wrap gap-2' : 'divide-y'}>
        {rows.map((r) =>
          compact ? (
            <li key={r.id} className="rounded-lg bg-gray-100 px-2 py-1 text-sm" title={render(r)}>
              <b>{r.label}</b>
            </li>
          ) : (
            <li key={r.id} className="flex justify-between py-1.5 text-sm">
              <b>
                {r.label} = {parseFactId(r.id).answer}
              </b>
              <span className="opacity-70">{render(r)}</span>
            </li>
          ),
        )}
      </ul>
      <button onClick={() => onPractice(rows.slice(0, 12).map((r) => r.id))} className="mt-3 rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white">
        ▶ Practice these
      </button>
    </>
  );
}

function Empty() {
  return <p className="py-4 text-center text-sm opacity-60">Not enough practice data yet.</p>;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-4">
      <h3 className="text-lg font-bold">{title}</h3>
      {subtitle && <p className="mb-3 text-sm opacity-60">{subtitle}</p>}
      {!subtitle && <div className="mb-2" />}
      {children}
    </section>
  );
}
