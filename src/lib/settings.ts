import type { OperationSettings } from './math/facts';

export type Mode = 'practice' | 'challenge';
export type SessionLength = 10 | 20 | 30 | 50 | 'unlimited';

export type Grade = 'K' | '1' | '2' | '3' | '4' | '5';

export interface Settings {
  ops: OperationSettings;
  /** Grade preset the ops came from; null once the parent customizes ranges. */
  grade: Grade | null;
  /** Leave out trivial facts: +0, −0, n−n, ×0, ×1, ÷1. */
  skipEasy: boolean;
  /** Question count (ignored when timeLimitMin > 0). */
  length: SessionLength;
  /** 0 = untimed. */
  timeLimitMin: 0 | 2 | 5 | 10;
  mode: Mode;
  sound: boolean;
  hints: boolean;
  /** Show the child how long each answer took. */
  showTiming: boolean;
  voice: boolean;
  adaptive: boolean;
  fastMs: number;
  slowMs: number;
  newPerSession: number;
  /** Let the child switch between practice/challenge on the home screen. */
  childCanPickMode: boolean;
  /** Read problems aloud with the speaker button. */
  readAloud: boolean;
}

export const RANGE_PRESETS = {
  add: [5, 10, 20, 50, 100],
  sub: [10, 20, 50, 100],
};

function DEFAULT_OPS(): OperationSettings {
  return {
    add: { enabled: true, a: { min: 0, max: 10 }, b: { min: 0, max: 10 } },
    sub: { enabled: true, a: { min: 0, max: 10 }, b: { min: 0, max: 10 }, allowNegative: false },
    mul: { enabled: false, tables: [2, 5, 10], factors: { min: 0, max: 10 } },
    div: { enabled: false, tables: [2, 5, 10], quotients: { min: 0, max: 10 } },
  };
}

export const DEFAULT_SETTINGS: Settings = {
  ops: DEFAULT_OPS(),
  grade: '1',
  skipEasy: false,
  length: 20,
  timeLimitMin: 0,
  mode: 'practice',
  sound: true,
  hints: true,
  showTiming: false,
  voice: true,
  adaptive: true,
  fastMs: 3000,
  slowMs: 6000,
  newPerSession: 6,
  childCanPickMode: true,
  readAloud: true,
};

const r = (min: number, max: number) => ({ min, max });
const tables = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/**
 * Grade presets, loosely following US fact-fluency goals:
 * K: +/− within 5 · 1: within 10 · 2: within 20 · 3: × ÷ tables to 10 ·
 * 4: tables to 12 · 5+: mental + and − to 100 with all tables.
 */
export const GRADES: { id: Grade; label: string; summary: string; ops: OperationSettings; skipEasy: boolean }[] = [
  {
    id: 'K',
    label: 'K',
    summary: '+ and − with numbers 0–5',
    skipEasy: false,
    ops: {
      add: { enabled: true, a: r(0, 5), b: r(0, 5) },
      sub: { enabled: true, a: r(0, 5), b: r(0, 5), allowNegative: false },
      mul: { enabled: false, tables: [2, 5, 10], factors: r(0, 10) },
      div: { enabled: false, tables: [2, 5, 10], quotients: r(0, 10) },
    },
  },
  {
    id: '1',
    label: '1st',
    summary: '+ and − within 10',
    skipEasy: false,
    ops: DEFAULT_OPS(),
  },
  {
    id: '2',
    label: '2nd',
    summary: '+ and − within 20 (e.g. 8 + 7, 15 − 9)',
    skipEasy: true,
    ops: {
      add: { enabled: true, a: r(2, 10), b: r(2, 10) },
      sub: { enabled: true, a: r(4, 20), b: r(2, 10), allowNegative: false },
      mul: { enabled: false, tables: [2, 5, 10], factors: r(0, 10) },
      div: { enabled: false, tables: [2, 5, 10], quotients: r(0, 10) },
    },
  },
  {
    id: '3',
    label: '3rd',
    summary: '× and ÷ tables 2–10, plus + and − within 20',
    skipEasy: true,
    ops: {
      add: { enabled: true, a: r(2, 10), b: r(2, 10) },
      sub: { enabled: true, a: r(4, 20), b: r(2, 10), allowNegative: false },
      mul: { enabled: true, tables: tables(2, 10), factors: r(2, 10) },
      div: { enabled: true, tables: tables(2, 10), quotients: r(2, 10) },
    },
  },
  {
    id: '4',
    label: '4th',
    summary: '× and ÷ tables 2–12, + and − within 20',
    skipEasy: true,
    ops: {
      add: { enabled: true, a: r(2, 10), b: r(2, 10) },
      sub: { enabled: true, a: r(4, 20), b: r(2, 10), allowNegative: false },
      mul: { enabled: true, tables: tables(2, 12), factors: r(2, 12) },
      div: { enabled: true, tables: tables(2, 12), quotients: r(2, 12) },
    },
  },
  {
    id: '5',
    label: '5th+',
    summary: 'All tables to 12, mental + and − to 100',
    skipEasy: true,
    ops: {
      add: { enabled: true, a: r(10, 100), b: r(2, 50) },
      sub: { enabled: true, a: r(10, 100), b: r(2, 50), allowNegative: false },
      mul: { enabled: true, tables: tables(2, 12), factors: r(2, 12) },
      div: { enabled: true, tables: tables(2, 12), quotients: r(2, 12) },
    },
  },
];

/** Settings patch that applies a grade preset. */
export function gradePreset(id: Grade): Pick<Settings, 'grade' | 'ops' | 'skipEasy'> {
  const g = GRADES.find((x) => x.id === id)!;
  return { grade: id, ops: structuredClone(g.ops), skipEasy: g.skipEasy };
}

/** Merges stored settings over defaults so new fields get sensible values. */
export function withDefaults(s: Partial<Settings> | undefined): Settings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s) return d;
  const merged: Settings = {
    ...d,
    ...s,
    ops: {
      add: { ...d.ops.add, ...s.ops?.add },
      sub: { ...d.ops.sub, ...s.ops?.sub },
      mul: { ...d.ops.mul, ...s.ops?.mul },
      div: { ...d.ops.div, ...s.ops?.div },
    },
  };
  // Settings saved before grades existed: recognise a matching preset, else "custom".
  if (s.grade === undefined) merged.grade = matchGrade(merged);
  return merged;
}

/** The grade whose preset exactly matches these settings, or null. */
export function matchGrade(s: Pick<Settings, 'ops' | 'skipEasy'>): Grade | null {
  const key = JSON.stringify(s.ops);
  return GRADES.find((g) => g.skipEasy === s.skipEasy && JSON.stringify(g.ops) === key)?.id ?? null;
}
