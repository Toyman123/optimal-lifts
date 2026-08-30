export function Caret({ up, size = 9 }: { up: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true">
      <path
        d={up ? "M4 0 L8 8 L0 8 Z" : "M0 0 L8 0 L4 8 Z"}
        fill="currentColor"
      />
    </svg>
  );
}

/** The iOS disclosure chevron, and its back-button mirror. */
export function Chevron({
  dir = "right",
  className = "",
}: {
  dir?: "right" | "left";
  className?: string;
}) {
  return (
    <svg
      width="8"
      height="13"
      viewBox="0 0 8 13"
      aria-hidden="true"
      className={
        (dir === "right" ? "ml-2 shrink-0 self-center text-muted " : "shrink-0 ") +
        className
      }
    >
      <path
        d={dir === "right" ? "M1.5 1 L6.5 6.5 L1.5 12" : "M6.5 1 L1.5 6.5 L6.5 12"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Small downward chevron, marking something as changeable. */
export function ChevronDown({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.62}
      viewBox="0 0 13 8"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M1.5 1.5 L6.5 6.5 L11.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={
        "tnum inline-flex items-center gap-1 text-[13px] font-medium " +
        (up ? "text-over" : "text-under")
      }
    >
      <Caret up={up} />
      {up ? "+" : "−"}
      {Math.abs(value)}%
    </span>
  );
}
