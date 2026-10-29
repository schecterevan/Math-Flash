import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Home } from './screens/Home';
import { GameScreen, type GameResult } from './screens/Game';
import { Results } from './screens/Results';
import { Wardrobe } from './screens/Wardrobe';
import { ParentArea } from './parent/ParentArea';
import { ParentGate } from './components/ParentGate';
import { generateFactPool, parseFactId, type Fact } from './lib/math/facts';
import { finishSession, type SessionSummary } from './lib/finishSession';
import { getSpeechService } from './lib/speech/speechService';
import type { Mode } from './lib/settings';

type View =
  | { name: 'home' }
  | { name: 'game'; mode: Mode; pool: Fact[]; targeted: boolean; key: number }
  | { name: 'results'; summary: SessionSummary; mode: Mode; pool: Fact[]; targeted: boolean }
  | { name: 'wardrobe' }
  | { name: 'parent' };

function Shell() {
  const store = useStore();
  const { profile, stats } = store;
  const [view, setView] = useState<View>({ name: 'home' });
  const [gate, setGate] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = profile.rewards.theme;
  }, [profile.rewards.theme]);

  const start = async (mode: Mode, pool: Fact[], targeted = false) => {
    if (!pool.length) {
      setGate(true); // nothing configured – a grown-up needs to pick operations
      return;
    }
    // Ask for the microphone from this tap (a user gesture) so the browser
    // prompt appears once, then the mic opens automatically for each question.
    const speech = getSpeechService();
    if (profile.settings.voice && speech.supported) {
      setStarting(true);
      await speech.requestPermission();
      setStarting(false);
    }
    setView({ name: 'game', mode, pool, targeted, key: Date.now() });
  };

  const done = async (r: GameResult | null, v: Extract<View, { name: 'game' }>) => {
    if (!r) {
      await store.refresh();
      setView({ name: 'home' });
      return;
    }
    const summary = await finishSession(r.record, r.profile, r.stats, r.improved);
    await store.refresh();
    setView({ name: 'results', summary, mode: v.mode, pool: v.pool, targeted: v.targeted });
  };

  return (
    <>
      {view.name === 'home' && (
        <Home
          starting={starting}
          onPlay={(mode) => void start(mode, generateFactPool(profile.settings.ops, profile.settings))}
          onParent={() => setGate(true)}
          onWardrobe={() => setView({ name: 'wardrobe' })}
        />
      )}
      {view.name === 'game' && (
        <GameScreen
          key={view.key}
          profile={profile}
          stats={stats}
          pool={view.pool}
          mode={view.mode}
          targeted={view.targeted}
          onDone={(r) => void done(r, view)}
        />
      )}
      {view.name === 'results' && (
        <Results
          summary={view.summary}
          onHome={() => setView({ name: 'home' })}
          onAgain={() => void start(view.mode, view.targeted ? view.pool : generateFactPool(profile.settings.ops, profile.settings), view.targeted)}
        />
      )}
      {view.name === 'wardrobe' && <Wardrobe onBack={() => setView({ name: 'home' })} />}
      {view.name === 'parent' && (
        <ParentArea
          onClose={() => setView({ name: 'home' })}
          onPractice={(ids) => void start(profile.settings.mode, ids.map(parseFactId), true)}
        />
      )}
      {gate && (
        <ParentGate
          onCancel={() => setGate(false)}
          onPass={() => {
            setGate(false);
            setView({ name: 'parent' });
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
