// Adaptive question scheduler.
//
// Picks the next fact for a session based on each fact's mastery level,
// speed, recent misses and spaced-repetition due date — not pure randomness.

import { difficulty, relatedFactIds, turnAroundId, type Fact } from '../math/facts';
import { DEFAULT_THRESHOLDS, medianCorrectMs, type FactStats, type Thresholds } from './mastery';

export interface SchedulerOptions {
  /** Max number of genuinely new (not-yet-known) facts introduced per session. */
  newPerSession: number;
  /** Stop introducing new facts while this many facts are still "learning". */
  maxLearning: number;
  thresholds: Thresholds;
  /** false = plain shuffled practice (still avoids back-to-back repeats). */
  adaptive: boolean;
  /** Targeted practice: every pool fact is fair game, no new-fact gating. */
  targeted: boolean;
  now: number;
  rng: () => number;
}

export const DEFAULT_SCHEDULER: SchedulerOptions = {
  newPerSession: 6,
  maxLearning: 6,
  thresholds: DEFAULT_THRESHOLDS,
  adaptive: true,
  targeted: false,
  now: Date.now(),
  rng: Math.random,
};

/** Facts answered right and fast every time only need an occasional spot check. */
const KNOWN_WEIGHT = 0.6;

interface Requeue {
  factId: string;
  inQuestions: number;
}

export class SessionScheduler {
  private pool: Fact[];
  private byId: Map<string, Fact>;
  private stats: Map<string, FactStats>;
  private opts: SchedulerOptions;
  private recent: string[] = [];
  private askedCount = new Map<string, number>();
  private requeue: Requeue[] = [];
  private missedThisSession = new Set<string>();
  private boosted = new Set<string>(); // related to something missed
  /** Answered right and fast this session – no need to drill again today. */
  private fluentToday = new Set<string>();
  /**
   * Placement: how far into the unseen facts (easiest → hardest) new facts are
   * drawn from. Fast answers to new facts push it ahead by `jump`, which
   * doubles each time; a slow or missed new fact pulls it back.
   */
  private offset = 0;
  private jump = 4;
  /** New facts shown this session that turned out NOT to be already known. */
  private newStruggles = 0;
  private introduced = new Set<string>();
  private unseenSorted: Fact[];

  constructor(pool: Fact[], stats: Map<string, FactStats>, opts: Partial<SchedulerOptions> = {}) {
    if (!pool.length) throw new Error('Empty fact pool');
    this.pool = pool;
    this.byId = new Map(pool.map((f) => [f.id, f]));
    this.stats = stats;
    this.opts = { ...DEFAULT_SCHEDULER, now: Date.now(), ...opts };
    this.unseenSorted = pool
      .filter((f) => !this.isSeen(f.id))
      .sort((a, b) => difficulty(a) - difficulty(b));
    this.offset = this.startingOffset();
  }

  /**
   * Resume where the child left off: start new facts just below the hardest
   * fact they've already answered quickly and correctly, instead of going back
   * to the easiest unseen ones every session.
   */
  private startingOffset(): number {
    let hardest = -Infinity;
    for (const f of this.pool) {
      const st = this.stats.get(f.id);
      const last = st?.history[st.history.length - 1];
      const fluent = last && last.firstCorrect && !last.hinted && (last.ms === null || last.ms <= this.opts.thresholds.fastMs);
      if (fluent && st!.level !== 'learning') hardest = Math.max(hardest, difficulty(f));
    }
    if (hardest === -Infinity) return 0;
    const below = this.unseenSorted.filter((f) => difficulty(f) < hardest).length;
    return Math.max(0, below - Math.ceil(this.windowSize(this.unseenSorted.length) / 2));
  }

  private windowSize(remaining: number) {
    return Math.max(3, Math.ceil(remaining * 0.08));
  }

  private isSeen(id: string) {
    return (this.stats.get(id)?.presented ?? 0) > 0;
  }

  /** Update stats after the game persisted them (so levels stay current). */
  updateStats(s: FactStats) {
    this.stats.set(s.factId, s);
  }

  /** Called once per finished question. */
  report(fact: Fact, firstCorrect: boolean, ms: number | null) {
    const wasIntroduced = this.introduced.has(fact.id) && (this.askedCount.get(fact.id) ?? 0) === 1;
    const fast = firstCorrect && ms !== null && ms <= this.opts.thresholds.fastMs;
    if (fast && !this.missedThisSession.has(fact.id)) this.fluentToday.add(fact.id);
    else this.fluentToday.delete(fact.id);
    if (wasIntroduced) {
      if (fast) {
        this.offset += this.jump;
        this.jump = Math.min(this.jump * 2, 64);
      } else {
        // Too hard (or slow): step back toward easier facts and climb carefully.
        this.offset = Math.max(0, this.offset - this.jump);
        this.jump = 2;
      }
    }
    // A missed fact that has now been answered correctly goes back to normal priority.
    if (firstCorrect && this.missedThisSession.has(fact.id)) this.missedThisSession.delete(fact.id);
    if (!firstCorrect) {
      // Bring missed facts back a few questions later.
      this.missedThisSession.add(fact.id);
      this.addRequeue(fact.id, 3);
      for (const r of relatedFactIds(fact)) if (this.byId.has(r)) this.boosted.add(r);
      if (wasIntroduced) this.newStruggles++;
    } else if (ms !== null && ms > this.opts.thresholds.slowMs) {
      // Correct but slow: one more look later in the session.
      if (!this.requeue.some((r) => r.factId === fact.id) && (this.askedCount.get(fact.id) ?? 0) < 3)
        this.addRequeue(fact.id, 6);
      if (wasIntroduced) this.newStruggles++;
    }
  }

  private addRequeue(factId: string, n: number) {
    if (this.pool.length < 3) return;
    const gap = Math.min(n, this.pool.length - 1);
    this.requeue = this.requeue.filter((r) => r.factId !== factId);
    this.requeue.push({ factId, inQuestions: gap });
  }

  private blocked(id: string): boolean {
    // Never the same fact (or its turn-around twin) as the previous question,
    // and avoid anything from the last 2 questions when possible.
    if (this.recent.slice(-2).includes(id)) return true;
    const last = this.recent[this.recent.length - 1];
    if (last) {
      const lf = this.byId.get(last);
      if (lf && turnAroundId(lf) === id) return true;
    }
    return false;
  }

  /** Weight of an already-seen fact. Exposed for tests. */
  weightOf(id: string): number {
    const s = this.stats.get(id);
    const t = this.opts.thresholds;
    let w: number;
    if (!s || s.presented === 0) w = 0;
    else
      switch (s.level) {
        case 'learning':
          w = 10;
          break;
        case 'new':
          w = this.looksKnown(id) ? KNOWN_WEIGHT : 6;
          break;
        case 'practicing': {
          w = this.looksKnown(id) ? KNOWN_WEIGHT : 4;
          const med = medianCorrectMs(s);
          if (med !== null && med > t.slowMs) w += 4;
          else if (med !== null && med > t.fastMs) w += 2;
          break;
        }
        case 'mastered':
          w = s.dueAt <= this.opts.now ? 2.5 : 0.25;
          break;
      }
    if (this.fluentToday.has(id)) w *= 0.15;
    if (this.missedThisSession.has(id)) w *= 2;
    if (this.boosted.has(id)) w *= 1.5;
    const asked = this.askedCount.get(id) ?? 0;
    w /= 1 + asked * 0.8;
    return w;
  }

  /** Every attempt so far was right and fast – probably already known, just not proven yet. */
  private looksKnown(id: string): boolean {
    const s = this.stats.get(id);
    if (!s || !s.history.length || s.level === 'mastered') return false;
    return s.history.every((a) => a.firstCorrect && !a.hinted && (a.ms === null || a.ms <= this.opts.thresholds.fastMs));
  }

  private learningCount(): number {
    let n = 0;
    for (const f of this.pool) if (this.stats.get(f.id)?.level === 'learning') n++;
    return n;
  }

  private canIntroduce(): boolean {
    if (this.opts.targeted) return true;
    if (this.newStruggles >= this.opts.newPerSession) return false;
    if (this.learningCount() >= this.opts.maxLearning) return false;
    return true;
  }

  private pickNew(): Fact | null {
    const remaining = this.unseenSorted.filter((f) => !this.introduced.has(f.id) && !this.blocked(f.id));
    if (!remaining.length) return null;
    // Choose among the easiest handful so difficulty grows gradually but
    // questions don't arrive in a predictable order.
    const k = this.windowSize(remaining.length);
    // Mostly draw from the child's current level; now and then back-fill an
    // easier fact that placement skipped over, so nothing is left out for good.
    const backfill = this.offset > 0 && this.opts.rng() < 0.15;
    const start = backfill ? 0 : Math.min(Math.max(0, remaining.length - k), this.offset);
    const window = remaining.slice(start, start + k);
    // Prefer facts whose turn-around/related fact is already known – they're a
    // smaller step.
    const known = window.filter((f) =>
      relatedFactIds(f).some((r) => {
        const lv = this.stats.get(r)?.level;
        return lv === 'mastered' || lv === 'practicing';
      }),
    );
    const from = known.length && this.opts.rng() < 0.6 ? known : window;
    return from[Math.floor(this.opts.rng() * from.length)];
  }

  private weightedPick(candidates: Fact[]): Fact | null {
    const weights = candidates.map((f) => this.weightOf(f.id));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let r = this.opts.rng() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  next(): Fact {
    const fact = this.choose();
    this.recent.push(fact.id);
    if (this.recent.length > 5) this.recent.shift();
    this.askedCount.set(fact.id, (this.askedCount.get(fact.id) ?? 0) + 1);
    for (const r of this.requeue) r.inQuestions--;
    this.requeue = this.requeue.filter((r) => r.factId !== fact.id);
    if (!this.isSeen(fact.id)) this.introduced.add(fact.id);
    return fact;
  }

  private choose(): Fact {
    const rng = this.opts.rng;

    if (!this.opts.adaptive) {
      const options = this.pool.filter((f) => !this.blocked(f.id));
      const from = options.length ? options : this.pool;
      return from[Math.floor(rng() * from.length)];
    }

    // 1. A missed fact that is due to come back.
    const due = this.requeue
      .filter((r) => r.inQuestions <= 0 && !this.blocked(r.factId))
      .sort((a, b) => a.inQuestions - b.inQuestions)[0];
    if (due) return this.byId.get(due.factId)!;

    // 2. Seen facts (and facts introduced this session) by weight, mixed with
    //    occasional new facts.
    const seen = this.pool.filter((f) => (this.isSeen(f.id) || this.introduced.has(f.id)) && !this.blocked(f.id));
    const seenWeight = seen.reduce((a, f) => a + this.weightOf(f.id), 0);

    if (this.opts.targeted) {
      const all = this.pool.filter((f) => !this.blocked(f.id));
      const pick = this.weightedPick(all.map((f) => f)) ?? all[Math.floor(rng() * all.length)];
      if (pick) return pick;
    }

    // Probability of introducing something new rises when there's little
    // left that needs work.
    const needsWork = seen.filter((f) => {
      const lv = this.stats.get(f.id)?.level;
      return lv !== 'mastered' && !this.fluentToday.has(f.id) && !this.looksKnown(f.id);
    }).length;
    const newChance = needsWork === 0 ? 0.8 : needsWork < 4 ? 0.6 : needsWork < 8 ? 0.35 : 0.15;
    // Little worth reviewing right now (only fluent facts left) → bring in something new.
    if (this.canIntroduce() && (seenWeight < 3 || rng() < newChance)) {
      const n = this.pickNew();
      if (n) return n;
    }

    const w = this.weightedPick(seen);
    if (w) return w;

    // 3. Fallbacks: something new, then anything not blocked, then anything.
    const n = this.pickNew();
    if (n) return n;
    const open = this.pool.filter((f) => !this.blocked(f.id));
    const from = open.length ? open : this.pool;
    return from[Math.floor(rng() * from.length)];
  }
}
