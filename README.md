# OptimalLifts

OptimalLifts is a workout tracker I built for my push, pull, and legs routine. I had been recording my workouts in the iPhone Notes app, which was quick and easy, but it did not give me a good way to see my progress over time. I wanted to keep the same simple note-taking process while adding charts and workout history.

## How It Works

When you choose a workout, the exercises for that day are already listed. You enter your sets the same way you might type them in a note, then review what the app understood before saving.

For example:

```text
Incline DB Press
70x7 70x7

Machine Chest Press
120x10 120x10
felt strong
```

If you leave an exercise blank, it is not logged. You can also write regular notes or add an exercise that is not already part of your routine. The review screen helps catch mistakes before they are added to your history.

## Entering Sets

The app understands several common formats:

| You type | What it records |
|---|---|
| `70x7 70x7` | Two sets of 7 at 70 pounds |
| `3x10 @ 65` | Three sets of 10 at 65 pounds |
| `65 x 10 x 10 x 8` | Sets of 10, 10, and 8 at 65 pounds |
| `135 8,8,6` | Sets of 8, 8, and 6 at 135 pounds |
| `10 10 8` | Bodyweight sets of 10, 10, and 8 |
| `bw+25x8` | 8 reps with bodyweight plus 25 pounds |

Exercise names do not have to match exactly. For example, "Incline Dumbbell Press" can match "Incline DB Press." If an entry is unclear, the app asks you to fix it instead of guessing.

## Features

- A note-style workout entry screen
- Custom push, pull, and legs routines
- Progress charts for weight, reps, and estimated one-rep max
- Workout history with editable entries
- Light and dark themes
- An optional AI panel for questions about your progress

## Running the Project

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

On Windows, `start-optimallifts.bat` can also build and start the app. It prints the address you can use to open the app from a phone on the same network.

The project uses Next.js, React, and Tailwind CSS. Workout data is stored in the browser, so there is no database or account setup. The optional AI feature requires your own API key. Setup instructions are included in `.env.example`.

## Project Status

OptimalLifts is a personal project that I actively use, but it is still a work in progress. It currently requires the server to be running and does not support accounts, cloud syncing, backups, or exports. Clearing the browser's site data will also remove saved workouts. Automated tests have not been added yet.
