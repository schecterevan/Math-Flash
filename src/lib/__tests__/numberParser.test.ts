import { describe, expect, it } from 'vitest';
import { findNumbers, parseSpokenNumber } from '../speech/numberParser';

describe('parseSpokenNumber', () => {
  const cases: [string, number | null][] = [
    ['five', 5],
    ['zero', 0],
    ['twelve', 12],
    ['thirteen', 13],
    ['twenty-three', 23],
    ['twenty three', 23],
    ['Twenty', 20],
    ['ninety nine', 99],
    ['one hundred', 100],
    ['a hundred', 100],
    ['hundred', 100],
    ['one hundred and five', 105],
    ['one hundred five', 105],
    ['two hundred thirty four', 234],
    ['one thousand', 1000],
    ['13', 13],
    ['13.', 13],
    ['100', 100],
    ['1,000', 1000],
    ['13th', 13],
    ["I think it's thirteen", 13],
    ['um 7', 7],
    ['eight plus five is thirteen', 13],
    ['8 + 5 = 13', 13],
    ['the answer is 6', 6],
    ['minus three', -3],
    ['negative 4', -4],
    ['', null],
    ['hello', null],
    ['um', null],
  ];
  it.each(cases)('%s → %s', (input, expected) => {
    expect(parseSpokenNumber(input)).toBe(expected);
  });
});

describe('homophones', () => {
  const cases: [string, number][] = [
    ['for', 4],
    ['ate', 8],
    ['to', 2],
    ['too', 2],
    ['won', 1],
    ['free', 3],
    ['tree', 3],
    ['oh', 0],
    ['nein', 9],
    ['sex', 6],
    ['fore', 4],
  ];
  it.each(cases)('%s → %s', (input, expected) => {
    expect(parseSpokenNumber(input)).toBe(expected);
  });

  it('prefers real number words over homophones', () => {
    expect(parseSpokenNumber('seven too')).toBe(7);
    expect(parseSpokenNumber('I want to say nine')).toBe(9);
    expect(parseSpokenNumber('it is for 12')).toBe(12);
  });
});

describe('findNumbers', () => {
  it('splits separate numbers', () => {
    expect(findNumbers('five five')).toEqual([5, 5]);
    expect(findNumbers('twenty three plus four')).toEqual([23, 4]);
    expect(findNumbers('eleven twelve')).toEqual([11, 12]);
  });
});
