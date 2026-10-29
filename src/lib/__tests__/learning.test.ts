import { describe, expect, it } from 'vitest';
import { generateFactPool, makeFact, type Fact } from '../math/facts';
import {
  classify,
  emptyStats,
  gridColor,
  outcomeOf,
  recordAttempt,
  type AttemptRecord,
  type FactStats,
} from '../learning/mastery';
import { SessionScheduler } from '../learning/scheduler';
import { DEFAULT_SETTINGS } from '../settings';
import { applyWin, bumpStreak, DEFAULT_REWARDS, liveStreak, muscleLevel, pointsFor, starsFor } from '../rewards';

const T = { fastMs: 3000, slowMs: 6000 };
let clock = 1_700_000_000_000;

function att(firstCorrect: boolean, ms: number | null, sessionId = 's1', wrongs = firstCorrect ? 0 : 1): AttemptRecord {
  clock += 60_000;
  return { at: clock, sessionId, firstCorrect, wrongs, ms, hinted: false };
}

function play(stats: FactStats, attempts: AttemptRecord[]): FactStats {
  return attempts.reduce((s, a) => recordAttempt(s, a, T), stats);
}

/** Seeded RNG so scheduler tests are deterministic. */
function rng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('recordAttempt', () => {
  it('records incorrect answers and retries', () => {
    let s = emptyStats('p', 'add:8:7');
    s = recordAttempt(s, { ...att(false, 4000), wrongs: 2 }, T);
    expect(s.presented).toBe(1);
    expect(s.firstCorrect).toBe(0);
    expect(s.incorrect).toBe(2);
    expect(s.retries).toBe(1);
    expect(s.history).toHaveLength(1);
    s = recordAttempt(s, att(true, 2000), T);
    expect(s.presented).toBe(2);
    expect(s.firstCorrect).toBe(1);
    expect(s.incorrect).toBe(2);
    expect(s.totalCorrectMs).toBe(2000);
  });
});

describe('classify', () => {
  it('new until enough practice', () => {
    expect(classify(play(emptyStats('p', 'x'), [att(true, 1000)]), T)).toBe('new');
  });

  it('learning when often wrong', () => {
    const s = play(emptyStats('p', 'x'), [att(false, 5000), att(true, 4000), att(false, 5000), att(false, 4000)]);
    expect(s.level).toBe('learning');
    expect(gridColor(s)).toBe('struggling');
  });

  it('practicing when correct but slow', () => {
    const s = play(emptyStats('p', 'x'), [
      att(true, 7000, 'a'),
      att(true, 6500, 'a'),
      att(true, 7000, 'b'),
      att(true, 8000, 'b'),
      att(true, 7000, 'c'),
    ]);
    expect(s.level).toBe('practicing');
    expect(gridColor(s)).toBe('developing');
  });

  it('mastered requires speed and multiple sessions', () => {
    const oneSession = play(emptyStats('p', 'x'), [1, 2, 3, 4, 5].map(() => att(true, 1500, 'only')));
    expect(oneSession.level).toBe('practicing');
    const two = play(oneSession, [att(true, 1400, 'next')]);
    expect(two.level).toBe('mastered');
    expect(gridColor(two)).toBe('mastered');
    expect(two.dueAt).toBeGreaterThan(two.lastPracticed);
  });

  it('a miss drops a mastered fact back and makes it due now', () => {
    let s = play(emptyStats('p', 'x'), [
      att(true, 1500, 'a'),
      att(true, 1500, 'a'),
      att(true, 1500, 'b'),
      att(true, 1500, 'b'),
      att(true, 1500, 'c'),
    ]);
    expect(s.level).toBe('mastered');
    s = recordAttempt(s, att(false, 2000, 'd'), T);
    expect(s.level).not.toBe('mastered');
    expect(s.dueAt).toBe(s.lastPracticed);
  });

  it('distinguishes fast, slow, incorrect', () => {
    expect(outcomeOf({ firstCorrect: true, ms: 1000 }, T)).toBe('fast');
    expect(outcomeOf({ firstCorrect: true, ms: 9000 }, T)).toBe('slow');
    expect(outcomeOf({ firstCorrect: false, ms: 1000 }, T)).toBe('incorrect');
  });
});

describe('SessionScheduler', () => {
  const pool = generateFactPool(DEFAULT_SETTINGS.ops);

  function statsWith(levels: Record<string, AttemptRecord[]>) {
    const m = new Map<string, FactStats>();
    for (const [id, atts] of Object.entries(levels)) m.set(id, play(emptyStats('p', id), atts));
    return m;
  }

  it('never asks the same fact back-to-back', () => {
    const s = new SessionScheduler(pool, new Map(), { rng: rng(1) });
    let prev: Fact | null = null;
    for (let i = 0; i < 300; i++) {
      const f = s.next();
      if (prev) expect(f.id).not.toBe(prev.id);
      s.report(f, i % 3 !== 0, 2000);
      prev = f;
    }
  });

  it('allocates more practice to a struggling fact than mastered ones', () => {
    const fast = (sess: string) => att(true, 1200, sess);
    const masteredIds = ['add:2:3', 'add:4:4', 'add:5:1', 'add:3:3', 'add:6:1', 'add:2:2', 'add:1:4', 'add:5:0'];
    const plan: Record<string, AttemptRecord[]> = {
      'add:8:7': [att(false, 6000, 'a'), att(false, 7000, 'b'), att(true, 8000, 'c'), att(false, 9000, 'c')],
      'add:6:4': [att(true, 7000, 'a'), att(true, 8000, 'b'), att(true, 7500, 'c'), att(true, 7000, 'c')],
    };
    for (const id of masteredIds) plan[id] = [fast('a'), fast('a'), fast('b'), fast('b'), fast('c')];
    const stats = statsWith(plan);
    expect(stats.get('add:2:3')!.level).toBe('mastered');
    expect(stats.get('add:8:7')!.level).toBe('learning');
    expect(stats.get('add:6:4')!.level).toBe('practicing');

    const small = pool.filter((f) => f.id in plan);
    const counts: Record<string, number> = {};
    for (let run = 0; run < 40; run++) {
      const s = new SessionScheduler(small, new Map(stats), { rng: rng(run + 7), now: clock });
      for (let i = 0; i < 20; i++) {
        const f = s.next();
        counts[f.id] = (counts[f.id] ?? 0) + 1;
        s.report(f, f.id !== 'add:8:7', 2000);
      }
    }
    const avgMastered = masteredIds.reduce((a, id) => a + (counts[id] ?? 0), 0) / masteredIds.length;
    expect(counts['add:8:7']).toBeGreaterThan(avgMastered * 3);
    // slow-but-correct facts get extra practice too
    expect(counts['add:6:4']).toBeGreaterThan(avgMastered * 2);
  });

  it('revisits mastered facts once they are due (spaced repetition)', () => {
    const fast = (sess: string) => att(true, 1200, sess);
    const stats = statsWith({ 'add:2:3': [fast('a'), fast('a'), fast('b'), fast('b'), fast('c')] });
    const s = new SessionScheduler(pool, stats, { rng: rng(1), now: clock });
    const notDue = s.weightOf('add:2:3');
    const s2 = new SessionScheduler(pool, stats, { rng: rng(1), now: clock + 30 * 86400000 });
    expect(s2.weightOf('add:2:3')).toBeGreaterThan(notDue * 5);
  });

  it('brings a missed fact back later in the session', () => {
    const s = new SessionScheduler(pool, new Map(), { rng: rng(3) });
    const first = s.next();
    s.report(first, false, 4000);
    const following: string[] = [];
    for (let i = 0; i < 6; i++) {
      const f = s.next();
      following.push(f.id);
      s.report(f, true, 1500);
    }
    expect(following).toContain(first.id);
    expect(following[0]).not.toBe(first.id);
  });

  it('limits new facts that turn out to be hard', () => {
    const s = new SessionScheduler(pool, new Map(), { rng: rng(5), newPerSession: 4 });
    const distinct = new Set<string>();
    const stats = new Map<string, FactStats>();
    for (let i = 0; i < 40; i++) {
      const f = s.next();
      distinct.add(f.id);
      const correct = false; // everything is hard
      const st = recordAttempt(stats.get(f.id) ?? emptyStats('p', f.id), att(correct, 5000, 'x'), T);
      stats.set(f.id, st);
      s.updateStats(st);
      s.report(f, correct, 5000);
    }
    expect(distinct.size).toBeLessThanOrEqual(5);
  });

  it('keeps introducing new facts when they are already known', () => {
    const s = new SessionScheduler(pool, new Map(), { rng: rng(9), newPerSession: 4 });
    const distinct = new Set<string>();
    const stats = new Map<string, FactStats>();
    for (let i = 0; i < 30; i++) {
      const f = s.next();
      distinct.add(f.id);
      const st = recordAttempt(stats.get(f.id) ?? emptyStats('p', f.id), att(true, 1200, 'x'), T);
      stats.set(f.id, st);
      s.updateStats(st);
      s.report(f, true, 1200);
    }
    expect(distinct.size).toBeGreaterThan(8);
  });

  it('introduces easy facts before hard ones', () => {
    const s = new SessionScheduler(pool, new Map(), { rng: rng(11) });
    const firstFew = Array.from({ length: 5 }, () => {
      const f = s.next();
      s.report(f, true, 1000);
      return f;
    });
    for (const f of firstFew) expect(f.answer).toBeLessThanOrEqual(6);
  });

  it('a child who answers new facts fast reaches hard facts within the first round', async () => {
    const { gradePreset } = await import('../settings');
    const { difficulty } = await import('../math/facts');
    const g = gradePreset('3');
    const pool3 = generateFactPool(g.ops, g);
    const sorted = [...pool3].sort((a, b) => difficulty(a) - difficulty(b));
    const topThird = new Set(sorted.slice(Math.floor(sorted.length * 0.66)).map((f) => f.id));
    const s = new SessionScheduler(pool3, new Map(), { rng: rng(4) });
    const stats = new Map<string, FactStats>();
    let reached = false;
    for (let i = 0; i < 20; i++) {
      const f = s.next();
      if (topThird.has(f.id)) reached = true;
      const st = recordAttempt(stats.get(f.id) ?? emptyStats('p', f.id), att(true, 1200, 'x'), T);
      stats.set(f.id, st);
      s.updateStats(st);
      s.report(f, true, 1200);
    }
    expect(reached).toBe(true);
  });

  it('a child who is slow on new facts stays on easier facts', async () => {
    const { gradePreset } = await import('../settings');
    const { difficulty } = await import('../math/facts');
    const g = gradePreset('3');
    const pool3 = generateFactPool(g.ops, g);
    const sorted = [...pool3].sort((a, b) => difficulty(a) - difficulty(b));
    const topThird = new Set(sorted.slice(Math.floor(sorted.length * 0.66)).map((f) => f.id));
    const s = new SessionScheduler(pool3, new Map(), { rng: rng(4) });
    const stats = new Map<string, FactStats>();
    let hard = 0;
    for (let i = 0; i < 20; i++) {
      const f = s.next();
      if (topThird.has(f.id)) hard++;
      const st = recordAttempt(stats.get(f.id) ?? emptyStats('p', f.id), att(true, 7000, 'x'), T);
      stats.set(f.id, st);
      s.updateStats(st);
      s.report(f, true, 7000);
    }
    expect(hard).toBeLessThanOrEqual(1);
  });

  it('the next round resumes at the child\'s level instead of starting over', async () => {
    const { gradePreset } = await import('../settings');
    const { difficulty } = await import('../math/facts');
    const g = gradePreset('3');
    const pool3 = generateFactPool(g.ops, g);
    const sorted = [...pool3].sort((a, b) => difficulty(a) - difficulty(b));
    const rankOf = new Map(sorted.map((f, i) => [f.id, i]));
    // Already answered a hard fact quickly last time.
    const hardFact = sorted[Math.floor(sorted.length * 0.8)];
    const stats = new Map<string, FactStats>([[hardFact.id, play(emptyStats('p', hardFact.id), [att(true, 1200, 'prev')])]]);
    const s = new SessionScheduler(pool3, stats, { rng: rng(8) });
    const first = s.next();
    expect(rankOf.get(first.id)!).toBeGreaterThan(sorted.length * 0.5);
  });

  it('facts known on sight are mastered after fast answers in two sessions', () => {
    const s = play(emptyStats('p', 'x'), [att(true, 1200, 'a'), att(true, 1100, 'b')]);
    expect(s.level).toBe('mastered');
    const oneDay = play(emptyStats('p', 'y'), [att(true, 1200, 'a'), att(true, 1100, 'a')]);
    expect(oneDay.level).not.toBe('mastered');
  });

  it('targeted sessions only use the chosen facts', () => {
    const chosen = [makeFact('add', 8, 7), makeFact('add', 9, 6), makeFact('sub', 15, 8)];
    const s = new SessionScheduler(chosen, new Map(), { rng: rng(2), targeted: true });
    for (let i = 0; i < 30; i++) {
      const f = s.next();
      expect(chosen.map((c) => c.id)).toContain(f.id);
      s.report(f, true, 1000);
    }
  });
});

describe('rewards', () => {
  it('never negative, no speed bonus', () => {
    expect(pointsFor({ firstCorrect: false, solved: false, newlyMastered: false })).toBe(0);
    expect(pointsFor({ firstCorrect: true, solved: true, newlyMastered: false })).toBe(15);
    expect(pointsFor({ firstCorrect: true, solved: true, newlyMastered: true })).toBe(40);
  });
  it('stars', () => {
    expect(starsFor({ completed: true, questions: 20, firstTry: 18, improved: 1 })).toBe(3);
    expect(starsFor({ completed: true, questions: 20, firstTry: 5, improved: 0 })).toBe(1);
    expect(starsFor({ completed: false, questions: 20, firstTry: 20, improved: 3 })).toBe(0);
  });
  it('streaks', () => {
    let r = { ...DEFAULT_REWARDS, streak: bumpStreak(DEFAULT_REWARDS, '2026-10-01') };
    r = { ...r, streak: bumpStreak(r, '2026-10-02') };
    expect(r.streak.current).toBe(2);
    expect(liveStreak(r, '2026-10-03')).toBe(2);
    expect(liveStreak(r, '2026-10-05')).toBe(0);
    r = { ...r, streak: bumpStreak(r, '2026-10-05') };
    expect(r.streak.current).toBe(1);
    expect(r.streak.best).toBe(2);
  });
  it('each win adds the next piece of the outfit being built', () => {
    let r = { ...DEFAULT_REWARDS };
    const first = applyWin(r, 1);
    expect(first.reward).toMatchObject({ won: true, muscleBefore: 0, muscleAfter: 1, outfit: 'racer', pieces: 1, completed: false, wearingBefore: null });
    expect(first.rewards.wearing).toBe('racer'); // shown off right away
    r = first.rewards;
    for (let i = 0; i < 9; i++) r = applyWin(r, 2).rewards;
    expect(r.outfits.racer).toBe(10);
    expect(r.building).toBe('rapper'); // finished → moves on to the next outfit
    const next = applyWin(r, 1);
    expect(next.reward).toMatchObject({ outfit: 'rapper', pieces: 1 });
  });
  it('the 10th piece completes the outfit', () => {
    const r = { ...DEFAULT_REWARDS, outfits: { soldier: 9 }, building: 'soldier' as const, wins: 9 };
    const res = applyWin(r, 1);
    expect(res.reward).toMatchObject({ outfit: 'soldier', pieces: 10, completed: true });
  });
  it('the child can pick which outfit to build', () => {
    const r = { ...DEFAULT_REWARDS, building: 'garnet' as const };
    expect(applyWin(r, 1).reward.outfit).toBe('garnet');
  });
  it('no stars = no win, nothing taken away', () => {
    const r = { ...DEFAULT_REWARDS, wins: 5, outfits: { racer: 5 }, wearing: 'racer' as const };
    const res = applyWin(r, 0);
    expect(res.reward.won).toBe(false);
    expect(res.rewards).toEqual(r);
  });
  it('muscle levels cap at 5', () => {
    expect([0, 1, 2, 3, 6, 10, 15, 99].map(muscleLevel)).toEqual([0, 1, 1, 2, 3, 4, 5, 5]);
  });
});
