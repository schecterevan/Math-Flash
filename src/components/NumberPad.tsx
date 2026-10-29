import { useEffect, useState } from 'react';
import { sfx } from '../lib/sound';

/** On-screen number pad (also accepts the physical keyboard). */
export function NumberPad({
  onSubmit,
  onFirstKey,
  allowNegative,
  disabled,
}: {
  onSubmit: (n: number) => void;
  onFirstKey: () => void;
  allowNegative: boolean;
  disabled: boolean;
}) {
  const [val, setVal] = useState('');

  const press = (k: string) => {
    if (disabled) return;
    sfx.tap();
    if (k === 'back') return setVal((v) => v.slice(0, -1));
    if (k === 'ok') {
      if (val === '' || val === '-') return;
      onSubmit(Number(val));
      setVal('');
      return;
    }
    onFirstKey();
    if (k === '-') return setVal((v) => (v.startsWith('-') ? v.slice(1) : '-' + v));
    setVal((v) => (v.replace('-', '').length >= 4 ? v : v + k));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') press('ok');
      else if (e.key === '-' && allowNegative) press('-');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowNegative ? '-' : 'back', '0', 'ok'];
  return (
    <div className="mx-auto w-full max-w-xs anim-pop" data-testid="numpad">
      <div className="mb-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-4xl font-bold shadow-inner">
        {val || <span className="opacity-25">_</span>}
        {allowNegative && val && (
          <button className="ml-2 text-2xl" onClick={() => press('back')} aria-label="Delete">
            ⌫
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            disabled={disabled}
            aria-label={k === 'back' ? 'Delete' : k === 'ok' ? 'Check answer' : k === '-' ? 'Minus' : k}
            className={`btn-big h-14 text-3xl font-bold disabled:opacity-40 ${
              k === 'ok' ? 'text-white' : 'bg-white'
            }`}
            style={k === 'ok' ? { background: 'var(--color-good)' } : undefined}
          >
            {k === 'back' ? '⌫' : k === 'ok' ? '✓' : k === '-' ? '−' : k}
          </button>
        ))}
      </div>
    </div>
  );
}
