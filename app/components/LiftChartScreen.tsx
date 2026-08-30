"use client";

import { useMemo, useState } from "react";
import {
  defaultMetric,
  formatDate,
  formatNumber,
  formatSets,
  metricsFor,
  metricValue,
  noteKey,
  sessionsForExercise,
  type MetricKey,
} from "../lib/metrics";
import type { Entry, Exercise } from "../lib/types";
import { Caret, Chevron } from "./Caret";
import { TrendChart } from "./TrendChart";

const RANGES = [
  { key: "recent", label: "Last 5" },
  { key: "quarter", label: "3 months" },
  { key: "all", label: "All" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function shiftDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

type Props = {
  exercise: Exercise;
  entries: Entry[];
  notes: Record<string, string>;
  today: string;
  onBack: () => void;
  /** Opens that workout as an editable note. */
  onEditSession: (date: string) => void;
};

/**
 * Read-only view of one lift. Logging and editing both happen in the note,
 * so this screen only has to answer "how is this going".
 */
export function LiftChartScreen({
  exercise,
  entries,
  notes,
  today,
  onBack,
  onEditSession,
}: Props) {
  const bw = Boolean(exercise.bodyweight);
  const metrics = metricsFor(bw);
  const [metric, setMetric] = useState<MetricKey>(defaultMetric(bw));
  const [range, setRange] = useState<RangeKey>("all");

  const groups = useMemo(
    () => sessionsForExercise(entries, exercise.id),
    [entries, exercise.id],
  );

  const points = useMemo(() => {
    const all = groups.map((g) => ({
      date: g.date,
      value: metricValue(g.sets, metric),
    }));
    if (range === "recent") return all.slice(-5);
    if (range === "quarter") {
      const cutoff = shiftDays(today, -90);
      return all.filter((p) => p.date >= cutoff);
    }
    return all;
  }, [groups, metric, range, today]);

  const activeMetric = metrics.find((m) => m.key === metric) ?? metrics[0];
  const latest = groups[groups.length - 1];
  const prior = groups[groups.length - 2];
  const now = latest ? metricValue(latest.sets, metric) : null;
  const before = prior ? metricValue(prior.sets, metric) : null;
  const beat = now !== null && before !== null ? now >= before : null;

  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-32">
      <header className="pt-7">
        <button type="button" className="back-btn" onClick={onBack}>
          <Chevron dir="left" />
          Charts
        </button>
        <h1 className="title-lg mt-2">{exercise.name}</h1>
        <p className="label mt-0.5">
          {groups.length} {groups.length === 1 ? "session" : "sessions"} logged
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="card mt-6 px-5 py-8">
          <p className="label">
            Nothing logged for this lift yet. Write it into a note and it will
            show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="seg mt-5" role="group" aria-label="Chart metric">
            {metrics.map((m) => (
              <button
                key={m.key}
                type="button"
                className="seg-item"
                aria-pressed={metric === m.key}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="seg mt-2.5" role="group" aria-label="Chart range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                className="seg-item"
                aria-pressed={range === r.key}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="card mt-4 px-3 pb-2 pt-4">
            <TrendChart points={points} unit={activeMetric.unit} />
          </div>

          <div className="mt-3 flex items-baseline justify-between px-1">
            <span className="label">
              {activeMetric.label} · {points.length}{" "}
              {points.length === 1 ? "session" : "sessions"}
            </span>
            {beat !== null && (
              <span
                className={
                  "tnum inline-flex items-center gap-1.5 text-[13px] font-medium " +
                  (beat ? "text-over" : "text-under")
                }
              >
                <Caret up={beat} />
                {formatNumber(now ?? 0)} vs {formatNumber(before ?? 0)}
              </span>
            )}
          </div>

          <section className="mt-7">
            <h2 className="label-strong px-1 pb-2">Every session</h2>
            <div className="group-card">
              {[...groups].reverse().map((g) => {
                const comment = notes[noteKey(exercise.id, g.date)];
                return (
                  <button
                    key={g.date}
                    type="button"
                    className="row-btn"
                    onClick={() => onEditSession(g.date)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="lift-name">{formatDate(g.date)}</span>
                        <span className="tnum text-[15px]">
                          {formatSets(g.sets, bw)}
                        </span>
                      </span>
                      {comment && (
                        <span className="label mt-0.5 block truncate">
                          {comment}
                        </span>
                      )}
                    </span>
                    <Chevron />
                  </button>
                );
              })}
            </div>
            <p className="label mt-2 px-1">
              Tap a session to reopen it as a note.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
