import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { FactStats } from './lib/learning/mastery';
import {
  getMeta,
  listProfiles,
  loadFactStats,
  loadSessions,
  newProfile,
  saveProfile,
  setMeta,
  type Profile,
  type SessionRecord,
} from './lib/storage/db';
import { setSoundEnabled } from './lib/sound';

interface Store {
  ready: boolean;
  profiles: Profile[];
  profile: Profile;
  stats: Map<string, FactStats>;
  sessions: SessionRecord[];
  updateProfile: (p: Profile) => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  addProfile: (name: string) => Promise<void>;
  /** Reload everything from IndexedDB (after import/reset/a game). */
  refresh: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stats, setStats] = useState<Map<string, FactStats>>(new Map());
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (preferId?: string | null) => {
    let ps = await listProfiles();
    if (!ps.length) {
      // Fixed id so two overlapping first-launch loads can't create duplicates.
      const p = { ...newProfile('Player 1'), id: 'player-1' };
      await saveProfile(p);
      ps = await listProfiles();
    }
    const stored = preferId ?? (await getMeta<string>('activeProfile'));
    const active = ps.find((p) => p.id === stored) ?? ps[0];
    await setMeta('activeProfile', active.id);
    const [st, se] = await Promise.all([loadFactStats(active.id), loadSessions(active.id)]);
    setProfiles(ps);
    setActiveId(active.id);
    setStats(st);
    setSessions(se);
    setSoundEnabled(active.settings.sound);
    setReady(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const profile = profiles.find((p) => p.id === activeId);

  const value: Store | null = profile
    ? {
        ready,
        profiles,
        profile,
        stats,
        sessions,
        updateProfile: async (p) => {
          // Update the UI first so rapid edits always build on the latest state.
          setProfiles((ps) => ps.map((x) => (x.id === p.id ? p : x)));
          setSoundEnabled(p.settings.sound);
          await saveProfile(p);
        },
        switchProfile: (id) => load(id),
        addProfile: async (name) => {
          const p = newProfile(name, profiles.length);
          await saveProfile(p);
          await load(p.id);
        },
        refresh: () => load(activeId),
      }
    : null;

  if (!value) return <div className="min-h-dvh grid place-items-center text-6xl animate-pulse">🧮</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
