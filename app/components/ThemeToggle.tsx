"use client";

import { THEMES, useTheme } from "../lib/theme";

export function ThemeToggle() {
  const { ready, theme, setTheme } = useTheme();

  return (
    <div className="seg" role="group" aria-label="Appearance">
      {THEMES.map((t) => (
        <button
          key={t.key}
          type="button"
          className="seg-item"
          // Until the stored choice is read, nothing is marked pressed — the
          // server has no way to know it, and guessing causes a hydration
          // mismatch on this attribute.
          aria-pressed={ready && theme === t.key}
          onClick={() => setTheme(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
