// Converts speech-recognition transcripts ("thirteen", "twenty-three",
// "I think it's 13", "one hundred and five") into numbers.
//
// Two passes:
//  1. strict  – real number words and digits only.
//  2. lenient – only if the strict pass finds nothing, also accept common
//     homophones a recognizer produces for a child's voice ("for" → 4,
//     "ate" → 8, "to" → 2). This keeps "seven too" = 7, not 2.
// When several numbers are spoken ("eight plus five is thirteen") the LAST
// number is taken as the answer.

const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/** Misspellings recognizers produce that clearly mean a number. */
const STRICT_ALIASES: Record<string, string> = {
  nineteenth: 'nineteen',
  fourtee: 'forty',
  fourteenth: 'fourteen',
  thirdteen: 'thirteen',
  twelf: 'twelve',
  eightteen: 'eighteen',
  zeroes: 'zero',
  naught: 'zero',
  nought: 'zero',
};

/** Words that sound like numbers. Used only when nothing else was heard. */
const HOMOPHONES: Record<string, string> = {
  oh: 'zero',
  o: 'zero',
  nothing: 'zero',
  none: 'zero',
  won: 'one',
  wan: 'one',
  to: 'two',
  too: 'two',
  tu: 'two',
  tree: 'three',
  free: 'three',
  for: 'four',
  fore: 'four',
  far: 'four',
  floor: 'four',
  fife: 'five',
  hive: 'five',
  sicks: 'six',
  sex: 'six',
  sax: 'six',
  sticks: 'six',
  heaven: 'seven',
  ate: 'eight',
  eit: 'eight',
  hate: 'eight',
  nein: 'nine',
  mine: 'nine',
  nyne: 'nine',
  tin: 'ten',
  then: 'ten',
  tan: 'ten',
  leaven: 'eleven',
  elven: 'eleven',
  twelfth: 'twelve',
  fourteens: 'fourteen',
  forte: 'forty',
  fiddy: 'fifty',
  sixtie: 'sixty',
};

const NEGATIVE = new Set(['minus', 'negative']);

type Token =
  | { kind: 'num'; value: number; word: 'unit' | 'teen' | 'tens' | 'digits' }
  | { kind: 'hundred' }
  | { kind: 'thousand' }
  | { kind: 'neg' }
  | { kind: 'and' }
  | { kind: 'other' };

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/(\d),(\d{3})/g, '$1$2') // 1,000 → 1000
    .replace(/[-–—]/g, ' ')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function classify(word: string, lenient: boolean): Token {
  let w = STRICT_ALIASES[word] ?? word;
  if (lenient && HOMOPHONES[w]) w = HOMOPHONES[w];
  if (/^\d+(\.\d+)?$/.test(w)) return { kind: 'num', value: Number(w), word: 'digits' };
  // Recognizers sometimes return e.g. "13th" or "5s".
  const digitSuffix = w.match(/^(\d+)(st|nd|rd|th|s)$/);
  if (digitSuffix) return { kind: 'num', value: Number(digitSuffix[1]), word: 'digits' };
  if (w in UNITS) return { kind: 'num', value: UNITS[w], word: 'unit' };
  if (w in TEENS) return { kind: 'num', value: TEENS[w], word: 'teen' };
  if (w in TENS) return { kind: 'num', value: TENS[w], word: 'tens' };
  if (w === 'hundred') return { kind: 'hundred' };
  if (w === 'thousand') return { kind: 'thousand' };
  if (NEGATIVE.has(w)) return { kind: 'neg' };
  if (w === 'and') return { kind: 'and' };
  if (w === 'a' || w === 'an') return { kind: 'and' }; // "a hundred"
  return { kind: 'other' };
}

interface Group {
  total: number; // completed thousands
  current: number; // value under 1000 being built
  last: 'unit' | 'teen' | 'tens' | 'digits' | 'hundred' | 'thousand' | null;
  negative: boolean;
  hasValue: boolean;
}

function newGroup(negative = false): Group {
  return { total: 0, current: 0, last: null, negative, hasValue: false };
}

function finish(g: Group): number {
  const v = g.total + g.current;
  return g.negative ? -v : v;
}

function parseAll(text: string, lenient: boolean): number[] {
  const tokens = normalize(text).map((w) => classify(w, lenient));
  const results: number[] = [];
  let g: Group | null = null;
  let pendingNeg = false;
  let pendingA = false; // saw "a"/"and" right before this token

  const close = () => {
    if (g && g.hasValue) results.push(finish(g));
    g = null;
  };

  for (const t of tokens) {
    if (t.kind === 'neg') {
      close();
      pendingNeg = true;
      continue;
    }
    if (t.kind === 'and') {
      pendingA = true;
      continue;
    }
    if (t.kind === 'other') {
      close();
      pendingNeg = false;
      pendingA = false;
      continue;
    }
    if (t.kind === 'hundred') {
      if (!g) {
        g = newGroup(pendingNeg); // "hundred" / "a hundred"
        g.current = 1;
        pendingNeg = false;
      }
      if (g.current < 100) g.current = (g.current || 1) * 100;
      g.last = 'hundred';
      g.hasValue = true;
      pendingA = false;
      continue;
    }
    if (t.kind === 'thousand') {
      if (!g) {
        g = newGroup(pendingNeg);
        g.current = 1;
        pendingNeg = false;
      }
      g.total += (g.current || 1) * 1000;
      g.current = 0;
      g.last = 'thousand';
      g.hasValue = true;
      pendingA = false;
      continue;
    }

    // number word or digits
    const cur: Group | null = g;
    let joins = false;
    if (cur) {
      const c = cur as Group;
      const units = c.current % 100;
      if (c.last === 'hundred' || c.last === 'thousand') joins = t.value < 100;
      else if (c.last === 'tens' && t.word === 'unit' && t.value > 0) joins = true;
      // "one hundred and five" → after a hundred, "and" is part of the number
      else if (c.last === 'digits' && units % 100 === 0 && c.current >= 100 && t.value < 100) joins = pendingA;
    }
    if (joins && cur) {
      (cur as Group).current += t.value;
      (cur as Group).last = t.word;
    } else {
      close();
      g = newGroup(pendingNeg);
      g.current = t.value;
      g.last = t.word;
      g.hasValue = true;
      pendingNeg = false;
    }
    pendingA = false;
  }
  close();
  return results;
}

/** All numbers found in a transcript, in spoken order. */
export function findNumbers(text: string): number[] {
  const strict = parseAll(text, false);
  if (strict.length) return strict;
  return parseAll(text, true);
}

/** The single answer a child most likely meant, or null if none heard. */
export function parseSpokenNumber(text: string): number | null {
  const nums = findNumbers(text);
  return nums.length ? nums[nums.length - 1] : null;
}
