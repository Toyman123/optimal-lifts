# App theme checkpoint

The blue app theme is isolated in `src/appPremium.css`, imported from `src/main.tsx`. The homepage keeps its own theme files.

For a styling-only rollback, remove the `appPremium.css` import and publish through the normal build and Git push flow. The previous styles remain intact underneath. The Git tag `app-before-blue-2026-11-07` preserves the source before the app-wide theme update.

The update adds page-entry motion, a blue active-navigation highlight, and reduced-motion handling. It does not change authentication, workout storage, notes parsing, cloud synchronization, rest-timer deadlines, or Coach requests.

Visual QA used isolated sample-data fixtures; those temporary fixture files were removed before publication.
