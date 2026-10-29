import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  compute,
  generateFactPool,
  isTrivial,
  makeFact,
  parseFactId,
  relatedFactIds,
  type OperationSettings,
} from '../math/facts';
import { DEFAULT_SETTINGS } from '../settings';

const ops = (patch: Partial<OperationSettings>): OperationSettings => ({
  add: { ...DEFAULT_SETTINGS.ops.add, enabled: false },
  sub: { ...DEFAULT_SETTINGS.ops.sub, enabled: false },
  mul: { ...DEFAULT_SETTINGS.ops.mul, enabled: false },
  div: { ...DEFAULT_SETTINGS.ops.div, enabled: false },
  ...patch,
});

function verify(f: { op: string; a: number; b: number; answer: number }) {
  switch (f.op) {
    case 'add':
      return f.a + f.b === f.answer;
    case 'sub':
      return f.a - f.b === f.answer;
    case 'mul':
      return f.a * f.b === f.answer;
    case 'div':
      return f.b !== 0 && f.answer * f.b === f.a && Number.isInteger(f.answer);
  }
  return false;
}

describe('generateFactPool', () => {
  it('default settings: addition + subtraction 0–10, no negatives', () => {
    const pool = generateFactPool(DEFAULT_SETTINGS.ops);
    expect(pool.length).toBe(121 + 66);
    expect(new Set(pool.map((f) => f.op))).toEqual(new Set(['add', 'sub']));
    for (const f of pool) {
      expect(verify(f)).toBe(true);
      expect(f.answer).toBeGreaterThanOrEqual(0);
      expect(f.a).toBeLessThanOrEqual(10);
      expect(f.b).toBeLessThanOrEqual(10);
    }
  });

  it('every generated fact is mathematically correct for wide settings', () => {
    const pool = generateFactPool(
      ops({
        add: { enabled: true, a: { min: 0, max: 50 }, b: { min: 0, max: 50 } },
        sub: { enabled: true, a: { min: 0, max: 50 }, b: { min: 0, max: 50 }, allowNegative: true },
        mul: { enabled: true, tables: [0, 1, 2, 3, 7, 9, 12], factors: { min: 0, max: 12 } },
        div: { enabled: true, tables: [0, 1, 3, 7, 12], quotients: { min: 0, max: 12 } },
      }),
    );
    expect(pool.length).toBeGreaterThan(5000);
    for (const f of pool) expect(verify(f)).toBe(true);
    expect(pool.some((f) => f.answer < 0)).toBe(true);
  });

  it('respects the no-negative option', () => {
    const pool = generateFactPool(
      ops({ sub: { enabled: true, a: { min: 0, max: 20 }, b: { min: 0, max: 20 }, allowNegative: false } }),
    );
    expect(pool.every((f) => f.answer >= 0)).toBe(true);
    expect(pool.some((f) => f.a === 20 && f.b === 20)).toBe(true);
  });

  it('respects custom addition ranges', () => {
    const pool = generateFactPool(ops({ add: { enabled: true, a: { min: 6, max: 9 }, b: { min: 3, max: 4 } } }));
    expect(pool.length).toBe(8);
    expect(pool.every((f) => f.a >= 6 && f.a <= 9 && f.b >= 3 && f.b <= 4)).toBe(true);
  });

  it('multiplication uses only selected tables (both orders)', () => {
    const pool = generateFactPool(ops({ mul: { enabled: true, tables: [3], factors: { min: 0, max: 10 } } }));
    expect(pool.every((f) => f.a === 3 || f.b === 3)).toBe(true);
    expect(pool.find((f) => f.id === 'mul:3:7')).toBeTruthy();
    expect(pool.find((f) => f.id === 'mul:7:3')).toBeTruthy();
    expect(pool.length).toBe(21); // 3×0..3×10 and 0×3..10×3, minus duplicate 3×3
  });

  it('division gives whole-number answers from selected tables only', () => {
    const pool = generateFactPool(ops({ div: { enabled: true, tables: [0, 4, 6], quotients: { min: 1, max: 10 } } }));
    expect(pool.length).toBe(20);
    for (const f of pool) {
      expect([4, 6]).toContain(f.b);
      expect(Number.isInteger(f.answer)).toBe(true);
      expect(verify(f)).toBe(true);
    }
  });

  it('returns nothing when every operation is disabled', () => {
    expect(generateFactPool(ops({}))).toEqual([]);
  });
});

describe('answer checking', () => {
  it('accepts only the exact answer', () => {
    const f = makeFact('add', 8, 5);
    expect(checkAnswer(f, 13)).toBe(true);
    expect(checkAnswer(f, 12)).toBe(false);
    expect(checkAnswer(f, null)).toBe(false);
    expect(checkAnswer(f, NaN)).toBe(false);
    expect(checkAnswer(makeFact('div', 42, 6), 7)).toBe(true);
    expect(checkAnswer(makeFact('sub', 3, 5), -2)).toBe(true);
  });

  it('round-trips fact ids', () => {
    expect(parseFactId('mul:7:8')).toEqual(makeFact('mul', 7, 8));
    expect(compute('div', 56, 8)).toBe(7);
  });

  it('knows related facts', () => {
    const r = relatedFactIds(makeFact('add', 8, 7));
    expect(r).toContain('add:7:8');
    expect(r).toContain('sub:15:7');
    expect(relatedFactIds(makeFact('mul', 3, 4))).toEqual(expect.arrayContaining(['mul:4:3', 'div:12:4', 'div:12:3']));
  });
});

describe('grade presets', () => {
  it('every grade produces a valid, non-trivial pool', async () => {
    const { GRADES, gradePreset } = await import('../settings');
    for (const g of GRADES) {
      const p = gradePreset(g.id);
      const pool = generateFactPool(p.ops, p);
      expect(pool.length).toBeGreaterThan(10);
      for (const f of pool) expect(verify(f)).toBe(true);
      if (p.skipEasy) expect(pool.some(isTrivial)).toBe(false);
    }
  });

  it('grades get harder: 3rd adds × and ÷, 2nd reaches teen subtraction', async () => {
    const { gradePreset } = await import('../settings');
    const g2 = gradePreset('2');
    const pool2 = generateFactPool(g2.ops, g2);
    expect(pool2.some((f) => f.op === 'sub' && f.a > 10)).toBe(true);
    expect(pool2.some((f) => f.op === 'mul')).toBe(false);
    const g3 = gradePreset('3');
    const ops3 = new Set(generateFactPool(g3.ops, g3).map((f) => f.op));
    expect(ops3).toEqual(new Set(['add', 'sub', 'mul', 'div']));
  });

  it('skipEasy removes +0, −0, n−n, ×0, ×1, ÷1 but never empties the pool', () => {
    const pool = generateFactPool(DEFAULT_SETTINGS.ops, { skipEasy: true });
    expect(pool.find((f) => f.id === 'add:0:5')).toBeUndefined();
    expect(pool.find((f) => f.id === 'sub:7:7')).toBeUndefined();
    expect(pool.find((f) => f.id === 'add:8:7')).toBeTruthy();
    const onlyTrivial = ops({ add: { enabled: true, a: { min: 0, max: 0 }, b: { min: 0, max: 3 } } });
    expect(generateFactPool(onlyTrivial, { skipEasy: true }).length).toBe(4);
  });

  it('old saved settings are matched to a grade or marked custom', async () => {
    const { withDefaults } = await import('../settings');
    const old = { ...DEFAULT_SETTINGS } as Partial<typeof DEFAULT_SETTINGS>;
    delete old.grade;
    delete old.skipEasy;
    expect(withDefaults(old).grade).toBe('1');
    expect(withDefaults({ ...old, ops: { ...DEFAULT_SETTINGS.ops, mul: { ...DEFAULT_SETTINGS.ops.mul, enabled: true } } }).grade).toBeNull();
  });
});
