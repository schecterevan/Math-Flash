// Modular speech-to-text service.
//
// The game only talks to the `SpeechService` interface, so the browser
// Web Speech API implementation below can later be swapped for another
// provider (e.g. an on-device Whisper model or a cloud STT) without touching
// game code.

import type { Alternative } from './interpret';

export type SpeechErrorKind =
  | 'not-allowed' // permission denied
  | 'no-microphone'
  | 'network' // browser's recognition server unreachable
  | 'unsupported'
  | 'other';

export interface SpeechEvents {
  /** Microphone is open and the recognizer is listening. */
  onListening?: (at: number) => void;
  /** Voice activity detected – timestamp is used as "child started answering". */
  onSpeechStart?: (at: number) => void;
  /** Interim or final hypotheses for the current utterance. */
  onResult?: (alternatives: Alternative[], isFinal: boolean, at: number) => void;
  /** A fatal error – the game should fall back to the number pad. */
  onError?: (kind: SpeechErrorKind, message: string) => void;
  /** Recognizer stopped and will not restart on its own. */
  onIdle?: () => void;
}

export interface SpeechService {
  readonly supported: boolean;
  readonly name: string;
  /** Start (or keep) listening. Safe to call repeatedly. */
  listen(events: SpeechEvents): void;
  /** Stop listening (e.g. during a celebration). */
  stop(): void;
  /** Ask for mic permission up front (triggers the browser prompt). */
  requestPermission(): Promise<'granted' | 'denied' | 'unsupported'>;
}

// ---- Web Speech API implementation ---------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecognition = any;

function getCtor(): (new () => AnyRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export class WebSpeechService implements SpeechService {
  readonly name = 'Browser speech recognition';
  /** The live recognizer. A fresh instance is used for every listen() call so
   * late events from a previous question can never be processed twice. */
  private rec: AnyRecognition | null = null;
  private running = false;
  private wanted = false;
  private events: SpeechEvents = {};
  private restartTimer: number | undefined;
  private failures = 0;
  private fatal = false;

  get supported() {
    return getCtor() !== null;
  }

  async requestPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
    if (!this.supported) return 'unsupported';
    if (!navigator.mediaDevices?.getUserMedia) return 'granted'; // recognizer will prompt itself
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      this.fatal = false;
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  listen(events: SpeechEvents) {
    this.events = events;
    this.fatal = false;
    this.wanted = true;
    this.failures = 0;
    window.clearTimeout(this.restartTimer);
    if (this.running && this.rec) {
      // Retire the old recognizer; its onend will start a fresh one.
      this.retire(this.rec);
    } else {
      this.startNow();
    }
  }

  stop() {
    this.wanted = false;
    window.clearTimeout(this.restartTimer);
    if (this.rec) this.retire(this.rec);
  }

  private retire(rec: AnyRecognition) {
    rec.__stale = true;
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
  }

  private build(): AnyRecognition {
    const Ctor = getCtor()!;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true; // lets us accept a correct answer before the final result → low latency
    rec.maxAlternatives = 5;
    const live = () => !rec.__stale && rec === this.rec;

    rec.onaudiostart = () => {
      if (!live()) return;
      this.failures = 0;
      this.events.onListening?.(performance.now());
    };
    rec.onspeechstart = () => live() && this.events.onSpeechStart?.(performance.now());
    rec.onresult = (e: any) => {
      if (!live()) return;
      const at = performance.now();
      // Only the newest result matters; earlier ones were already handled.
      const result = e.results[e.results.length - 1];
      if (!result) return;
      const alts: Alternative[] = [];
      for (let i = 0; i < result.length; i++) {
        alts.push({ transcript: result[i].transcript, confidence: result[i].confidence ?? 0 });
      }
      this.events.onResult?.(alts, result.isFinal, at);
    };
    rec.onerror = (e: any) => {
      if (!live()) return;
      const err: string = e.error;
      if (err === 'no-speech' || err === 'aborted') return; // silence is fine – we just restart
      if (err === 'not-allowed' || err === 'service-not-allowed') return this.fail('not-allowed', err);
      if (err === 'audio-capture') return this.fail('no-microphone', err);
      this.failures++;
      if (err === 'network' && this.failures >= 3) return this.fail('network', err);
      if (this.failures >= 5) this.fail('other', err);
    };
    rec.onend = () => {
      if (rec !== this.rec) return;
      this.running = false;
      this.rec = null;
      if (this.wanted && !this.fatal) {
        // Browsers end recognition after silence (and we retire it per
        // question); quietly restart so the mic never "goes deaf".
        const delay = rec.__stale ? 0 : Math.min(1500, 50 + this.failures * 300);
        this.restartTimer = window.setTimeout(() => this.startNow(), delay);
      } else {
        this.events.onIdle?.();
      }
    };
    return rec;
  }

  private startNow() {
    if (!this.wanted || this.fatal || this.running) return;
    const rec = this.build();
    this.rec = rec;
    try {
      rec.start();
      this.running = true;
    } catch {
      this.rec = null;
      this.failures++;
      this.restartTimer = window.setTimeout(() => this.startNow(), 300);
    }
  }

  private fail(kind: SpeechErrorKind, message: string) {
    this.fatal = true;
    this.wanted = false;
    this.events.onError?.(kind, message);
  }
}

/** Fallback used when the browser has no speech recognition at all. */
export class NoSpeechService implements SpeechService {
  readonly supported = false;
  readonly name = 'None';
  listen(events: SpeechEvents) {
    events.onError?.('unsupported', 'Speech recognition not available in this browser');
  }
  stop() {}
  async requestPermission() {
    return 'unsupported' as const;
  }
}

let singleton: SpeechService | null = null;

/** Factory – swap the implementation here to change STT providers. */
export function getSpeechService(): SpeechService {
  if (!singleton) singleton = getCtor() ? new WebSpeechService() : new NoSpeechService();
  return singleton;
}

export function speechSupported(): boolean {
  return getCtor() !== null;
}
