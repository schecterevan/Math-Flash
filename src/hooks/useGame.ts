// The game loop: picks questions, listens for answers, judges them, records
// progress, and decides when the session ends.

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkAnswer, formatFact, type Fact } from '../lib/math/facts';
import { SessionScheduler } from '../lib/learning/scheduler';
import { applyAnswer, responseMs } from '../lib/learning/record';
import type { FactStats } from '../lib/learning/mastery';
import { interpret, type Alternative } from '../lib/speech/interpret';
import { getSpeechService, type SpeechErrorKind } from '../lib/speech/speechService';
import { saveFactStats, saveProfile, saveSession, uid, type Profile, type SessionItem, type SessionRecord } from '../lib/storage/db';
import { sfx, speakProblem } from '../lib/sound';
import type { Mode } from '../lib/settings';

export type Phase =
  | 'starting' // waiting for mic
  | 'listening'
  | 'hearing' // speech detected / interim result
  | 'correct'
  | 'wrong'
  | 'unclear' // didn't catch that – say again (never counted wrong)
  | 'reveal' // answer shown after repeated misses
  | 'paused' // reading aloud
  | 'done';

export interface GameOptions {
  profile: Profile;
  stats: Map<string, FactStats>;
  pool: Fact[];
  mode: Mode;
  targeted: boolean;
  voice: boolean;
}

interface Q {
  fact: Fact;
  token: number;
  readyAt: number | null;
  speechStartAt: number | null;
  firstKeyAt: number | null;
  firstMs: number | null | undefined;
  wrong: number[];
  unclear: number;
  hinted: boolean;
  locked: boolean;
  firstVia: 'voice' | 'keypad' | null;
}

export interface Heard {
  text: string;
  value: number | null;
}

const CELEBRATE_MS = 1300;
const RETRY_MS = 1300;
const UNCLEAR_MS = 1100;

export function useGame(opts: GameOptions) {
  const { profile, pool, mode, targeted } = opts;
  const settings = profile.settings;
  const thresholds = { fastMs: settings.fastMs, slowMs: settings.slowMs };
  const speech = getSpeechService();

  const [phase, setPhase] = useState<Phase>('starting');
  const [fact, setFact] = useState<Fact | null>(null);
  const [heard, setHeard] = useState<Heard | null>(null);
  const [answered, setAnswered] = useState(0);
  const [points, setPoints] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [voiceOk, setVoiceOk] = useState(opts.voice && speech.supported);
  const [voiceError, setVoiceError] = useState<SpeechErrorKind | null>(
    opts.voice && !speech.supported ? 'unsupported' : null,
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(settings.timeLimitMin ? settings.timeLimitMin * 60 : null);
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [milestoneFacts, setMilestoneFacts] = useState<string[]>([]);

  const q = useRef<Q | null>(null);
  const token = useRef(0);
  const timers = useRef<number[]>([]);
  const stats = useRef(new Map(opts.stats));
  const profileRef = useRef(profile);
  const voiceRef = useRef(voiceOk);
  voiceRef.current = voiceOk;
  const ended = useRef(false);
  const sched = useRef<SessionScheduler | null>(null);
  const session = useRef<SessionRecord>({
    id: uid(),
    profileId: profile.id,
    startedAt: Date.now(),
    endedAt: Date.now(),
    mode,
    targeted,
    completed: false,
    items: [],
    points: 0,
    stars: 0,
    newlyMastered: [],
  });
  const improved = useRef(new Set<string>());

  if (!sched.current)
    sched.current = new SessionScheduler(pool, stats.current, {
      adaptive: settings.adaptive,
      targeted,
      newPerSession: settings.newPerSession,
      thresholds,
    });

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const questionLimit = settings.timeLimitMin ? Infinity : settings.length === 'unlimited' ? Infinity : settings.length;

  // ---- listening ------------------------------------------------------------

  const listen = useCallback(() => {
    const cur = q.current;
    if (!cur || !voiceRef.current || ended.current) return;
    const myToken = cur.token;
    const stale = () => !q.current || q.current.token !== myToken || q.current.locked;
    speech.listen({
      onListening: (at) => {
        if (stale()) return;
        // Question is "ready" once it's on screen AND the mic is actually open.
        if (q.current!.readyAt === null) q.current!.readyAt = at;
        setPhase((p) => (p === 'starting' ? 'listening' : p));
      },
      onSpeechStart: (at) => {
        if (stale()) return;
        if (q.current!.speechStartAt === null) q.current!.speechStartAt = at;
      },
      onResult: (alts, isFinal, at) => {
        if (stale()) return;
        handleResult(alts, isFinal, at);
      },
      onError: (kind) => {
        setVoiceError(kind);
        setVoiceOk(false);
        // Mic failed: the question simply continues with the number pad.
        if (q.current && q.current.readyAt === null) q.current.readyAt = performance.now();
        setPhase((p) => (p === 'starting' || p === 'hearing' ? 'listening' : p));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- question flow --------------------------------------------------------

  const nextQuestion = useCallback(() => {
    if (ended.current) return;
    if (session.current.items.length >= questionLimit) return finish(true);
    const f = sched.current!.next();
    token.current++;
    q.current = {
      fact: f,
      token: token.current,
      readyAt: voiceRef.current ? null : performance.now(),
      speechStartAt: null,
      firstKeyAt: null,
      firstMs: undefined,
      wrong: [],
      unclear: 0,
      hinted: false,
      locked: false,
      firstVia: null,
    };
    setFact(f);
    setHeard(null);
    setWrongCount(0);
    setShowHint(false);
    setLastMs(null);
    if (voiceRef.current) {
      setPhase('starting');
      listen();
    } else setPhase('listening');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Timing of the FIRST answer to this question. */
  const markFirst = (via: 'voice' | 'keypad', at: number) => {
    const cur = q.current!;
    if (cur.firstMs !== undefined) return;
    cur.firstVia = via;
    cur.firstMs = responseMs({
      readyAt: cur.readyAt,
      speechStartAt: cur.speechStartAt,
      resultAt: at,
      via,
      firstKeyAt: cur.firstKeyAt,
    });
  };

  const handleResult = (alts: Alternative[], isFinal: boolean, at: number) => {
    const cur = q.current!;
    const expected = cur.fact.answer;
    const v = interpret(alts, expected, isFinal);
    if (v.kind === 'wait') {
      setHeard({ text: v.heard, value: null });
      setPhase((p) => (p === 'listening' || p === 'starting' ? 'hearing' : p));
      return;
    }
    if (v.kind === 'unclear') {
      // Not a wrong answer – just ask again.
      cur.unclear++;
      setHeard({ text: v.heard || '…', value: null });
      setPhase('unclear');
      sfx.unclear();
      const t = cur.token;
      later(() => {
        if (q.current?.token === t && !q.current.locked) {
          setPhase('listening');
          listen();
        }
      }, UNCLEAR_MS);
      return;
    }
    setHeard({ text: v.heard, value: v.value });
    submit(v.value, 'voice', at);
  };

  const submit = (value: number, via: 'voice' | 'keypad', at = performance.now()) => {
    const cur = q.current;
    if (!cur || cur.locked || ended.current) return; // de-duplicate
    markFirst(via, at);
    if (checkAnswer(cur.fact, value)) {
      cur.locked = true;
      speech.stop();
      setPhase('correct');
      setLastMs(cur.firstMs ?? null);
      sfx.correct();
      finalizeQuestion(false);
      later(nextQuestion, CELEBRATE_MS);
      return;
    }
    // Wrong – gentle retry.
    cur.wrong.push(value);
    setWrongCount(cur.wrong.length);
    sfx.retry();
    const maxTries = mode === 'challenge' ? 2 : 4;
    if (cur.wrong.length >= maxTries) {
      cur.locked = true;
      speech.stop();
      setPhase('reveal');
      if (mode === 'practice' && settings.hints) setShowHint(true);
      finalizeQuestion(true);
      return;
    }
    setPhase('wrong');
    if (mode === 'practice' && settings.hints && cur.wrong.length >= 2) {
      setShowHint(true);
      cur.hinted = true;
    }
    const t = cur.token;
    later(() => {
      if (q.current?.token === t && !q.current.locked) {
        setPhase('listening');
        listen();
      }
    }, RETRY_MS);
  };

  const finalizeQuestion = (revealed: boolean) => {
    const cur = q.current!;
    const item: SessionItem = {
      factId: cur.fact.id,
      at: Date.now(),
      firstCorrect: cur.wrong.length === 0 && !revealed,
      wrongAnswers: [...cur.wrong],
      ms: cur.firstMs ?? null,
      hinted: cur.hinted,
      revealed,
      unclear: cur.unclear,
      via: cur.firstVia ?? 'keypad',
    };
    const res = applyAnswer(stats.current.get(cur.fact.id), profile.id, item, session.current.id, thresholds);
    const prevLevel = stats.current.get(cur.fact.id)?.level;
    stats.current.set(cur.fact.id, res.stats);
    sched.current!.updateStats(res.stats);
    sched.current!.report(cur.fact, item.firstCorrect, item.ms);
    if (prevLevel && prevLevel !== res.stats.level) {
      const order = ['new', 'learning', 'practicing', 'mastered'];
      if (order.indexOf(res.stats.level) > order.indexOf(prevLevel)) improved.current.add(cur.fact.id);
    }

    const s = session.current;
    s.items.push(item);
    s.points += res.points;
    s.endedAt = Date.now();
    if (res.newlyMastered) {
      s.newlyMastered.push(cur.fact.id);
      setMilestoneFacts((m) => [...m, formatFact(cur.fact)]);
    }
    setAnswered(s.items.length);
    setPoints(s.points);

    const p = profileRef.current;
    profileRef.current = {
      ...p,
      rewards: { ...p.rewards, points: p.rewards.points + res.points, totalQuestions: p.rewards.totalQuestions + 1 },
    };
    // Persist immediately so progress survives closing the tab mid-session.
    void saveFactStats(res.stats);
    void saveSession({ ...s, items: [...s.items] });
    void saveProfile(profileRef.current);
  };

  const finish = (completed: boolean) => {
    if (ended.current) return;
    ended.current = true;
    speech.stop();
    timers.current.forEach(clearTimeout);
    const s = session.current;
    s.completed = completed;
    s.endedAt = Date.now();
    setRecord({ ...s, items: [...s.items] });
    setPhase('done');
  };

  // Continue after an answer was revealed.
  const continueAfterReveal = () => {
    if (phase === 'reveal') nextQuestion();
  };

  // ---- keypad, hints, read-aloud -------------------------------------------

  const keypadInput = () => {
    const cur = q.current;
    if (cur && cur.firstKeyAt === null) cur.firstKeyAt = performance.now();
  };

  const requestHint = () => {
    if (q.current) q.current.hinted = true;
    setShowHint((h) => !h);
  };

  const readAloud = () => {
    const cur = q.current;
    if (!cur || cur.locked) return;
    speech.stop();
    setPhase('paused');
    const t = cur.token;
    speakProblem(formatFact(cur.fact), () => {
      if (q.current?.token !== t || q.current.locked) return;
      // Don't count listening-to-the-question time against the child.
      q.current.readyAt = voiceRef.current ? null : performance.now();
      q.current.speechStartAt = null;
      setPhase(voiceRef.current ? 'starting' : 'listening');
      listen();
    });
  };

  // ---- lifecycle -------------------------------------------------------------

  useEffect(() => {
    ended.current = false;
    nextQuestion();
    return () => {
      ended.current = true;
      speech.stop();
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session timer (doesn't count while the answer is being celebrated).
  useEffect(() => {
    if (timeLeft === null || phase === 'done') return;
    if (timeLeft <= 0) {
      finish(true);
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => (t === null ? t : t - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase === 'done']);

  // If voice dies mid-question while we were waiting on the mic, keep going.
  useEffect(() => {
    if (!voiceOk && q.current && q.current.readyAt === null) q.current.readyAt = performance.now();
  }, [voiceOk]);

  return {
    phase,
    fact,
    heard,
    answered,
    total: questionLimit,
    points,
    lastMs,
    wrongCount,
    showHint,
    voiceOk,
    voiceError,
    timeLeft,
    record,
    finalProfile: () => profileRef.current,
    finalStats: () => stats.current,
    improvedCount: () => improved.current.size,
    milestoneFacts,
    submit: (v: number) => submit(v, 'keypad'),
    keypadInput,
    requestHint,
    readAloud,
    continueAfterReveal,
    stop: () => finish(session.current.items.length >= 10 && questionLimit === Infinity && !settings.timeLimitMin),
    retryVoice: async () => {
      const r = await speech.requestPermission();
      if (r === 'granted') {
        setVoiceError(null);
        setVoiceOk(true);
        voiceRef.current = true;
        listen();
      }
    },
  };
}

export type Game = ReturnType<typeof useGame>;
