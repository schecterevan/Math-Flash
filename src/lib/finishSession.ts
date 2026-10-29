import type { FactStats } from './learning/mastery';
import { applyWin, bumpStreak, newMilestones, starsFor, type Milestone, type WinReward } from './rewards';
import { saveProfile, saveSession, type Profile, type SessionRecord } from './storage/db';

export interface SessionSummary {
  record: SessionRecord;
  profile: Profile;
  milestones: Milestone[];
  mastered: number;
  win: WinReward;
}

/** Awards stars / streak / milestones at the end of a session and saves. */
export async function finishSession(
  record: SessionRecord,
  profile: Profile,
  stats: Map<string, FactStats>,
  improved: number,
): Promise<SessionSummary> {
  const n = record.items.length;
  const firstTry = record.items.filter((i) => i.firstCorrect).length;
  const stars = starsFor({ completed: record.completed, questions: n, firstTry, improved });
  // A win (≥1 star) grows muscles and may unlock the next accessory.
  const { rewards, reward: win } = applyWin({ ...profile.rewards, stars: profile.rewards.stars + stars }, stars);
  // A day counts toward the streak after at least 5 questions.
  if (n >= 5) rewards.streak = bumpStreak(rewards);
  let mastered = 0;
  for (const s of stats.values()) if (s.level === 'mastered') mastered++;
  const milestones = newMilestones(rewards, mastered);
  rewards.milestones = [...rewards.milestones, ...milestones.map((m) => m.id)];
  const next: Profile = { ...profile, rewards };
  const rec: SessionRecord = { ...record, stars };
  await saveSession(rec);
  await saveProfile(next);
  return { record: rec, profile: next, milestones, mastered, win };
}
