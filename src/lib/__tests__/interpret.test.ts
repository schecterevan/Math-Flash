import { describe, expect, it } from 'vitest';
import { interpret } from '../speech/interpret';

const alt = (transcript: string, confidence = 0.9) => ({ transcript, confidence });

describe('interpret recognition results', () => {
  it('correct answer', () => {
    expect(interpret([alt('thirteen')], 13, true)).toMatchObject({ kind: 'correct', value: 13 });
  });

  it('accepts a correct interim result immediately (low latency)', () => {
    expect(interpret([alt('13')], 13, false).kind).toBe('correct');
  });

  it('does not accept an interim "twenty" when it might become "twenty-three"', () => {
    expect(interpret([alt('twenty')], 20, false).kind).toBe('wait');
    expect(interpret([alt('twenty')], 20, true).kind).toBe('correct');
  });

  it('waits for the final result before calling something wrong', () => {
    expect(interpret([alt('twelve')], 13, false).kind).toBe('wait');
    expect(interpret([alt('twelve')], 13, true)).toMatchObject({ kind: 'wrong', value: 12 });
  });

  it('accepts the correct number from a lower alternative (homophones / mishearing)', () => {
    expect(interpret([alt('fifty'), alt('fifteen')], 15, true).kind).toBe('correct');
    expect(interpret([alt('for')], 4, true).kind).toBe('correct');
  });

  it('silence / no number is unclear, not wrong', () => {
    expect(interpret([alt('')], 7, true).kind).toBe('unclear');
    expect(interpret([alt('what')], 7, true).kind).toBe('unclear');
    expect(interpret([], 7, true).kind).toBe('unclear');
  });

  it('low-confidence wrong numbers are unclear, not wrong', () => {
    expect(interpret([alt('six', 0.2)], 7, true).kind).toBe('unclear');
  });

  it('confidence 0 means unknown (Safari) – still judged', () => {
    expect(interpret([alt('six', 0)], 7, true).kind).toBe('wrong');
  });
});
