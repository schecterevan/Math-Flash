// Per-fact performance tracking and mastery classification.

export type Level = 'new' | 'learning' | 'practicing' | 'mastered';

export interface AttemptRecord {
  /** Epoch ms when the question was answered. */
  at: number;
  sessionId: string;
  /** Correct on the first try? */
  firstCorrect: boolean;
  /** Number of wrong answers before getting it (or giving up). */
  wrongs: number;
  /** Response time of the first answer, ms (null = not measurable). */
  ms: number | null;
  hinted: boolean;
}

export interface FactStats {
  /** `${profileId}|${factId}` */
  key: string;
  profileId: string;
  factId: string;
  presented: number;
  firstCorrect: number;
  incorrect: number; // total wrong answers given
  retries: number; // questions that needed more than one attempt
  totalCorrectMs: number;
  timedCorrect: number;
  lastPracticed: number;
  /** Most recent attempts, newest last (capped). */
  history: AttemptRecord[];
  level: Level;
  /** Spaced-repetition: next time a mastered fact should be reviewed (epoch ms). */
  dueAt: number;
  /** Current spaced-repetition interval in days. */
  intervalDays: number;
}

export interface Thresholds {
  /** Correct answers at or under this are "fast" (ms). */
  fastMs: number;
  /** Correct answers over this are "slow" (ms). Between fast and slow is "ok". */
  slowMs: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { fastMs: 3000, slowMs: 6000 };

export const HISTORY_CAP = 30;
const DAY = 24 * 60 * 60 * 1000;
const INTERVALS = [1, 2, 4, 7, 14, 30, 60];

export function emptyStats(profileId: string, factId: string): FactStats {
  return {
    key: `${profileId}|${factId}`,
    profileId,
    factId,
    presented: 0,
    firstCorrect: 0,
    incorrect: 0,
    retries: 0,
    totalCorrectMs: 0,
    timedCorrect: 0,
    lastPracticed: 0,
    history: [],
    level: 'new',
    dueAt: 0,
    intervalDays: 0,
  };
}

export type Speed = 'fast' | 'ok' | 'slow' | 'unknown';

export function speedOf(ms: number | null, t: Thresholds): Speed {
  if (ms === null) return 'unknown';
  if (ms <= t.fastMs) return 'fast';
  if (ms > t.slowMs) return 'slow';
  return 'ok';
}

/** fast-correct, slow-correct, or incorrect — the three fluency outcomes. */
export type Outcome = 'fast' | 'slow' | 'incorrect';
export function outcomeOf(a: Pick<AttemptRecord, 'firstCorrect' | 'ms'>, t: Thresholds): Outcome {
  if (!a.firstCorrect) return 'incorrect';
  return speedOf(a.ms, t) === 'fast' || speedOf(a.ms, t) === 'unknown' ? 'fast' : 'slow';
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function recentWindow(s: FactStats, n = 6): AttemptRecord[] {
  return s.history.slice(-n);
}

export function recentAccuracy(s: FactStats, n = 6): number | null {
  const w = recentWindow(s, n);
  if (!w.length) return null;
  return w.filter((a) => a.firstCorrect).length / w.length;
}

export function medianCorrectMs(s: FactStats, n = 6): number | null {
  return median(
    recentWindow(s, n)
      .filter((a) => a.firstCorrect && a.ms !== null && !a.hinted)
      .map((a) => a.ms as number),
  );
}

/**
 * Mastery rules (coaching heuristics, not a standard):
 *  - new:        fewer than 3 attempts.
 *  - learning:   recent first-try accuracy below 70%.
 *  - mastered:   known on sight (first 2–3 answers all right and fast, in ≥2
 *                sessions), OR (≥4 of the last 5 right on the first try, OR the last 3 all right
 *                and fast), the last one correct, median time "fast", and
 *                fast-correct answers in ≥2 different sessions.
 *  - practicing: everything in between (usually right, not yet quick/consistent).
 */
export function classify(s: FactStats, t: Thresholds = DEFAULT_THRESHOLDS): Level {
  const h = s.history;
  const fastRight = (a: AttemptRecord) => a.firstCorrect && !a.hinted && (a.ms === null || a.ms <= t.fastMs);
  // Known on sight: every answer so far right and quick, on at least two different days/sessions.
  if (h.length >= 2 && h.length <= 3 && h.every(fastRight) && new Set(h.map((a) => a.sessionId)).size >= 2) return 'mastered';
  if (h.length < 3) {
    // Early warning: two misses already means "learning".
    if (h.length >= 2 && h.filter((a) => !a.firstCorrect).length >= 2) return 'learning';
    return 'new';
  }
  const acc = recentAccuracy(s, 6) ?? 0;
  if (acc < 0.7) return 'learning';

  const last5 = h.slice(-5);
  const last = h[h.length - 1];
  const fastCorrect = h.filter((a) => a.firstCorrect && !a.hinted && (a.ms === null || a.ms <= t.fastMs));
  const sessions = new Set(fastCorrect.slice(-6).map((a) => a.sessionId));
  const med = medianCorrectMs(s, 5);
  const fastEnough = med === null || med <= t.fastMs;
  const consistent = last5.length >= 4 && last5.filter((a) => a.firstCorrect).length >= 4;
  // Known on sight: the last 3 were all right and quick.
  const flawless = h.slice(-3).every((a) => a.firstCorrect && !a.hinted && (a.ms === null || a.ms <= t.fastMs));
  if ((consistent || flawless) && last.firstCorrect && fastEnough && sessions.size >= 2) return 'mastered';
  return 'practicing';
}

/** Updates stats with a completed question. Returns a new object. */
export function recordAttempt(prev: FactStats, attempt: AttemptRecord, t: Thresholds = DEFAULT_THRESHOLDS): FactStats {
  const s: FactStats = { ...prev, history: [...prev.history, attempt].slice(-HISTORY_CAP) };
  s.presented += 1;
  s.lastPracticed = attempt.at;
  if (attempt.firstCorrect) s.firstCorrect += 1;
  s.incorrect += attempt.wrongs;
  if (attempt.wrongs > 0) s.retries += 1;
  if (attempt.firstCorrect && attempt.ms !== null) {
    s.totalCorrectMs += attempt.ms;
    s.timedCorrect += 1;
  }
  s.level = classify(s, t);

  // Spaced repetition: mastered facts drift further apart each time they are
  // answered quickly; any miss brings the fact straight back.
  if (s.level === 'mastered') {
    const fast = attempt.firstCorrect && (attempt.ms === null || attempt.ms <= t.fastMs);
    if (prev.level !== 'mastered') s.intervalDays = INTERVALS[0];
    else if (fast) {
      const i = INTERVALS.indexOf(s.intervalDays);
      s.intervalDays = INTERVALS[Math.min(INTERVALS.length - 1, i < 0 ? 0 : i + 1)];
    }
    s.dueAt = attempt.at + s.intervalDays * DAY;
  } else {
    s.intervalDays = 0;
    s.dueAt = attempt.at; // due now
  }
  return s;
}

/** Struggle signal for dashboard color-coding. */
export type GridColor = 'mastered' | 'developing' | 'struggling' | 'none';
export function gridColor(s: FactStats | undefined): GridColor {
  if (!s || s.history.length < 2) return 'none';
  if (s.level === 'mastered') return 'mastered';
  const acc = recentAccuracy(s, 6) ?? 0;
  if (s.level === 'learning' || acc < 0.6) return 'struggling';
  return 'developing';
}
