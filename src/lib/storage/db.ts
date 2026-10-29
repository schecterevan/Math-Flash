// IndexedDB persistence: profiles, per-fact stats, session history.
// Everything stays in this browser – nothing is uploaded anywhere.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FactStats } from '../learning/mastery';
import { DEFAULT_REWARDS, type Rewards } from '../rewards';
import { withDefaults, type Mode, type Settings } from '../settings';
import { nextIncomplete, OUTFITS, progressFromWins } from '../outfits';

export interface Profile {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  settings: Settings;
  rewards: Rewards;
}

export interface SessionItem {
  factId: string;
  at: number;
  firstCorrect: boolean;
  /** Wrong numeric answers given, in order. */
  wrongAnswers: number[];
  /** First-answer response time (ms), null if not measurable. */
  ms: number | null;
  hinted: boolean;
  /** Answer was shown after repeated misses. */
  revealed: boolean;
  /** Times we asked the child to repeat (not counted as wrong). */
  unclear: number;
  via: 'voice' | 'keypad';
}

export interface SessionRecord {
  id: string;
  profileId: string;
  startedAt: number;
  endedAt: number;
  mode: Mode;
  targeted: boolean;
  completed: boolean;
  items: SessionItem[];
  points: number;
  stars: number;
  newlyMastered: string[];
}

interface Schema extends DBSchema {
  profiles: { key: string; value: Profile };
  facts: { key: string; value: FactStats; indexes: { byProfile: string } };
  sessions: { key: string; value: SessionRecord; indexes: { byProfile: string } };
  meta: { key: string; value: { key: string; value: unknown } };
}

const DB_NAME = 'number-hero';
let dbp: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  if (!dbp)
    dbp = openDB<Schema>(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore('profiles', { keyPath: 'id' });
        d.createObjectStore('facts', { keyPath: 'key' }).createIndex('byProfile', 'profileId');
        d.createObjectStore('sessions', { keyPath: 'id' }).createIndex('byProfile', 'profileId');
        d.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  return dbp;
}

export function uid(): string {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 18);
}

const COLORS = ['#6c5ce7', '#00b894', '#e17055', '#0984e3', '#e84393', '#fdcb6e'];

export function newProfile(name: string, index = 0): Profile {
  return {
    id: uid(),
    name,
    color: COLORS[index % COLORS.length],
    createdAt: Date.now(),
    settings: withDefaults(undefined),
    rewards: structuredClone(DEFAULT_REWARDS),
  };
}

function normalizeProfile(p: Profile): Profile {
  const rewards = { ...structuredClone(DEFAULT_REWARDS), ...p.rewards };
  const pieces = Object.values(p.rewards?.outfits ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  if (p.rewards && pieces === 0 && rewards.wins > 0) {
    // Saved before outfits existed (wins but no pieces): turn earlier wins into outfit pieces.
    rewards.outfits = progressFromWins(rewards.wins);
    rewards.building = nextIncomplete(rewards.outfits);
    rewards.wearing = OUTFITS.find((o) => (rewards.outfits[o.id] ?? 0) > 0)?.id ?? null;
  }
  return { ...p, settings: withDefaults(p.settings), rewards };
}

export async function listProfiles(): Promise<Profile[]> {
  const all = await (await db()).getAll('profiles');
  for (const p of all) {
    // Profiles saved before wins existed: count past sessions that earned a star.
    if (p.rewards && p.rewards.wins === undefined) {
      const sessions = await loadSessions(p.id);
      p.rewards = { ...p.rewards, wins: sessions.filter((s) => s.stars > 0).length };
      await saveProfile(p);
    }
  }
  return all.map(normalizeProfile).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveProfile(p: Profile) {
  await (await db()).put('profiles', p);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('meta', key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await (await db()).put('meta', { key, value });
}

export async function loadFactStats(profileId: string): Promise<Map<string, FactStats>> {
  const rows = await (await db()).getAllFromIndex('facts', 'byProfile', profileId);
  return new Map(rows.map((r) => [r.factId, r]));
}

export async function saveFactStats(s: FactStats) {
  await (await db()).put('facts', s);
}

export async function loadSessions(profileId: string): Promise<SessionRecord[]> {
  const rows = await (await db()).getAllFromIndex('sessions', 'byProfile', profileId);
  return rows.sort((a, b) => a.startedAt - b.startedAt);
}

export async function saveSession(s: SessionRecord) {
  await (await db()).put('sessions', s);
}

async function clearProfileData(profileId: string) {
  const d = await db();
  const tx = d.transaction(['facts', 'sessions'], 'readwrite');
  for (const store of ['facts', 'sessions'] as const) {
    let cur = await tx.objectStore(store).index('byProfile').openKeyCursor(profileId);
    while (cur) {
      await tx.objectStore(store).delete(cur.primaryKey);
      cur = await cur.continue();
    }
  }
  await tx.done;
}

/** Clears practice stats + history (and rewards) but keeps name and settings. */
export async function resetProfileStats(p: Profile): Promise<Profile> {
  await clearProfileData(p.id);
  const next = { ...p, rewards: structuredClone(DEFAULT_REWARDS) };
  await saveProfile(next);
  return next;
}

export async function deleteProfile(id: string) {
  await clearProfileData(id);
  await (await db()).delete('profiles', id);
}

// ---- Export / import ------------------------------------------------------

export interface ExportFile {
  app: 'number-hero';
  version: 1;
  exportedAt: string;
  profiles: { profile: Profile; facts: FactStats[]; sessions: SessionRecord[] }[];
}

export async function exportData(profileIds?: string[]): Promise<ExportFile> {
  const profiles = (await listProfiles()).filter((p) => !profileIds || profileIds.includes(p.id));
  const out: ExportFile = { app: 'number-hero', version: 1, exportedAt: new Date().toISOString(), profiles: [] };
  for (const p of profiles) {
    out.profiles.push({
      profile: p,
      facts: [...(await loadFactStats(p.id)).values()],
      sessions: await loadSessions(p.id),
    });
  }
  return out;
}

/** Imports profiles. Existing profiles with the same id are replaced. */
export async function importData(json: unknown): Promise<number> {
  const f = json as ExportFile;
  if (!f || f.app !== 'number-hero' || !Array.isArray(f.profiles)) throw new Error('This is not a Number Hero backup file.');
  for (const entry of f.profiles) {
    if (!entry.profile?.id || !entry.profile?.name) throw new Error('Backup file is damaged.');
    await clearProfileData(entry.profile.id);
    const d = await db();
    const tx = d.transaction(['profiles', 'facts', 'sessions'], 'readwrite');
    await tx.objectStore('profiles').put(normalizeProfile(entry.profile));
    for (const s of entry.facts ?? []) {
      if (s.profileId !== entry.profile.id) continue;
      await tx.objectStore('facts').put(s);
    }
    for (const s of entry.sessions ?? []) {
      if (s.profileId !== entry.profile.id) continue;
      await tx.objectStore('sessions').put(s);
    }
    await tx.done;
  }
  return f.profiles.length;
}
