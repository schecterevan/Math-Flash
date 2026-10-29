// Math fact model + reusable problem generator.
// A "fact" is a single arithmetic problem such as 8 + 5. Every fact has a
// stable id so performance can be tracked per fact across sessions.

export type Op = 'add' | 'sub' | 'mul' | 'div';

export interface Fact {
  id: string;
  op: Op;
  a: number;
  b: number;
  answer: number;
}

export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' };
export const OP_NAME: Record<Op, string> = {
  add: 'Addition',
  sub: 'Subtraction',
  mul: 'Multiplication',
  div: 'Division',
};

export interface Range {
  min: number;
  max: number;
}

export interface AddSettings {
  enabled: boolean;
  /** Operand range for the first number. */
  a: Range;
  /** Operand range for the second number. */
  b: Range;
}

export interface SubSettings {
  enabled: boolean;
  /** Range for the number being subtracted from. */
  a: Range;
  /** Range for the number being subtracted. */
  b: Range;
  allowNegative: boolean;
}

export interface MulSettings {
  enabled: boolean;
  /** Selected times tables, e.g. [2, 5, 10]. */
  tables: number[];
  /** Range of the other factor, e.g. 0–10. */
  factors: Range;
}

export interface DivSettings {
  enabled: boolean;
  /** Divisors (the "table" the division fact comes from). */
  tables: number[];
  /** Range of whole-number quotients. */
  quotients: Range;
}

export interface OperationSettings {
  add: AddSettings;
  sub: SubSettings;
  mul: MulSettings;
  div: DivSettings;
}

export function compute(op: Op, a: number, b: number): number {
  switch (op) {
    case 'add':
      return a + b;
    case 'sub':
      return a - b;
    case 'mul':
      return a * b;
    case 'div':
      if (b === 0) throw new Error('Division by zero');
      return a / b;
  }
}

export function factId(op: Op, a: number, b: number): string {
  return `${op}:${a}:${b}`;
}

export function makeFact(op: Op, a: number, b: number): Fact {
  return { id: factId(op, a, b), op, a, b, answer: compute(op, a, b) };
}

export function parseFactId(id: string): Fact {
  const [op, a, b] = id.split(':');
  return makeFact(op as Op, Number(a), Number(b));
}

export function formatFact(f: Pick<Fact, 'op' | 'a' | 'b'>): string {
  return `${f.a} ${OP_SYMBOL[f.op]} ${f.b}`;
}

/** Checks a numeric answer against a fact. */
export function checkAnswer(fact: Fact, value: number | null | undefined): boolean {
  return value !== null && value !== undefined && Number.isFinite(value) && value === fact.answer;
}

function span(r: Range): number[] {
  const lo = Math.max(0, Math.min(r.min, r.max));
  const hi = Math.max(r.min, r.max);
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

/** Hard cap so silly custom ranges can't freeze the browser. */
export const MAX_POOL = 20000;

/** Trivial facts a child can answer without knowing any math fact. */
export function isTrivial(f: Fact): boolean {
  switch (f.op) {
    case 'add':
      return f.a === 0 || f.b === 0;
    case 'sub':
      return f.b === 0 || f.a === f.b;
    case 'mul':
      return f.a <= 1 || f.b <= 1;
    case 'div':
      return f.b === 1 || f.answer <= 1;
  }
}

/** Builds every fact allowed by the parent's settings. */
export function generateFactPool(ops: OperationSettings, opts: { skipEasy?: boolean } = {}): Fact[] {
  const all = buildPool(ops);
  if (!opts.skipEasy) return all;
  const filtered = all.filter((f) => !isTrivial(f));
  return filtered.length ? filtered : all;
}

function buildPool(ops: OperationSettings): Fact[] {
  const pool = new Map<string, Fact>();
  const add = (f: Fact) => {
    if (pool.size < MAX_POOL) pool.set(f.id, f);
  };

  if (ops.add.enabled) {
    for (const a of span(ops.add.a)) for (const b of span(ops.add.b)) add(makeFact('add', a, b));
  }
  if (ops.sub.enabled) {
    for (const a of span(ops.sub.a))
      for (const b of span(ops.sub.b)) {
        if (!ops.sub.allowNegative && b > a) continue;
        add(makeFact('sub', a, b));
      }
  }
  if (ops.mul.enabled) {
    for (const t of ops.mul.tables)
      for (const f of span(ops.mul.factors)) {
        add(makeFact('mul', t, f));
        add(makeFact('mul', f, t));
      }
  }
  if (ops.div.enabled) {
    for (const d of ops.div.tables) {
      if (d === 0) continue;
      for (const q of span(ops.div.quotients)) add(makeFact('div', d * q, d));
    }
  }
  return [...pool.values()];
}

/**
 * Rough difficulty score used to introduce new facts from easy to hard.
 * Bigger numbers, crossing ten, and larger tables are harder.
 */
export function difficulty(f: Fact): number {
  switch (f.op) {
    case 'add': {
      const crossesTen = (f.a % 10) + (f.b % 10) >= 10 ? 4 : 0;
      const zeroOrOne = Math.min(f.a, f.b) <= 1 ? -3 : 0;
      return f.answer + crossesTen + zeroOrOne + Math.min(f.a, f.b) * 0.5;
    }
    case 'sub': {
      const borrows = f.a % 10 < f.b % 10 ? 4 : 0;
      const easy = f.b <= 1 || f.b === f.a ? -3 : 0;
      return f.a + borrows + easy + f.b * 0.5 + 1;
    }
    case 'mul': {
      const easy = Math.min(f.a, f.b) <= 1 || f.a === 10 || f.b === 10 ? -10 : 0;
      return f.answer * 0.6 + easy + 5;
    }
    case 'div': {
      const easy = f.b === 1 || f.answer <= 1 || f.b === 10 ? -10 : 0;
      return f.a * 0.6 + easy + 8;
    }
  }
}

/**
 * Facts that are mathematically related: turn-around (commutative) facts and
 * inverse facts in the same fact family (8+5 ↔ 13−5, 3×4 ↔ 12÷4).
 */
export function relatedFactIds(f: Fact): string[] {
  const out = new Set<string>();
  switch (f.op) {
    case 'add':
      out.add(factId('add', f.b, f.a));
      out.add(factId('sub', f.answer, f.b));
      out.add(factId('sub', f.answer, f.a));
      break;
    case 'sub':
      out.add(factId('add', f.b, f.answer));
      out.add(factId('add', f.answer, f.b));
      out.add(factId('sub', f.a, f.answer));
      break;
    case 'mul':
      out.add(factId('mul', f.b, f.a));
      if (f.b !== 0) out.add(factId('div', f.answer, f.b));
      if (f.a !== 0) out.add(factId('div', f.answer, f.a));
      break;
    case 'div':
      out.add(factId('mul', f.answer, f.b));
      out.add(factId('mul', f.b, f.answer));
      if (f.answer !== 0) out.add(factId('div', f.a, f.answer));
      break;
  }
  out.delete(f.id);
  return [...out];
}

/** The turn-around fact (only for + and ×). */
export function turnAroundId(f: Fact): string | null {
  if (f.op === 'add' || f.op === 'mul') return f.a === f.b ? null : factId(f.op, f.b, f.a);
  return null;
}

/** Band used by the dashboard for "progress by difficulty level". */
export function bandOf(f: Fact): string {
  const m = f.op === 'div' ? f.answer : Math.max(f.a, f.b);
  if (f.op === 'mul' || f.op === 'div') return m <= 5 ? '0–5' : m <= 10 ? '6–10' : '11+';
  if (m <= 5) return '0–5';
  if (m <= 10) return '6–10';
  if (m <= 20) return '11–20';
  if (m <= 50) return '21–50';
  return '51–100+';
}
