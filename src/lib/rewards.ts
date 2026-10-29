import { nextIncomplete, PIECES_PER_OUTFIT, type OutfitId, type OutfitProgress } from './outfits';

// Points, stars, streaks, milestones and unlockable cosmetics.
// Points are never taken away. Speed is not rewarded with points, so there is
// no incentive to guess or rush.

export interface Rewards {
  points: number;
  stars: number;
  streak: { current: number; best: number; lastDay: string | null };
  theme: ThemeId;
  /** Pieces collected per outfit (0–10). */
  outfits: OutfitProgress;
  /** Outfit the next win adds a piece to. */
  building: OutfitId | null;
  /** Outfit the character is currently wearing. */
  wearing: OutfitId | null;
  milestones: string[];
  totalQuestions: number;
  /** Sessions finished with at least one star. Wins grow muscles and unlock accessories. */
  wins: number;
}

export type ThemeId = 'sky' | 'jungle' | 'ocean' | 'space' | 'candy' | 'sunset';


export const THEMES: { id: ThemeId; name: string; stars: number; emoji: string }[] = [
  { id: 'sky', name: 'Sky', stars: 0, emoji: '☁️' },
  { id: 'jungle', name: 'Jungle', stars: 5, emoji: '🌿' },
  { id: 'ocean', name: 'Ocean', stars: 12, emoji: '🐠' },
  { id: 'candy', name: 'Candy', stars: 20, emoji: '🍭' },
  { id: 'sunset', name: 'Sunset', stars: 30, emoji: '🌅' },
  { id: 'space', name: 'Space', stars: 45, emoji: '🚀' },
];

/** Mascot props for whatever the character is wearing. */
export function wornProps(r: Pick<Rewards, 'wearing' | 'outfits'>): { outfit: OutfitId | null; pieces: number } {
  return { outfit: r.wearing, pieces: r.wearing ? (r.outfits[r.wearing] ?? 0) : 0 };
}

/** Wins needed for each muscle level (index = level). */
export const MUSCLE_LEVELS = [0, 1, 3, 6, 10, 15];
export const MAX_MUSCLE = MUSCLE_LEVELS.length - 1;

export function muscleLevel(wins: number): number {
  let lv = 0;
  for (let i = 0; i < MUSCLE_LEVELS.length; i++) if (wins >= MUSCLE_LEVELS[i]) lv = i;
  return lv;
}

/** Wins still needed for the next muscle level (null at max). */
export function winsToNextMuscle(wins: number): number | null {
  const lv = muscleLevel(wins);
  return lv >= MAX_MUSCLE ? null : MUSCLE_LEVELS[lv + 1] - wins;
}

export interface WinReward {
  won: boolean;
  muscleBefore: number;
  muscleAfter: number;
  /** Outfit that got a new piece (null when not a win or every outfit is complete). */
  outfit: OutfitId | null;
  /** Pieces of that outfit after this win (1–10). */
  pieces: number;
  /** This win finished the outfit. */
  completed: boolean;
  /** What the character wore before, for the before → after reveal. */
  wearingBefore: OutfitId | null;
  piecesBefore: number;
}

/** Applies a session result: a win (≥1 star) adds muscle and the next outfit piece. */
export function applyWin(r: Rewards, stars: number): { rewards: Rewards; reward: WinReward } {
  const muscleBefore = muscleLevel(r.wins);
  const wearingBefore = r.wearing;
  const piecesBefore = wearingBefore ? (r.outfits[wearingBefore] ?? 0) : 0;
  const none = { outfit: null, pieces: 0, completed: false, wearingBefore, piecesBefore };
  if (stars <= 0) return { rewards: r, reward: { won: false, muscleBefore, muscleAfter: muscleBefore, ...none } };
  const wins = r.wins + 1;
  const building =
    r.building && (r.outfits[r.building] ?? 0) < PIECES_PER_OUTFIT ? r.building : nextIncomplete(r.outfits);
  const muscleAfter = muscleLevel(wins);
  if (!building) return { rewards: { ...r, wins }, reward: { won: true, muscleBefore, muscleAfter, ...none } };
  const pieces = (r.outfits[building] ?? 0) + 1;
  const outfits = { ...r.outfits, [building]: pieces };
  const completed = pieces >= PIECES_PER_OUTFIT;
  return {
    rewards: {
      ...r,
      wins,
      outfits,
      wearing: building, // show off the new piece right away
      building: completed ? nextIncomplete(outfits, building) : building,
    },
    reward: { won: true, muscleBefore, muscleAfter, outfit: building, pieces, completed, wearingBefore, piecesBefore },
  };
}

export const DEFAULT_REWARDS: Rewards = {
  points: 0,
  stars: 0,
  streak: { current: 0, best: 0, lastDay: null },
  theme: 'sky',
  outfits: {},
  building: 'racer',
  wearing: null,
  milestones: [],
  totalQuestions: 0,
  wins: 0,
};

export const POINTS = {
  correct: 10,
  firstTry: 5,
  /** A fact just reached "mastered". */
  newlyMastered: 25,
  /** Keep trying after a miss – effort is rewarded, too. */
  persevered: 5,
};

export function pointsFor(opts: { firstCorrect: boolean; solved: boolean; newlyMastered: boolean }): number {
  let p = 0;
  if (opts.solved) p += POINTS.correct;
  if (opts.firstCorrect) p += POINTS.firstTry;
  else if (opts.solved) p += POINTS.persevered;
  if (opts.newlyMastered) p += POINTS.newlyMastered;
  return p;
}

/**
 * Stars for a session: 1 for finishing, +1 for ≥80% first-try accuracy,
 * +1 for mastering or improving at least one fact.
 */
export function starsFor(opts: { completed: boolean; questions: number; firstTry: number; improved: number }): number {
  if (!opts.completed || opts.questions < 5) return 0;
  let s = 1;
  if (opts.firstTry / opts.questions >= 0.8) s++;
  if (opts.improved > 0) s++;
  return s;
}

export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function bumpStreak(r: Rewards, today = dayKey()): Rewards['streak'] {
  const { current, best, lastDay } = r.streak;
  if (lastDay === today) return r.streak;
  const y = new Date(today + 'T12:00:00');
  y.setDate(y.getDate() - 1);
  const next = lastDay === dayKey(y) ? current + 1 : 1;
  return { current: next, best: Math.max(best, next), lastDay: today };
}

/** Displayed streak: resets to 0 if a day was skipped. */
export function liveStreak(r: Rewards, today = dayKey()): number {
  if (!r.streak.lastDay) return 0;
  if (r.streak.lastDay === today) return r.streak.current;
  const y = new Date(today + 'T12:00:00');
  y.setDate(y.getDate() - 1);
  return r.streak.lastDay === dayKey(y) ? r.streak.current : 0;
}

export interface Milestone {
  id: string;
  emoji: string;
  label: string;
}

/** Returns milestones newly reached (not already in r.milestones). */
export function newMilestones(r: Rewards, mastered: number): Milestone[] {
  const out: Milestone[] = [];
  const check = (id: string, ok: boolean, emoji: string, label: string) => {
    if (ok && !r.milestones.includes(id)) out.push({ id, emoji, label });
  };
  for (const n of [50, 100, 250, 500, 1000, 2500])
    check(`q${n}`, r.totalQuestions >= n, '🎯', `${n} questions!`);
  for (const n of [5, 10, 25, 50, 100, 200]) check(`m${n}`, mastered >= n, '🏅', `${n} facts mastered!`);
  for (const n of [3, 7, 14, 30, 100]) check(`s${n}`, r.streak.current >= n, '🔥', `${n} day streak!`);
  for (const t of THEMES.slice(1)) check(`t-${t.id}`, r.stars >= t.stars, t.emoji, `${t.name} world unlocked!`);
  return out;
}
