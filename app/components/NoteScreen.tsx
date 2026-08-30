"use client";

import { useEffect, useRef } from "react";
import { countSets, parseNote } from "../lib/note";
import { dayLabel } from "../lib/metrics";
import { DAYS } from "../lib/exercises";
import { ChevronDown } from "./Caret";
import type { DayKey, Exercise } from "../lib/types";

type Props = {
  day: DayKey;
  date: string;
  text: string;
  routine: Exercise[];
  onChange: (text: string) => void;
  onChangeDay: (day: DayKey) => void;
  onSave: () => void;
  onDiscard: () => void;
};

export function NoteScreen({
  day,
  date,
  text,
  routine,
  onChange,
  onChangeDay,
  onSave,
  onDiscard,
}: Props) {
  const box = useRef<HTMLTextAreaElement | null>(null);

  // Grow with the content so the note scrolls as one page rather than
  // trapping a scrollbar inside the field.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const parsed = parseNote(text, routine, day);
  const sets = countSets(parsed);
  const lifts = parsed.lifts.filter((l) => l.sets.length > 0).length;
  const dayName = DAYS.find((d) => d.key === day)?.label ?? day;

  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-32">
      <header className="flex items-baseline justify-between gap-3 pt-7">
        {/* A real <select> sits invisibly over the heading: on a phone that
            gives the native picker, keyboard support, and screen-reader
            semantics for free, with none of the popover plumbing. */}
        <span className="day-switch">
          <h1 className="title-lg">{dayName}</h1>
          <ChevronDown />
          <select
            className="day-select"
            aria-label="Change split"
            value={day}
            onChange={(e) => onChangeDay(e.target.value as DayKey)}
          >
            {DAYS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </span>
        <span className="label">{dayLabel(date)}</span>
      </header>

      <label htmlFor="note" className="sr-only">
        Write your workout
      </label>
      <div className="card mt-5 px-5 py-5">
        <textarea
          id="note"
          ref={box}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="note-sheet"
          autoComplete="off"
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {/* Fixed above the tab bar so Save is reachable without scrolling to
          the end of a long note. */}
      <div className="fixed inset-x-0 bottom-[calc(49px+env(safe-area-inset-bottom))] z-10 border-t border-line bg-card">
        <div className="mx-auto flex max-w-[430px] items-center gap-3 px-5 py-2.5">
          <span className="label flex-1 truncate">
            {sets > 0
              ? `${lifts} ${lifts === 1 ? "lift" : "lifts"} · ${sets} ${sets === 1 ? "set" : "sets"}`
              : "Nothing written yet"}
          </span>
          <button
            type="button"
            className="link-btn link-btn-sm"
            onClick={onDiscard}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn px-5 py-2.5"
            disabled={sets === 0}
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
