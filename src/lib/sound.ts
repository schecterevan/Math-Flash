// Tiny synthesized sound effects (no audio files, works offline).

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from a user gesture so later sounds are allowed to play. */
export function unlockAudio() {
  ac();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  correct() {
    if (!enabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.07, 0.35, 'triangle', 0.16));
  },
  retry() {
    if (!enabled) return;
    tone(392, 0, 0.18, 'sine', 0.12);
    tone(349.23, 0.14, 0.25, 'sine', 0.1);
  },
  unclear() {
    if (!enabled) return;
    tone(660, 0, 0.1, 'sine', 0.08);
    tone(880, 0.1, 0.12, 'sine', 0.08);
  },
  tap() {
    if (!enabled) return;
    tone(700, 0, 0.06, 'triangle', 0.08);
  },
  fanfare() {
    if (!enabled) return;
    const notes = [523.25, 659.25, 783.99, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone(f, i * 0.11, 0.3, 'square', 0.07));
    tone(1046.5, 0.7, 0.6, 'triangle', 0.15);
  },
  star() {
    if (!enabled) return;
    tone(1318.5, 0, 0.25, 'triangle', 0.12);
    tone(1760, 0.08, 0.35, 'triangle', 0.1);
  },
};

// ---- Read-aloud ------------------------------------------------------------

const SPOKEN: Record<string, string> = { '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divided by' };

export function speakProblem(text: string, onDone: () => void) {
  if (typeof speechSynthesis === 'undefined') return onDone();
  const words = text.replace(/[+−×÷]/g, (m) => ` ${SPOKEN[m]} `);
  const u = new SpeechSynthesisUtterance(words);
  u.rate = 0.9;
  u.pitch = 1.1;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    onDone();
  };
  u.onend = done;
  u.onerror = done;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  setTimeout(done, 5000); // safety net – some browsers never fire onend
}
