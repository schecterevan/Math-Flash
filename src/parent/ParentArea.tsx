import { useState } from 'react';
import { useStore } from '../store';
import { Dashboard } from './Dashboard';
import { DataPanel } from './DataPanel';
import { SettingsPanel } from './SettingsPanel';
import { OutfitPreview } from './OutfitPreview';

type Tab = 'dashboard' | 'outfits' | 'settings' | 'data';

export function ParentArea({ onClose, onPractice }: { onClose: () => void; onPractice: (ids: string[]) => void }) {
  const { profile } = useStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  return (
    <div className="min-h-dvh bg-[#f6f7fb]" data-theme="sky">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-2 font-semibold" aria-label="Back to game">
            ← Game
          </button>
          <h1 className="flex-1 truncate text-lg font-bold">Parent area · {profile.name}</h1>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {(
            [
              ['dashboard', '📊 Progress'],
              ['outfits', '👕 Outfits'],
              ['settings', '⚙️ Settings'],
              ['data', '👤 Profiles & data'],
            ] as [Tab, string][]
          ).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-4 px-3 py-2 text-sm font-semibold ${tab === t ? 'border-[var(--accent)]' : 'border-transparent opacity-60'}`}
            >
              {l}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'dashboard' && <Dashboard onPractice={onPractice} />}
        {tab === 'outfits' && <OutfitPreview />}
        {tab === 'settings' && <SettingsPanel />}
        {tab === 'data' && <DataPanel key={profile.id} />}
      </main>
    </div>
  );
}
