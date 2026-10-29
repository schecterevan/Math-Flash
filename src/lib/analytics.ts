// Aggregations for the parent dashboard (pure functions).

import { bandOf, parseFactId, type Op } from './math/facts';
import { recentAccuracy, medianCorrectMs, type FactStats, type Level } from './learning/mastery';
import { dayKey } from './rewards';
import type { SessionRecord } from './storage/db';

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface Overview {
  questions: number;
  firstTryAccuracy: number | null;
  avgMs: number | null;
  medianMs: number | null;
  sessions: number;
  practiceMinutes: number;
  levels: Record<Level, number>;
}

export function overview(sessions: SessionRecord[], stats: Map<string, FactStats>): Overview {
  const items = sessions.flatMap((s) => s.items);
  const times = items.filter((i) => i.firstCorrect && i.ms !== null && !i.hinted).map((i) => i.ms as number);
  const levels: Record<Level, number> = { new: 0, learning: 0, practicing: 0, mastered: 0 };
  for (const s of stats.values()) levels[s.level]++;
  return {
    questions: items.length,
    firstTryAccuracy: items.length ? items.filter((i) => i.firstCorrect).length / items.length : null,
    avgMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    medianMs: median(times),
    sessions: sessions.length,
    practiceMinutes: sessions.reduce((a, s) => a + sessionMinutes(s), 0),
    levels,
  };
}

export function sessionMinutes(s: SessionRecord): number {
  return Math.max(0, (s.endedAt - s.startedAt) / 60000);
}

export interface DayPoint {
  day: string;
  minutes: number;
  questions: number;
  accuracy: number | null;
}

/** One point per calendar day for the last `days` days (oldest first). */
export function byDay(sessions: SessionRecord[], days = 14, today = new Date()): DayPoint[] {
  const out: DayPoint[] = [];
  const map = new Map<string, { minutes: number; q: number; c: number }>();
  for (const s of sessions) {
    const k = dayKey(new Date(s.startedAt));
    const e = map.get(k) ?? { minutes: 0, q: 0, c: 0 };
    e.minutes += sessionMinutes(s);
    e.q += s.items.length;
    e.c += s.items.filter((i) => i.firstCorrect).length;
    map.set(k, e);
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const e = map.get(k);
    out.push({ day: k, minutes: e?.minutes ?? 0, questions: e?.q ?? 0, accuracy: e && e.q ? e.c / e.q : null });
  }
  return out;
}

export interface FactRow {
  id: string;
  label: string;
  stats: FactStats;
  accuracy: number;
  medianMs: number | null;
}

function rows(stats: Map<string, FactStats>): FactRow[] {
  return [...stats.values()]
    .filter((s) => s.presented > 0)
    .map((s) => {
      const f = parseFactId(s.factId);
      return {
        id: s.factId,
        label: `${f.a} ${{ add: '+', sub: '−', mul: '×', div: '÷' }[f.op]} ${f.b}`,
        stats: s,
        accuracy: s.firstCorrect / s.presented,
        medianMs: medianCorrectMs(s, 10),
      };
    });
}

export function mostMissed(stats: Map<string, FactStats>, n = 10): FactRow[] {
  return rows(stats)
    .filter((r) => r.stats.presented - r.stats.firstCorrect > 0)
    .sort((a, b) => b.stats.presented - b.stats.firstCorrect - (a.stats.presented - a.stats.firstCorrect) || a.accuracy - b.accuracy)
    .slice(0, n);
}

export function slowest(stats: Map<string, FactStats>, n = 10): FactRow[] {
  return rows(stats)
    .filter((r) => r.medianMs !== null)
    .sort((a, b) => (b.medianMs ?? 0) - (a.medianMs ?? 0))
    .slice(0, n);
}

export function learningNow(stats: Map<string, FactStats>): FactRow[] {
  return rows(stats)
    .filter((r) => r.stats.level === 'learning' || r.stats.level === 'practicing')
    .sort((a, b) => (recentAccuracy(a.stats) ?? 0) - (recentAccuracy(b.stats) ?? 0));
}

/** Weakest facts first: struggling, then slow, then inconsistent. */
export function weakest(stats: Map<string, FactStats>, n = 10): string[] {
  return rows(stats)
    .filter((r) => r.stats.level !== 'mastered')
    .map((r) => ({ id: r.id, score: (recentAccuracy(r.stats) ?? 0) * 10 - (r.medianMs ?? 0) / 1000 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((r) => r.id);
}

export interface BandRow {
  op: Op;
  band: string;
  total: number;
  levels: Record<Level, number>;
  accuracy: number | null;
}

/** Progress by operation and difficulty band (practiced facts only). */
export function byOpAndBand(stats: Map<string, FactStats>): BandRow[] {
  const m = new Map<string, BandRow & { c: number; p: number }>();
  for (const s of stats.values()) {
    if (!s.presented) continue;
    const f = parseFactId(s.factId);
    const band = bandOf(f);
    const k = `${f.op}|${band}`;
    const r = m.get(k) ?? { op: f.op, band, total: 0, levels: { new: 0, learning: 0, practicing: 0, mastered: 0 }, accuracy: null, c: 0, p: 0 };
    r.total++;
    r.levels[s.level]++;
    r.c += s.firstCorrect;
    r.p += s.presented;
    m.set(k, r);
  }
  const order: Op[] = ['add', 'sub', 'mul', 'div'];
  const bandOrder = ['0–5', '6–10', '11+', '11–20', '21–50', '51–100+'];
  return [...m.values()]
    .map(({ c, p, ...r }) => ({ ...r, accuracy: p ? c / p : null }))
    .sort((a, b) => order.indexOf(a.op) - order.indexOf(b.op) || bandOrder.indexOf(a.band) - bandOrder.indexOf(b.band));
}

/** Accuracy per session (most recent `n`). */
export function accuracyBySession(sessions: SessionRecord[], n = 20) {
  return sessions
    .filter((s) => s.items.length > 0)
    .slice(-n)
    .map((s) => ({
      at: s.startedAt,
      accuracy: s.items.filter((i) => i.firstCorrect).length / s.items.length,
      questions: s.items.length,
      mode: s.mode,
    }));
}
