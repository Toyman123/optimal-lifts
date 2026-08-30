import { formatDate, formatNumber } from "../lib/metrics";

const VB_W = 300;
const VB_H = 132;
const PAD_L = 4;
const PAD_R = 4;
const TOP = 12;
const BASE = 100;

export type Point = { date: string; value: number };

/** Weight (or reps) for one exercise across its sessions, oldest to newest. */
export function TrendChart({ points, unit }: { points: Point[]; unit: string }) {
  if (points.length === 0) {
    return (
      <p className="py-9 text-center text-[13px] text-muted">
        No history yet. Log a set to start the chart.
      </p>
    );
  }

  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pad = max === min ? Math.max(1, max * 0.08) : (max - min) * 0.25;
  const hi = max + pad;
  const lo = Math.max(0, min - pad);
  const span = hi - lo || 1;

  const x = (i: number) =>
    points.length === 1
      ? VB_W / 2
      : PAD_L + (i / (points.length - 1)) * (VB_W - PAD_L - PAD_R);
  const y = (v: number) => BASE - ((v - lo) / span) * (BASE - TOP);

  const last = points.length - 1;
  const beat = points.length < 2 || values[last] >= values[last - 1];
  const tone = beat ? "var(--color-over)" : "var(--color-under)";
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="block w-full"
      role="img"
      aria-label={`Trend across ${points.length} sessions, from ${formatNumber(
        values[0],
      )} to ${formatNumber(values[last])} ${unit}.`}
    >
      {/* the level to beat */}
      {points.length >= 2 && (
        <line
          x1="0"
          y1={y(values[last - 1])}
          x2={VB_W}
          y2={y(values[last - 1])}
          stroke="var(--color-muted)"
          strokeOpacity="0.4"
          strokeDasharray="3 4"
          strokeWidth="1"
        />
      )}
      <line
        x1="0"
        y1={BASE}
        x2={VB_W}
        y2={BASE}
        stroke="var(--color-rule)"
        strokeWidth="1"
      />

      {points.length > 1 && (
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-inert)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.value)}
          r={i === last ? 3.5 : 2}
          fill={i === last ? tone : "var(--color-inert)"}
        />
      ))}

      {/* newest value, sitting above its point */}
      <text
        x={x(last)}
        y={Math.max(10, y(values[last]) - 8)}
        textAnchor={points.length > 1 ? "end" : "middle"}
        fontFamily="inherit"
        style={{ fontVariantNumeric: "tabular-nums" }}
        fontSize="11"
        fill={tone}
      >
        {formatNumber(values[last])}
      </text>

      <text
        x={PAD_L}
        y="118"
        fontFamily="inherit"
        style={{ fontVariantNumeric: "tabular-nums" }}
        fontSize="10"
        fill="var(--color-muted)"
      >
        {formatDate(points[0].date)}
      </text>
      {points.length > 1 && (
        <text
          x={VB_W - PAD_R}
          y="118"
          textAnchor="end"
          fontFamily="inherit"
        style={{ fontVariantNumeric: "tabular-nums" }}
          fontSize="10"
          fill="var(--color-muted)"
        >
          {formatDate(points[last].date)}
        </text>
      )}
    </svg>
  );
}
