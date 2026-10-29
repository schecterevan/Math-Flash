// Turns a finished question into stat updates + points (pure, testable).

import type { SessionItem } from '../storage/db';
import { pointsFor } from '../rewards';
import { emptyStats, recordAttempt, type FactStats, type Thresholds } from './mastery';

export interface AppliedAnswer {
  stats: FactStats;
  points: number;
  newlyMastered: boolean;
}

export function applyAnswer(
  prev: FactStats | undefined,
  profileId: string,
  item: SessionItem,
  sessionId: string,
  t: Thresholds,
): AppliedAnswer {
  const before = prev ?? emptyStats(profileId, item.factId);
  const stats = recordAttempt(
    before,
    {
      at: item.at,
      sessionId,
      firstCorrect: item.firstCorrect,
      // Only real numeric wrong answers count – "say it again" moments
      // (item.unclear) are deliberately not included.
      wrongs: item.wrongAnswers.length,
      ms: item.ms,
      hinted: item.hinted,
    },
    t,
  );
  const newlyMastered = before.level !== 'mastered' && stats.level === 'mastered';
  const solved = !item.revealed;
  return { stats, newlyMastered, points: pointsFor({ firstCorrect: item.firstCorrect, solved, newlyMastered }) };
}

/** Estimated recognizer delay used when the browser can't tell us when speech began. */
export const RECOGNITION_LATENCY_MS = 700;

/**
 * Response time = moment the child started answering − moment the question was
 * ready (mic open). Recognition/transcription delay is excluded.
 */
export function responseMs(opts: {
  readyAt: number | null;
  speechStartAt: number | null;
  resultAt: number;
  via: 'voice' | 'keypad';
  firstKeyAt: number | null;
}): number | null {
  const { readyAt } = opts;
  if (readyAt === null) return null;
  let start: number;
  if (opts.via === 'keypad') {
    if (opts.firstKeyAt === null) return null;
    start = opts.firstKeyAt;
  } else if (opts.speechStartAt !== null && opts.speechStartAt >= readyAt) {
    start = opts.speechStartAt;
  } else {
    start = opts.resultAt - RECOGNITION_LATENCY_MS;
  }
  const ms = Math.round(start - readyAt);
  return Math.max(0, Math.min(ms, 120_000));
}
