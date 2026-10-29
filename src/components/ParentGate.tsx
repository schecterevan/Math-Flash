import { useMemo, useState } from 'react';

/** Light-weight "grown-ups only" check before parent settings. */
export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [a, b] = useMemo(() => [12 + Math.floor(Math.random() * 14), 3 + Math.floor(Math.random() * 6)], []);
  const [val, setVal] = useState('');
  const [bad, setBad] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal>
      <form
        className="anim-pop w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(val) === a * b) onPass();
          else {
            setBad(true);
            setVal('');
          }
        }}
      >
        <h2 className="text-xl font-bold">Grown-ups only</h2>
        <p className="mt-1 text-sm opacity-70">To open parent settings, answer:</p>
        <p className="my-4 text-4xl font-bold">
          {a} × {b} = ?
        </p>
        <input
          autoFocus
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
          className={`w-full rounded-xl border-2 p-3 text-center text-2xl ${bad ? 'border-red-400' : 'border-gray-300'}`}
          aria-label="Answer"
        />
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-gray-100 p-3 font-semibold">
            Cancel
          </button>
          <button type="submit" className="flex-1 rounded-xl p-3 font-semibold text-white" style={{ background: 'var(--accent)' }}>
            Open
          </button>
        </div>
      </form>
    </div>
  );
}
