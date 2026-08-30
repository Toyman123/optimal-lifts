"use client";

export type Tab = "note" | "charts" | "history" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "note", label: "Note" },
  { key: "charts", label: "Charts" },
  { key: "history", label: "History" },
  { key: "settings", label: "Settings" },
];

export function TabBar({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className="tab"
          aria-current={tab === t.key ? "page" : undefined}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
