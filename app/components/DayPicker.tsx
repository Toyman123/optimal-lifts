"use client";

import { DAYS, exercisesForDay } from "../lib/exercises";
import { dayLabel } from "../lib/metrics";
import type { DayKey, Exercise } from "../lib/types";

type Props = {
  date: string;
  routine: Exercise[];
  /** The split the rotation suggests, shown as a hint rather than pre-chosen. */
  suggested: DayKey;
  onPick: (day: DayKey) => void;
};

export function DayPicker({ date, routine, suggested, onPick }: Props) {
  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-32">
      <header className="pt-7">
        <h1 className="title-lg">New workout</h1>
        <p className="label mt-1">{dayLabel(date)}</p>
      </header>

      <div className="mt-7 flex flex-col gap-2.5">
        {DAYS.map((d) => {
          const count = exercisesForDay(routine, d.key).length;
          return (
            <button
              key={d.key}
              type="button"
              className="day-choice"
              onClick={() => onPick(d.key)}
            >
              <span>{d.label}</span>
              <span className="label">
                {count} {count === 1 ? "lift" : "lifts"}
                {d.key === suggested && " · next up"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
