# Optimal Lifts

## Visual direction

Follow the supplied dark gym / lime reference. The website home is photographic and expressive; the tracker is compact, quiet, and readable between sets. Do not return to a blue hero panel, pastel journal, serif typography, or oversized dashboard greeting.

## Tokens

- Canvas: `#090c0a`
- Surface: `#121613`
- Elevated surface: `#1a201b`
- Primary text: `#f1f4ef`
- Secondary text: `#9ca59e`
- Action / chart accent: `#b8f78b`
- Text on action: `#11180d`
- Divider: `#ffffff13`
- Error: `#ff9996`
- Typeface: locally bundled DM Sans, 400/500/600/700.
- Numeric data: tabular figures.
- Corner radius: 10–17px for panels and fields; pill for primary actions.
- Spacing: multiples of 4px, with 24–32px between dashboard sections.

## Website home

At `/` or `/#/`: logo, compact navigation, the three-line “Built for / what drives / you.” headline, gym photography, lime Get started action, four decorative phone previews on desktop. Phone examples are explicitly labeled as example data. On phones, use two previews and a natural vertical layout. CTAs open real app routes.

## Tracker

At `/#dashboard`: weekly activity and real training totals, recent saved workouts, next workout, and editable rotation. All metrics derive from saved data. Use no invented consistency, PR, or streak claims. Desktop uses a narrow navigation rail and two content columns. Mobile reserves space for bottom navigation and collapses to a single column.

## Interaction and accessibility

- Keep readable contrast on all dark surfaces and visible keyboard focus.
- Primary interactive targets are at least 44px high.
- Use Phosphor icons consistently; use the three-bar BrandMark for branding.
- Support reduced motion, small phones, tablet landscape, and desktop.
- Preserve local drafts, workout editing, timers, history, and cloud authentication.
- In-page anchors must not navigate away from the active screen.

## Implementation

`theme.css` owns tracker tokens and component appearance. `landing.css` owns website and decorative preview composition. `dashboard.css` owns dashboard layout. `styles.css` supplies existing structural rules. `training.css` is the prior, inactive design and is not imported.

The generated photographic asset is stored in `public/images/gym-atmosphere.png`; it is a background asset, not a screenshot of the website.
