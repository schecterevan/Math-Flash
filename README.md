# Number Hero – voice-controlled math flashcards

A math-facts game for kids. A problem appears, the child says the answer out loud, and the game checks it. Behind the scenes an adaptive engine tracks every fact (8 + 7, 6 × 4, …) and spends practice time where it's needed.

React + TypeScript + Vite + Tailwind. There's no backend, no accounts and no paid APIs. All data stays in the browser (IndexedDB).

## Run it

Requires Node.js 18 or newer.

```bash
cd number-hero
npm install
npm run dev          # http://localhost:5173
```

Other commands:

```bash
npm test             # unit tests (Vitest)
npm run build        # production build → dist/
npm run preview      # serve the production build (installable PWA)
```

To use it on a tablet or phone on the same Wi-Fi, run `npm run dev -- --host` and open the printed network address. **Browsers only allow the microphone on `https://` or `localhost`.** On another device you therefore need HTTPS, for example by deploying `dist/` to any static host such as Netlify, Vercel or GitHub Pages.

## Publish on GitHub Pages (free HTTPS)

Pushing to `main` builds and publishes the app automatically (`.github/workflows/deploy.yml`). The build uses relative paths, so it works under the repository's sub-path.

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Leave *Custom domain* empty unless you own a real domain such as `example.com`.

The app is then at `https://<your-username>.github.io/<repo-name>/`. It's HTTPS, so the microphone works on phones and tablets.

## Which browsers support voice

| Browser | Voice answers | Notes |
|---|---|---|
| **Chrome** (desktop, Android) | ✅ Best | Uses Google's online speech service. Needs internet. |
| **Edge** (desktop) | ✅ Good | Uses Microsoft's online speech service. Needs internet. |
| **Safari** (macOS, iPadOS, iOS 14.5+) | ✅ Works | Uses Apple's speech recognition. Siri / dictation must be enabled. Can be a bit slower to restart between questions. |
| Firefox, and some in-app or embedded browsers | ❌ | The game switches to the on-screen number pad automatically. |

If voice isn't available, the microphone is blocked, or recognition stops working mid-game, the number pad appears and the game carries on. The physical keyboard also works (digits, Enter, Backspace).

**Offline:** the installed PWA (from `npm run build` + `npm run preview`, or a deployed copy) opens and plays offline with the number pad. Voice recognition in Chrome and Edge needs a network connection, so voice is **not** guaranteed offline.

## Privacy

- No server and no analytics. Profiles, statistics and settings are stored in this browser's IndexedDB. Use *Parent area → Profiles & data → Export* for a JSON backup.
- The app never records or stores audio. The browser's speech engine does the transcription. In Chrome and Edge that means audio goes to Google's or Microsoft's speech service. Safari uses Apple's (on-device on some newer devices). The app only receives the transcript text, uses it to read the number, and then discards it.
- To avoid cloud speech recognition completely, turn off *Voice answers* in Settings.

## How it works

### For the child
- Press ▶. The mic opens automatically for every question; the big icon shows *listening*, *hearing you*, ✓, ↻ (try again) or 👂 (say it again).
- A small bubble shows what was heard ("thirteen" → 13), so recognition mistakes are easy to spot.
- If an answer is wrong, the character wiggles and the child tries again. Points are never taken away.
- 💡 hint, 🔊 read the problem aloud (the mic pauses while it talks), ⌨️ number pad.
- 🎨 dress up the character. Stars unlock worlds (themes). Every **win** (a finished session that earns at least one star) makes the character stronger, with 5 muscle levels at 1, 3, 6, 10 and 15 wins. Each win also adds **the next piece of an outfit**. There are 7 outfits with 10 pieces each, and the 10th piece is always a vehicle: race car driver (race car), rapper (limo), rock star (motorcycle), astronaut (rocket), wrestler (monster truck), soldier (tank) and Garnet & Gold (flaming spear and an Appaloosa horse). The child picks which outfit to build in Dress Up (🔨); a finished outfit moves on to the next one.

### For the parent (🔒 top-right, then answer a multiplication question)
- **Progress:** totals, first-try accuracy, average and median answer time, practice time by day, accuracy over time, most-missed and slowest facts, progress by operation and number range, and the **Math Fact Mastery Grid**. Tap a cell to see its history. Use *Select facts* or *Pick 10 weakest*, then *▶ Practice these* to start a targeted session.
- **Settings:** operations, ranges (presets or custom), no-negative subtraction, times tables, division tables, session length (10, 20, 30 or 50 questions, unlimited, or 2, 5 or 10 minutes), mode, sound, hints, show timing, voice, adaptive on/off, fast/slow thresholds and new facts per session. Settings save automatically.
- **Outfits:** a preview of every character with a 0–10 piece stepper, plus muscle-level and pose controls. Preview only; it doesn't change progress.
- **Profiles & data:** multiple child profiles, rename, reset statistics, delete, export and import JSON, and privacy notes.

Defaults on first launch: addition and subtraction with numbers 0–10, no negative answers, 20 questions, untimed Practice mode, voice on, hints on, adaptive on.

### Answer judging (`src/lib/speech/`)
- `numberParser.ts` handles "thirteen", "twenty-three", "one hundred and five", "13", "I think it's 13" and "8 plus 5 is 13". When several numbers are spoken, the last one is the answer. Homophones ("for" → 4, "ate" → 8, "to" → 2, "won" → 1, …) are used only if no real number word was heard, so "seven too" means 7.
- `interpret.ts` decides what to do with each result:
  - A correct number in **any** alternative transcript is accepted, which tolerates children's speech.
  - A correct *interim* result is accepted immediately for low latency. The exception is tens like "twenty", which could still become "twenty-three".
  - A wrong number is judged only on the **final** result.
  - No number, or a low-confidence wrong number, means "say it again". This never counts as a wrong answer.
- `speechService.ts` defines a `SpeechService` interface and a Web Speech API implementation. It uses a fresh recognizer for every question, so late or duplicate events can't be processed twice. It restarts quietly after silence, and reports permission or hardware errors so the game can fall back to the number pad. To use another speech-to-text provider (e.g. on-device Whisper), implement `SpeechService` and return it from `getSpeechService()`.

### Response time
Timing runs from the moment the question is on screen **and** the mic is actually open until the moment the child **starts speaking** (the browser's `speechstart` event) or presses the first key. Transcription delay is not counted. If a browser doesn't report `speechstart`, the app subtracts an estimated 0.7 s of recognizer latency. If the mic never opened, the answer is stored without a time instead of being penalized. Time spent listening to the read-aloud is not counted either. Hinted answers are excluded from speed statistics.

### Adaptive engine (`src/lib/learning/`)
Every fact stores: times presented, first-try correct, wrong answers, retries, response times, last practiced, the last 30 attempts, mastery level and a spaced-repetition due date.

| Level | Rule (coaching heuristic, configurable thresholds) |
|---|---|
| New | Fewer than 3 attempts |
| Learning | Recent first-try accuracy below 70% |
| Practicing | Usually right but slow or inconsistent, or not yet proven across sessions |
| Mastered | Known on sight (first 2–3 answers all fast and right, in ≥ 2 sessions), or 4 of the last 5 right on the first try (or the last 3 right and fast) with median time "fast" and fast-correct answers in ≥ 2 different sessions |

The scheduler (`scheduler.ts`):
- Weights facts by need: learning > slow practicing > new > mastered-and-due > mastered-not-due.
- Brings a missed fact back about 3 questions later, and a slow-but-correct one about 6 later.
- Boosts related facts after a miss (turn-around 7 + 8 and the fact family 15 − 8). They are still tracked separately.
- Never asks the same fact or its turn-around back to back.
- Finds the child's level quickly. New facts come in easiest-first, but each new fact answered fast pushes ahead in difficulty, with jumps that double (4, 8, 16, …). A slow or missed new fact steps back and climbs carefully again. The next session resumes at the child's level instead of starting over, and about 15% of new facts back-fill easier ones that were skipped. It stops introducing new facts after *N* new facts turned out to be hard, or while 6+ facts are still in Learning.
- Facts answered fast every time get only occasional spot checks, and count as mastered after fast answers in two different sessions. When nothing needs work, about 80% of questions are new facts.
- Uses spaced repetition for mastered facts: review intervals of 1 → 2 → 4 → 7 → 14 → 30 → 60 days, and any miss makes the fact due again immediately.
- Raises difficulty only through demonstrated mastery, never just because a session ended.

### Rewards (`src/lib/rewards.ts`)
- Points: +10 for solving a question, +5 for first try or for persevering after a miss, +25 when a fact becomes mastered. No points for speed, so there's no reason to rush or guess.
- Stars per session: 1 for finishing, +1 for ≥ 80% first try, +1 for improving at least one fact.
- Daily streak: counts a day with at least 5 questions.
- Milestones: question totals, mastered-fact totals, streaks and unlocks.

## Project layout

```
src/
  lib/math/facts.ts            fact model, problem generator, related facts, difficulty
  lib/speech/                  number parser, answer interpretation, speech service
  lib/learning/                mastery tracking, adaptive scheduler, answer recording
  lib/storage/db.ts            IndexedDB, profiles, export/import
  lib/rewards.ts, settings.ts, analytics.ts, sound.ts, finishSession.ts
  hooks/useGame.ts             game state machine
  screens/                     Home, Game, Results, Wardrobe
  parent/                      Dashboard, MasteryGrid, Settings, Profiles & data
  components/                  Mascot, Hint visuals, NumberPad, MicStatus, Confetti
  lib/__tests__/               unit tests
public/sw.js, manifest.webmanifest   PWA (hand-written service worker)
```

## Tests

`npm test` covers:
- problem generation: every fact is mathematically correct, and settings, no-negative and tables are respected
- spoken-number parsing and homophones
- answer interpretation: unclear speech, low confidence, interim results
- answer checking and recording: wrong answers are recorded, recognition failures are not
- mastery classification, spaced repetition and response-time calculation
- the scheduler: struggling facts get more practice, missed facts return, no back-to-back repeats, the new-fact limit
- rewards, and IndexedDB persistence across a simulated reload, including export, reset and import

## Known limitations

- Speech recognition quality depends on the browser's engine. Children's voices and background noise still cause misreadings, so the "heard" bubble and the number pad are always available.
- Chrome and Edge voice recognition needs internet and sends audio to their providers. Firefox has no support.
- `speechstart` can be triggered by background noise, which makes some times look shorter than they were.
- Mastery thresholds are coaching heuristics, not educational standards. Adjust the fast and slow thresholds in Settings.
- The parent gate is a light "grown-ups only" check, not security.
- Data lives in one browser on one device. Use export and import to move it.
