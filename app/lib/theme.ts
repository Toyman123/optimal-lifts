"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-key";

export { THEME_KEY };

export type Theme = "light" | "dark" | "system";

export const THEMES: { key: Theme; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "Auto" },
];

function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark" || v === "system";
}

/** Kept in sync with the inline script in layout.tsx — see the note there. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // "system" means *no* attribute, so the prefers-color-scheme media query
  // in globals.css is what decides.
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function read(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (isTheme(raw)) return raw;
  } catch {
    // Storage blocked (private mode, embedded webview) — fall back to system.
  }
  return "system";
}

// Matches the store.ts pattern: false through the hydration render, true
// afterwards, so the first client paint agrees with the server HTML.
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useTheme() {
  const ready = useSyncExternalStore(subscribe, onClient, onServer);
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "system" : read(),
  );

  // The inline script already applied the stored theme before first paint;
  // this keeps the DOM in step with later changes and with a stale state.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not persisting is survivable; the choice still holds for this session.
    }
  }, []);

  return { ready, theme, setTheme };
}
