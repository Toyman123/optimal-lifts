# OptimalLifts

A push/pull/legs workout logger, styled like iPhone Notes, that shows you last session's numbers while you're standing at the machine — so you know what to beat.

Every lift is already written down the way a note would be — you just add the numbers. Type `70x7 70x7` beside a lift and it saves itself.

## Status

Early but genuinely usable. I run it on my own phone at the gym. It is not deployed, has no tests, and stores everything in one browser's local storage.

**Works**

- **The day page is the note.** Every lift on today's split is listed with a blank line beside it. Write `70x7 70x7` and it saves about a second after you stop typing — no buttons. Faded placeholders show last session's numbers, so you can see the format and what to beat at once.
- **It reads how you actually write.** `70x7 70x7`, `3x10 @ 65`, `65 x 10 x 10 x 8`, `135 8,8,6`, `bw+25x8`. An unreadable line is left alone rather than wiping what you already logged, and anything genuinely ambiguous says so instead of guessing.
- **Tap entry too.** Steppers sized to each lift's increment, for when you'd rather not type.
- **Target suggestions.** Clear the rep goal on every working set and it proposes the next load up; fall short and it tells you to repeat. Bodyweight lifts progress by reps instead of load.
- Editing and deleting sets; one note per lift per session.
- Customising the routine in Settings: add, remove, reorder lifts within a day; bodyweight lifts logged as added weight (`bw`, `bw+25`).
- Per-lift trend chart with avg weight, avg reps, and estimated 1RM (Epley), filterable to the last 5 sessions / 3 months / all, plus a session-over-session delta.
- History, and backfilling a day you forgot.
- **Light / dark / auto**, chosen in Settings, with no flash on load. The whole interface is black and white.
- Installs to an iPhone home screen as a standalone app.

**Off by default**

- **Ask about your progress** — open-ended questions over your history ("am I stalling on pull-ups?"). This is the only feature that calls an API, and it stays completely hidden unless you set `ANTHROPIC_API_KEY` (see below). Everything above works without it.

**Doesn't work / not done yet**

- **No offline support.** There's a manifest and icons, so it installs to the home screen, but there's no service worker. If the machine running the server isn't reachable, the installed app opens to nothing. This is the big one — it's a gym app that needs the gym's wifi to reach my laptop at home. (Typing, suggestions, and charts are all local, so they'd work offline the moment a service worker exists.)
- **Data lives in one browser and nowhere else.** No account, no sync, no backup, no export or import. Clearing site data wipes your entire log, and a second device starts empty.
- **Not deployed.** It runs off my own machine and my phone reaches it over the LAN, which is why `next.config.ts` carries an allowlist of private IP ranges.
- **No tests at all.** Typecheck, lint, and build are clean, and that is the entire safety net.

## Stack

- Next.js 16 (App Router, Turbopack) — static, apart from one optional API route
- React 19
- TypeScript
- Tailwind CSS v4
- System fonts (SF Pro on iOS) — no webfont, nothing to download
- Browser `localStorage` for persistence — no database, no accounts
- `@anthropic-ai/sdk`, used only by the optional coaching route

## How it works

Almost all of it is one client-side React tree with no server behind it.

**State.** `app/lib/store.ts` holds everything in a single `useLog()` hook: logged sets, your routine, and your notes. It reads `localStorage` on first render and writes the whole blob back on every change, under `optimallifts.v1`. `useSyncExternalStore` gates the first paint so hydration matches the server HTML instead of flickering.

**Data model.** An `Entry` is one set — date, split, exercise id, weight, reps, timestamp. Exercise ids are slugified from the name, so removing a lift and adding it back reconnects it to its old history. The default routine in `app/lib/exercises.ts` is copied into your saved state, so edits are yours to keep.

**Reading what you type.** `app/lib/parse.ts` is a plain parser — no model involved. Gym notation is regular enough to handle outright, which keeps entry instant, free, and working with no signal. It splits a trailing note, matches the lift against your own routine by token overlap (reusing the same `slugify` that generates ids), and reads the numbers. Where a line is genuinely ambiguous — `3x10` with no weight, or "curl" when you have three — it says so and offers the choices rather than picking one.

**Derived numbers.** `app/lib/metrics.ts` is pure functions over the entry list. It groups sets by date, averages each session (reps vary set to set, so the average is the honest summary), and computes the trend, estimated 1RM, and change against the previous session. `suggestTarget` applies the overload rule; `suggestDay` advances the push → pull → legs rotation from your last logged date.

**Screens.** `app/page.tsx` switches between views held in local state, not routes: the day list, `ExerciseScreen`, `HistoryScreen`, and `SettingsScreen`. The day list is the only place you normally type; everything else — charts, per-set editing, notes, routine changes — lives a tap away. Logging always writes to whichever date is being viewed, which is what makes backfilling work.

**Saving as you type.** Each row in the day list holds that lift's whole line, so a save has to *replace* what was there rather than append — `setSetsFor` in `store.ts` does that. A line that cannot be read is left alone instead of clearing stored sets, since it is usually just half-typed.

**Theming.** `globals.css` defines the palette as CSS variables per theme and bridges them into Tailwind with `@theme inline`, so utilities resolve through `var()` and a `data-theme` swap actually reaches them. An inline script in `app/layout.tsx` stamps the stored theme onto `<html>` before first paint — without it the page would flash the wrong theme on every load.

**Charts** are hand-rolled inline SVG in `TrendChart.tsx` — a polyline, a dashed line at the level to beat, and the newest point coloured by whether you beat it. No charting library.

## Running it

```bash
cd workout-log
npm install
npm run dev
```

Then open http://localhost:3000.

On Windows, `start-optimallifts.bat` does the whole thing — builds, frees the port, starts the server, opens the browser, and prints the LAN address to use from your phone.

## Optional: the coaching panel

This one feature calls the Claude API, which is billed per request to your own account. It is off unless you turn it on:

```bash
cp .env.example .env.local   # then paste a key from console.anthropic.com
```

Restart the server and an "Ask about your progress" panel appears in Settings. With no key, `GET /api/coach` reports `{"configured": false}`, the panel never renders, and nothing else changes.

Worth knowing before you enable it:

- **It sends your training history to Anthropic** to answer the question. Only a compact digest is sent (`app/lib/summarize.ts`), not the raw log.
- **It needs the server running**, so it won't work offline like the rest of the app.
- It defaults to `claude-opus-5`. Switching `MODEL` in `app/api/coach/route.ts` to `claude-haiku-4-5` costs roughly a fifth as much and is ample for this.
- **`/api/coach` has no auth.** That's fine on your own LAN. If you ever deploy this publicly, put auth or a rate limit in front of it first — every request spends money from your account.
