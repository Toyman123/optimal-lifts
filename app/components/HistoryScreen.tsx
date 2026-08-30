"use client";

import { useMemo, useState } from "react";
import { allSessions, dayLabel, todayISO } from "../lib/metrics";
import { DAYS } from "../lib/exercises";
import type { DayKey, Entry } from "../lib/types";
import { Chevron } from "./Caret";

type Props = {
  entries: Entry[];
  /** Reopens that workout as an editable note. */
  onOpen: (date: string, day: DayKey) => void;
};

const dayName = (d: DayKey) => DAYS.find((x) => x.key === d)?.label ?? d;

export function HistoryScreen({ entries, onOpen }: Props) {
  const sessions = useMemo(() => allSessions(entries), [entries]);
  const today = useMemo(() => todayISO(), []);
  const [pick, setPick] = useState("");
  const [pickDay, setPickDay] = useState<DayKey>("push");

  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-32">
      <header className="pt-7">
        <h1 className="title-lg">History</h1>
        <p className="label mt-0.5">
          {sessions.length} {sessions.length === 1 ? "workout" : "workouts"}
        </p>
      </header>

      <section className="mt-6">
        {sessions.length === 0 ? (
          <div className="card px-5 py-8">
            <p className="label">
              Nothing logged yet. Workouts show up here once you save a note.
            </p>
          </div>
        ) : (
          <div className="group-card">
            {sessions.map((s) => (
              <button
                key={`${s.date}-${s.day}`}
                type="button"
                className="row-btn"
                onClick={() => onOpen(s.date, s.day)}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="lift-name">
                      {dayName(s.day)}
                      {s.date === today && (
                        <span className="label"> · today</span>
                      )}
                    </span>
                    <span className="label shrink-0">{dayLabel(s.date)}</span>
                  </span>
                  <span className="tnum label mt-0.5 block">
                    {s.lifts} {s.lifts === 1 ? "lift" : "lifts"} · {s.sets}{" "}
                    {s.sets === 1 ? "set" : "sets"}
                  </span>
                </span>
                <Chevron />
              </button>
            ))}
          </div>
        )}
        {sessions.length > 0 && (
          <p className="label mt-2 px-1">
            Tap a workout to reopen it as a note and fix anything.
          </p>
        )}
      </section>

      {/* backfill a missed day --------------------------------------- */}
      <section className="mt-7">
        <h2 className="label-strong px-1 pb-2">Log a day you missed</h2>
        <div className="card p-4">
          <div className="seg" role="group" aria-label="Split for that day">
            {DAYS.map((d) => (
              <button
                key={d.key}
                type="button"
                className="seg-item"
                aria-pressed={pickDay === d.key}
                onClick={() => setPickDay(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <label htmlFor="pick-date" className="sr-only">
            Date
          </label>
          <input
            id="pick-date"
            type="date"
            value={pick}
            max={today}
            onChange={(e) => setPick(e.target.value)}
            className="field mt-3 px-3.5 py-3"
          />

          <button
            type="button"
            className="btn mt-3 w-full py-3"
            disabled={!pick}
            onClick={() => pick && onOpen(pick, pickDay)}
          >
            Open that day
          </button>
        </div>
      </section>
    </div>
  );
}
