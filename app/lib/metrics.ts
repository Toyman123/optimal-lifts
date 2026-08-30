import type { DayKey, Entry } from "./types";

export type MetricKey = "weight" | "reps" | "e1rm";

export type Metric = { key: MetricKey; label: string; unit: string };

/**
 * Every chart point is the average across that date's sets, because reps
 * usually vary set to set and the average is the honest summary of the day.
 */
export function metricsFor(bodyweight: boolean): Metric[] {
  return bodyweight
    ? [
        { key: "reps", label: "Avg reps", unit: "reps" },
        { key: "weight", label: "Avg added", unit: "lb" },
      ]
    : [
        { key: "weight", label: "Avg weight", unit: "lb" },
        { key: "reps", label: "Avg reps", unit: "reps" },
        { key: "e1rm", label: "Est 1RM", unit: "lb" },
      ];
}

export function defaultMetric(bodyweight: boolean): MetricKey {
  return bodyweight ? "reps" : "weight";
}

export type SessionGroup = { date: string; sets: Entry[] };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function metricValue(sets: Entry[], metric: MetricKey): number {
  if (!sets.length) return 0;
  const avg = (f: (s: Entry) => number) =>
    sets.reduce((n, s) => n + f(s), 0) / sets.length;

  if (metric === "reps") return round1(avg((s) => s.reps));
  // Epley per set, then averaged.
  if (metric === "e1rm") {
    return Math.round(avg((s) => s.weight * (1 + s.reps / 30)));
  }
  return round1(avg((s) => s.weight));
}

/** Every session that includes this exercise, oldest first. */
export function sessionsForExercise(
  entries: Entry[],
  exerciseId: string,
): SessionGroup[] {
  const byDate = new Map<string, Entry[]>();
  for (const e of entries) {
    if (e.exercise !== exerciseId) continue;
    const arr = byDate.get(e.date);
    if (arr) arr.push(e);
    else byDate.set(e.date, [e]);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, sets]) => ({
      date,
      sets: [...sets].sort((a, b) => a.ts - b.ts),
    }));
}

/** Dates this split was trained, oldest first. */
export function datesForDay(entries: Entry[], day: DayKey): string[] {
  const seen = new Set<string>();
  for (const e of entries) if (e.day === day) seen.add(e.date);
  return [...seen].sort();
}

export function deltaPct(
  groups: SessionGroup[],
  metric: MetricKey,
): number | null {
  if (groups.length < 2) return null;
  const now = metricValue(groups[groups.length - 1].sets, metric);
  const prev = metricValue(groups[groups.length - 2].sets, metric);
  if (!prev) return null;
  return Math.round(((now - prev) / prev) * 100);
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** Next day in the push/pull/legs rotation, based on the last session logged. */
export function suggestDay(entries: Entry[]): DayKey {
  if (!entries.length) return "push";
  const order: DayKey[] = ["push", "pull", "legs"];
  const latest = entries.reduce((a, b) => (a.date > b.date ? a : b));
  if (latest.date === todayISO()) return latest.day;
  return order[(order.indexOf(latest.day) + 1) % order.length];
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}

/** "70 lb", "BW", or "BW+25" for bodyweight movements. */
export function formatLoad(weight: number, bodyweight?: boolean): string {
  if (bodyweight) return weight > 0 ? `BW+${formatNumber(weight)}` : "BW";
  return `${formatNumber(weight)} lb`;
}

/** "140 lb × 10·10·8" — one line summary of a session's sets. */
export function formatSets(sets: Entry[], bodyweight?: boolean): string {
  if (!sets.length) return "";
  const weights = [...new Set(sets.map((s) => s.weight))];
  const reps = sets.map((s) => s.reps).join("·");
  if (weights.length === 1) {
    return `${formatLoad(weights[0], bodyweight)} × ${reps}`;
  }
  // Mixed loads: pair each set with its own weight.
  return sets
    .map((s) => `${formatNumber(s.weight)}×${s.reps}`)
    .join("  ");
}

/**
 * Sets rendered back into the shorthand they were typed in — "70x7 70x7".
 * The day list round-trips through this, so reopening the page shows exactly
 * what you wrote rather than a reformatted version of it.
 */
export function formatEntryLine(sets: Entry[], bodyweight?: boolean): string {
  return sets
    .map((s) => {
      const load = bodyweight
        ? s.weight > 0
          ? `bw+${formatNumber(s.weight)}`
          : "bw"
        : formatNumber(s.weight);
      return `${load}x${s.reps}`;
    })
    .join(" ");
}

/**
 * Which split a lift was trained under on a date. A lift can sit on one day
 * of the routine but have been logged under another, so reopening a session
 * has to use what was recorded, not what the routine says today.
 */
export function dayOfWorkout(
  entries: Entry[],
  date: string,
  exerciseId: string,
): DayKey | null {
  const hit = entries.find((e) => e.date === date && e.exercise === exerciseId);
  return hit ? hit.day : null;
}

export function formatDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** "Mon · Aug 24" for the header. */
export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const month = d.toLocaleDateString(undefined, { month: "short" });
  return `${weekday} · ${month} ${d.getDate()}`;
}

export function noteKey(exerciseId: string, date: string): string {
  return `${exerciseId}|${date}`;
}

export type SessionSummary = {
  date: string;
  day: DayKey;
  lifts: number;
  sets: number;
};

/**
 * Every workout logged, newest first — one entry per date *and* split. Two
 * splits trained on one date are two workouts, so each gets its own row and
 * can be opened independently.
 */
export function allSessions(entries: Entry[]): SessionSummary[] {
  const byWorkout = new Map<
    string,
    { date: string; day: DayKey; lifts: Set<string>; sets: number }
  >();

  for (const e of entries) {
    const key = `${e.date}|${e.day}`;
    let g = byWorkout.get(key);
    if (!g) {
      g = { date: e.date, day: e.day, lifts: new Set(), sets: 0 };
      byWorkout.set(key, g);
    }
    g.lifts.add(e.exercise);
    g.sets += 1;
  }

  const order: DayKey[] = ["push", "pull", "legs"];
  return [...byWorkout.values()]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        order.indexOf(a.day) - order.indexOf(b.day),
    )
    .map(({ date, day, lifts, sets }) => ({
      date,
      day,
      lifts: lifts.size,
      sets,
    }));
}
