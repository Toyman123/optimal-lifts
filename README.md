# OptimalLifts

OptimalLifts is a workout tracker I built for my push, pull, and legs routine. I wanted the simplicity of typing workouts into the iPhone Notes app, with progress charts and a history I could use across devices.

## How it works

Choose a routine, enter your sets in a note-style format, and review the parsed exercises before saving. The parser recognizes exercise aliases and common set formats and flags unclear entries for review.

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
- Note-style set entry with a review step
- Workout history and progress charts
- Rest timer and light/dark themes
- Supabase authentication and cloud storage
- Gemini-powered questions about your saved workout history

Set parsing runs in TypeScript. Gemini powers the coaching feature; it does not modify saved workout records.

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
