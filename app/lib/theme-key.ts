// Deliberately has no "use client" directive. The root layout is a Server
// Component and inlines this key into the anti-flash script; importing it
// from a "use client" module there yields a client-reference proxy rather
// than the string, which silently produces localStorage.getItem(undefined).
export const THEME_KEY = "optimallifts.theme";
