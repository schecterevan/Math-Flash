import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { applyAnswer, responseMs } from '../learning/record';
import type { SessionItem } from '../storage/db';

const T = { fastMs: 3000, slowMs: 6000 };

const item = (patch: Partial<SessionItem>): SessionItem => ({
  factId: 'add:8:7',
  at: Date.now(),
  firstCorrect: true,
  wrongAnswers: [],
  ms: 2000,
  hinted: false,
  revealed: false,
  unclear: 0,
  via: 'voice',
  ...patch,
});

describe('recording answers', () => {
  it('records wrong answers', () => {
    const r = applyAnswer(undefined, 'p', item({ firstCorrect: false, wrongAnswers: [14, 16] }), 's', T);
    expect(r.stats.incorrect).toBe(2);
    expect(r.stats.retries).toBe(1);
    expect(r.stats.firstCorrect).toBe(0);
    expect(r.points).toBe(15); // solved after retrying – still earns points, none taken away
  });

  it('recognition failures ("say it again") are NOT recorded as wrong', () => {
    const r = applyAnswer(undefined, 'p', item({ unclear: 3 }), 's', T);
    expect(r.stats.incorrect).toBe(0);
    expect(r.stats.firstCorrect).toBe(1);
    expect(r.stats.history[0].firstCorrect).toBe(true);
  });

  it('response time excludes recognition processing delay', () => {
    // Speech began 1.2s after the question was ready; the transcript arrived 900ms later.
    expect(responseMs({ readyAt: 1000, speechStartAt: 2200, resultAt: 3100, via: 'voice', firstKeyAt: null })).toBe(1200);
    // No speech-start event: estimate by subtracting typical recognizer latency.
    expect(responseMs({ readyAt: 1000, speechStartAt: null, resultAt: 3100, via: 'voice', firstKeyAt: null })).toBe(1400);
    // Mic never opened → not measurable rather than penalized.
    expect(responseMs({ readyAt: null, speechStartAt: null, resultAt: 3100, via: 'voice', firstKeyAt: null })).toBeNull();
    expect(responseMs({ readyAt: 1000, speechStartAt: null, resultAt: 9000, via: 'keypad', firstKeyAt: 2500 })).toBe(1500);
  });
});

describe('IndexedDB persistence', () => {
  it('progress survives a reload (fresh module + DB connection)', async () => {
    const db1 = await import('../storage/db');
    const p = db1.newProfile('Sam');
    p.settings.ops.mul.enabled = true;
    await db1.saveProfile(p);
    const r = applyAnswer(undefined, p.id, item({ firstCorrect: false, wrongAnswers: [12] }), 'sess1', T);
    await db1.saveFactStats(r.stats);
    await db1.saveSession({
      id: 'sess1',
      profileId: p.id,
      startedAt: 1,
      endedAt: 2,
      mode: 'practice',
      targeted: false,
      completed: true,
      items: [item({ firstCorrect: false, wrongAnswers: [12] })],
      points: 15,
      stars: 1,
      newlyMastered: [],
    });

    vi.resetModules(); // simulate a page reload
    const db2 = await import('../storage/db');
    const profiles = await db2.listProfiles();
    const again = profiles.find((x) => x.id === p.id)!;
    expect(again.name).toBe('Sam');
    expect(again.settings.ops.mul.enabled).toBe(true);
    const stats = await db2.loadFactStats(p.id);
    expect(stats.get('add:8:7')!.incorrect).toBe(1);
    expect((await db2.loadSessions(p.id))[0].items[0].wrongAnswers).toEqual([12]);

    // export → reset → import round trip
    const backup = await db2.exportData([p.id]);
    await db2.resetProfileStats(again);
    expect((await db2.loadFactStats(p.id)).size).toBe(0);
    await db2.importData(JSON.parse(JSON.stringify(backup)));
    expect((await db2.loadFactStats(p.id)).get('add:8:7')!.incorrect).toBe(1);
    await expect(db2.importData({ nope: true })).rejects.toThrow();
  });

  it('profiles saved before wins existed get wins counted from past winning sessions', async () => {
    const db = await import('../storage/db');
    const p = db.newProfile('Old');
    const legacy = { ...p, rewards: { ...p.rewards } } as typeof p;
    delete (legacy.rewards as Partial<typeof p.rewards>).wins;
    delete (legacy.rewards as Partial<typeof p.rewards>).outfits;
    await db.saveProfile(legacy);
    const base = { profileId: p.id, startedAt: 1, endedAt: 2, mode: 'practice' as const, targeted: false, completed: true, items: [], points: 0, newlyMastered: [] };
    await db.saveSession({ ...base, id: 'w1', stars: 2 });
    await db.saveSession({ ...base, id: 'w2', stars: 1 });
    await db.saveSession({ ...base, id: 'l1', stars: 0 });
    const loaded = (await db.listProfiles()).find((x) => x.id === p.id)!;
    expect(loaded.rewards.wins).toBe(2);
    // …and those wins become outfit pieces
    expect(loaded.rewards.outfits).toEqual({ racer: 2 });
    expect(loaded.rewards.wearing).toBe('racer');
    expect(loaded.rewards.building).toBe('racer');
  });
});

describe('outfit migration', () => {
  it('a profile with wins but an empty outfit list gets pieces from its wins', async () => {
    const db = await import('../storage/db');
    const p = db.newProfile('Halfway');
    p.rewards = { ...p.rewards, wins: 15, outfits: {}, building: 'soldier', wearing: null };
    await db.saveProfile(p);
    const loaded = (await db.listProfiles()).find((x) => x.id === p.id)!;
    expect(loaded.rewards.outfits).toEqual({ racer: 10, rapper: 5 });
    expect(loaded.rewards.building).toBe('rapper');
    expect(loaded.rewards.wearing).toBe('racer');
  });
});
