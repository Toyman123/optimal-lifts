# OptimalLifts

A push/pull/legs workout logger.

I'd been tracking my lifts in the iPhone Notes app for a while. That part worked fine — what I wanted was something that would take those numbers and actually chart them, so this works the same way.

You pick your split and the day's exercises are already written out. You fill in the numbers and hit save.

```
Push                         Sun · Aug 30

Incline DB Press
70x7 70x7

Machine Chest Press
120x10 120x10
felt strong

Pec Deck
85x12 85x12 80x10
```

Leave a lift blank and it just doesn't get logged. Write something that isn't a lift and it's kept as a note. Add a line for an exercise that isn't in your routine and it gets added.

Before anything saves, it shows you what it read, so a typo doesn't quietly end up in your history.

## Writing sets

Most ways you'd naturally write it will work:

| You type | What it logs |
|---|---|
| `70x7 70x7` | two sets of 7 at 70 |
| `3x10 @ 65` | three sets of 10 at 65 |
| `65 x 10 x 10 x 8` | 65 for 10, 10, then 8 |
| `135 8,8,6` | same idea, commas |
| `10 10 8` | reps only, for bodyweight lifts |
| `bw+25x8` | bodyweight plus 25 |

Names don't have to be exact — "Incline Dumbbell Press" finds "Incline DB Press". If a line genuinely isn't clear it tells you instead of guessing.

Everything's in pounds.

## The rest of it

Four tabs. **Note** is where you write. **Charts** shows each lift's progress — weight, reps, or estimated 1RM, over whatever range you want. **History** lists your past workouts, and tapping one reopens it as the same note so you can fix a number. **Settings** is your routine and light/dark.

## What's not done

I use this, but it's rough in places:

- **No offline mode.** It needs the server running, so the home screen icon opens to nothing if my laptop's asleep. This is the annoying one.
- **Your data lives in one browser.** No accounts, no sync, no backup, no export. Clear your site data and it's gone.
- **No tests.**

## Running it

```bash
cd workout-log
npm install
npm run dev
```

Then open http://localhost:3000.

On Windows, `start-optimallifts.bat` does the build-and-start dance and prints the address to use from your phone.

Built with Next.js, React and Tailwind. Everything's stored in the browser — there's no database and no accounts.

## Asking it questions (optional, off by default)

There's a panel that answers things like "am I stalling on pull-ups?" by looking at your history. It uses the Claude API, which costs money per question, so it's switched off unless you give it a key:

```bash
cp .env.example .env.local   # then paste a key from console.anthropic.com
```

Restart and it shows up in Settings. Without a key it stays hidden and nothing else changes.

Two things worth knowing: it sends a summary of your training history off to answer the question, and the endpoint has no password on it. That's fine on your own machine, but put something in front of it before deploying this anywhere public — otherwise anyone who finds the URL is spending your money.
