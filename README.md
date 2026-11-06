# OptimalLifts

OptimalLifts is a workout tracker I built for my push, pull, and legs routine. It has a notes-first workout log, a persistent rest timer, progress charts, and a history I can use across devices.

## How it works

Choose a routine, enter weight and reps in set rows, and tap the check to complete each set. Completed sets save immediately; unfinished rows persist in the draft. Rest starts only on explicit completion. Editing a completed set does not restart rest. Gemini can also fill reviewed set rows. Existing compact workout notes remain readable and editable as structured rows.

```text
Incline DB Press
70x7 70x7

Machine Chest Press
120x10 120x10
felt strong
```

Workout data is saved locally in the browser. When you sign in, Supabase stores your workout data and syncs it across devices. Local logging remains available without a cloud connection.

## Features

- Custom routines and exercise variations
- Structured set entry, previous-set reuse, and Gemini natural-language parsing with a review step
- Workout history and progress charts
- Responsive homepage and tracker with spacious type, black controls, and organic graphics
- Persistent rest timer, pause/resume, and haptic feedback
- Supabase authentication and cloud storage
- Gemini-powered questions about your saved workout history

Gemini converts natural-language workout descriptions into structured exercise records through the authenticated `/api/parse` endpoint. Exercise-name matching and numeric validation run in TypeScript. Users review the result before applying it to the workout note; ambiguous entries block saving. The existing local parser remains available for compact set notation and offline logging. Supabase stores signed-in users' workout records. Gemini also powers coaching questions about saved workouts.

## Running locally

Requires Node.js and npm.

```bash
npm ci
npm run dev
```

Open the local address printed by the development server. The app uses React, TypeScript, Vite, and Supabase.

Copy `.env.example` to `.env.local` and configure Supabase using [SUPABASE_SETUP.md](SUPABASE_SETUP.md). For AI coaching, configure the server-only `GEMINI_API_KEY`. The coaching endpoint requires a signed-in Supabase user.

## Checks

```bash
npm test
npm run build
```

Tests cover set parsing, exercise matching, workout data, progress calculations, timers, and coaching error handling.

## Deployment

The repository includes a Vercel configuration and an `/api/coach` endpoint. Add the Supabase variables and server-only Gemini key in your deployment settings. Never commit `.env.local` or put the Gemini key in a browser-facing variable.

## Project status

This is a personal project that I actively use. Supabase stores each signed-in user's workout document with row-level security. Browser storage keeps a local copy for use when offline or signed out. Cloud sync and AI coaching require their respective services to be configured.

## Timer behavior

The app-level rest clock uses persisted deadlines rather than decrementing callbacks. It continues across navigation and reconciles on focus, visibility changes, and page restoration. A paused timer retains remaining time across reloads. Finishing a workout clears its timer; parked workout drafts retain their timer identity. Timer ticks stay local and do not trigger cloud writes. Sound and vibration alerts require browser support; an operating system may suspend background execution, so exact background alarm delivery is not guaranteed. The countdown catches up on return.

Regression tests cover timer persistence, throttled callbacks, pause/resume, alert deduplication, explicit completion, corrections, unfinished rows, legacy notes, and single-session saves.

## Homepage and tracker

The homepage lives at `/`; the workout tracker lives at `/app`. Installed app launches go straight to `/app`. Authentication callbacks at the root still open the tracker. The design takes its layout, system typography, black accents, and organic shapes from the Cornell AppDev website; the implementation remains React and Vite. The homepage previews use example workout data, not account data.

Progress includes a labeled sample-history preview with one workout per day and no session-duration values. These examples stay separate from saved workouts and cloud sync. Coach is available beneath the workout editor and uses saved workout history.
