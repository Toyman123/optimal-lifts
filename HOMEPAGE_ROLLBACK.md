# Homepage rollback

The previous homepage is preserved in `src/LandingClassic.tsx` and uses the unchanged `src/landing.css`.

- Preview it immediately at `/?homepage=classic`.
- Preview the blue version at `/?homepage=premium`.
- To restore the classic homepage as the site-wide default, run `npm run homepage:classic`, commit `src/homepageTheme.ts`, and push to the production branch (`main`). The normal Vercel deployment publishes it.
- To return to blue, run `npm run homepage:premium` and publish the same way.

The setting is one line in `src/homepageTheme.ts`. These commands change only that setting. They do not change the workout app, account data, timers, or backend.

The Git tag `homepage-before-blue-2026-11-07` records the full source checkpoint before this redesign. Use the homepage switch for a homepage-only rollback so later app changes are preserved.

The animated feature cards are isolated demonstrations. They never save workouts or alter the real rest timer. Their loops pause when offscreen or when the browser tab is hidden. Reduced-motion users see still examples.

The checkpoint includes the latest sign-in and automatic-rest update. Both homepage designs use account wording that matches that behavior.
