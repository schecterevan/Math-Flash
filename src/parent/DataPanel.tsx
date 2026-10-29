import { useRef, useState } from 'react';
import { deleteProfile, exportData, importData, resetProfileStats } from '../lib/storage/db';
import { useStore } from '../store';
import { Card } from './Dashboard';

export function DataPanel() {
  const { profile, profiles, updateProfile, addProfile, switchProfile, refresh } = useStore();
  const [name, setName] = useState(profile.name);
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = async (all: boolean) => {
    const data = await exportData(all ? undefined : [profile.id]);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `number-hero-${all ? 'all' : profile.name.replace(/\W+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <Card title="Child profiles">
        <ul className="divide-y">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-full font-bold text-white" style={{ background: p.color }}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 font-semibold">
                {p.name} {p.id === profile.id && <span className="text-xs font-normal opacity-60">(active)</span>}
              </span>
              {p.id !== profile.id && (
                <button onClick={() => void switchProfile(p.id)} className="rounded-lg bg-gray-100 px-3 py-1 text-sm">
                  Switch to
                </button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) void addProfile(newName.trim()).then(() => setNewName(''));
          }}
        >
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New child's name" className="flex-1 rounded-lg border p-2" maxLength={20} />
          <button className="rounded-lg bg-ink px-4 font-semibold text-white">Add</button>
        </form>
      </Card>

      <Card title={`Active profile: ${profile.name}`}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) void updateProfile({ ...profile, name: name.trim() }).then(() => setMsg('Name saved.'));
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border p-2" maxLength={20} aria-label="Profile name" />
          <button className="rounded-lg bg-gray-100 px-4 font-semibold">Rename</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-900"
            onClick={async () => {
              if (!confirm(`Reset all practice statistics, history and rewards for ${profile.name}? Settings are kept. This cannot be undone.`)) return;
              await resetProfileStats(profile);
              await refresh();
              setMsg('Statistics reset.');
            }}
          >
            Reset statistics
          </button>
          {profiles.length > 1 && (
            <button
              className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-900"
              onClick={async () => {
                if (!confirm(`Delete the profile ${profile.name} and all of its data? This cannot be undone.`)) return;
                await deleteProfile(profile.id);
                await switchProfile(profiles.find((p) => p.id !== profile.id)!.id);
              }}
            >
              Delete profile
            </button>
          )}
        </div>
      </Card>

      <Card title="Backup (export / import)" subtitle="Progress is stored only in this browser. Export a JSON file to keep a backup or move to another device.">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void download(false)} className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white">
            ⬇ Export {profile.name}
          </button>
          <button onClick={() => void download(true)} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold">
            ⬇ Export all profiles
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold">
            ⬆ Import backup…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const n = await importData(JSON.parse(await f.text()));
                await refresh();
                setMsg(`Imported ${n} profile${n === 1 ? '' : 's'}. Profiles with the same ID were replaced.`);
              } catch (err) {
                setMsg(`Import failed: ${(err as Error).message}`);
              }
            }}
          />
        </div>
      </Card>

      {msg && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900" role="status">
          {msg}
        </p>
      )}

      <Card title="Privacy">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>This app has no server and no accounts. Profiles, statistics and settings live in this browser’s IndexedDB.</li>
          <li>
            <b>Voice answers use the browser’s built-in speech recognition.</b> In Chrome (and Edge), audio is typically sent to Google’s
            (or Microsoft’s) speech service to be transcribed, so it needs an internet connection. Safari uses Apple’s speech service (on-device on
            some newer devices). Audio is never sent to this app or stored by it.
          </li>
          <li>If you’d rather not use cloud speech recognition, turn off “Voice answers” in Settings; the number pad works fully offline.</li>
          <li>Only the transcript text is seen by the app, and only to read the number; it is not saved.</li>
        </ul>
      </Card>
    </div>
  );
}
