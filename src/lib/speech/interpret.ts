// Pure decision logic: given what the recognizer heard, decide whether the
// child answered correctly, answered wrongly, or we simply didn't hear clearly.
// Kept separate from the browser API so it can be unit-tested.

import { parseSpokenNumber } from './numberParser';

export interface Alternative {
  transcript: string;
  /** 0–1. Some browsers always report 0, which means "unknown". */
  confidence: number;
}

export type Verdict =
  | { kind: 'correct'; value: number; heard: string }
  | { kind: 'wrong'; value: number; heard: string }
  /** No number heard / too unsure → ask the child to say it again. Never counted as wrong. */
  | { kind: 'unclear'; heard: string }
  /** Interim result that isn't safe to judge yet – keep listening. */
  | { kind: 'wait'; heard: string };

/** Below this (when the browser reports a real confidence) a wrong number is treated as "say it again". */
export const LOW_CONFIDENCE = 0.4;

/**
 * Answers that could be the start of a longer number ("twenty" → "twenty-three",
 * "one hundred" → "one hundred five", "six" is fine because "sixteen" is one word).
 * For these we never accept an interim result early.
 */
function isPrefixRisky(n: number): boolean {
  return (n >= 20 && n < 100 && n % 10 === 0) || (n >= 100 && n % 100 === 0) || n % 100 >= 20 && n % 10 === 0;
}

export function interpret(alternatives: Alternative[], expected: number, isFinal: boolean): Verdict {
  const heard = alternatives[0]?.transcript.trim() ?? '';
  const parsed = alternatives.map((alt) => ({ alt, value: parseSpokenNumber(alt.transcript) }));

  // Lenient on purpose: children's speech is often mis-recognized as a near
  // homophone ("fifty" for "fifteen"), so if ANY alternative is the correct
  // number we accept it.
  const match = parsed.find((p) => p.value === expected);
  if (match) {
    if (!isFinal && isPrefixRisky(expected)) return { kind: 'wait', heard };
    return { kind: 'correct', value: expected, heard: match.alt.transcript.trim() };
  }

  if (!isFinal) return { kind: 'wait', heard };

  const top = parsed.find((p) => p.value !== null);
  if (!top || top.value === null) return { kind: 'unclear', heard };

  const conf = top.alt.confidence;
  if (conf > 0 && conf < LOW_CONFIDENCE) return { kind: 'unclear', heard };

  return { kind: 'wrong', value: top.value, heard: top.alt.transcript.trim() };
}
