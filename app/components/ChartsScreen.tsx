"use client";

import { DAYS } from "../lib/exercises";
import { formatDate, formatSets, sessionsForExercise } from "../lib/metrics";
import type { Entry, Exercise } from "../lib/types";
import { Chevron } from "./Caret";

type Props = {
  routine: Exercise[];
  entries: Entry[];
  onOpen: (id: string) => void;
};

/** Pick a lift; its chart opens full screen. */
export function ChartsScreen({ routine, entries, onOpen }: Props) {
  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-32">
      <header className="pt-7">
        <h1 className="title-lg">Charts</h1>
        <p className="label mt-0.5">Pick a lift to see how it&apos;s going.</p>
      </header>

      {DAYS.map((d) => {
        const lifts = routine.filter((e) => e.day === d.key);
        if (!lifts.length) return null;

        return (
          <section key={d.key} className="mt-6">
            <h2 className="label-strong px-1 pb-2">{d.label}</h2>
            <div className="group-card">
              {lifts.map((ex) => {
                const groups = sessionsForExercise(entries, ex.id);
                const last = groups[groups.length - 1];
                return (
                  <button
                    key={ex.id}
                    type="button"
                    className="row-btn"
                    onClick={() => onOpen(ex.id)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="lift-name block truncate">{ex.name}</span>
                      <span className="tnum label mt-0.5 block truncate">
                        {last
                          ? `${formatDate(last.date)} · ${formatSets(last.sets, ex.bodyweight)}`
                          : "Nothing logged yet"}
                      </span>
                    </span>
                    <Chevron />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
