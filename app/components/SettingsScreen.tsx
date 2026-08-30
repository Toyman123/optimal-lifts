"use client";

import { useState } from "react";
import { DAYS, exercisesForDay } from "../lib/exercises";
import type { DayKey, Exercise, Saved } from "../lib/types";
import { CoachPanel } from "./CoachPanel";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  state: Saved;
  day: DayKey;
  onAddExercise: (name: string, day: DayKey, bodyweight: boolean) => boolean;
  onRemoveExercise: (id: string) => void;
  onMoveExercise: (id: string, dir: -1 | 1) => void;
  onResetRoutine: () => void;
  onClearHistory: () => void;
};

export function SettingsScreen({
  state,
  day,
  onAddExercise,
  onRemoveExercise,
  onMoveExercise,
  onResetRoutine,
  onClearHistory,
}: Props) {
  const [editDay, setEditDay] = useState<DayKey>(day);
  const [draft, setDraft] = useState("");
  const [draftBw, setDraftBw] = useState(false);

  const list: Exercise[] = exercisesForDay(state.exercises, editDay);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (onAddExercise(draft, editDay, draftBw)) {
      setDraft("");
      setDraftBw(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-32">
      <header className="pt-7">
        <h1 className="title-lg">Settings</h1>
      </header>

      {/* routine ----------------------------------------------------- */}
      <section className="mt-6">
        <h2 className="label-strong px-1 pb-2">Lifts</h2>

        <div className="seg" role="group" aria-label="Day to edit">
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              className="seg-item"
              aria-pressed={editDay === d.key}
              onClick={() => setEditDay(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="card mt-3 px-5 py-7">
            <p className="label">No lifts on this day yet. Add one below.</p>
          </div>
        ) : (
          <ul className="group-card mt-3">
            {list.map((ex, i) => (
              <li key={ex.id} className="flex items-center px-3 py-1.5">
                <button
                  type="button"
                  className="del-btn shrink-0"
                  onClick={() => onRemoveExercise(ex.id)}
                  aria-label={`Remove ${ex.name}`}
                >
                  <svg width="12" height="12" viewBox="0 0 11 11" aria-hidden="true">
                    <path
                      d="M1 1 L10 10 M10 1 L1 10"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <span className="lift-name min-w-0 flex-1 truncate px-2">
                  {ex.name}
                </span>
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    className="move-btn"
                    disabled={i === 0}
                    onClick={() => onMoveExercise(ex.id, -1)}
                    aria-label={`Move ${ex.name} up`}
                  >
                    <svg width="12" height="8" viewBox="0 0 11 7" aria-hidden="true">
                      <path
                        d="M1 6 L5.5 1 L10 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="move-btn"
                    disabled={i === list.length - 1}
                    onClick={() => onMoveExercise(ex.id, 1)}
                    aria-label={`Move ${ex.name} down`}
                  >
                    <svg width="12" height="8" viewBox="0 0 11 7" aria-hidden="true">
                      <path
                        d="M1 1 L5.5 6 L10 1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="card mt-3 p-4">
          <label htmlFor="new-lift" className="sr-only">
            New lift name
          </label>
          <input
            id="new-lift"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Add a lift to ${editDay}`}
            autoComplete="off"
            autoCapitalize="words"
            className="field px-3.5 py-3"
          />
          <div className="mt-2.5 flex gap-2.5">
            <button
              type="button"
              className="pill"
              aria-pressed={draftBw}
              onClick={() => setDraftBw((v) => !v)}
            >
              Bodyweight
            </button>
            <button type="submit" className="btn flex-1 py-3" disabled={!draft.trim()}>
              Add lift
            </button>
          </div>
          <p className="label mt-2.5">
            Removing a lift keeps its history. Add it back any time to pick up
            where you left off.
          </p>
        </form>
      </section>

      {/* appearance -------------------------------------------------- */}
      <section className="mt-7">
        <h2 className="label-strong px-1 pb-2">Appearance</h2>
        <ThemeToggle />
      </section>

      {/* coaching, only when a key is configured ---------------------- */}
      <CoachPanel state={state} />

      {/* data -------------------------------------------------------- */}
      <section className="mt-7">
        <h2 className="label-strong px-1 pb-2">Data</h2>
        <div className="group-card">
          <button type="button" className="row-btn" onClick={onResetRoutine}>
            <span className="lift-name flex-1">Reset to default routine</span>
          </button>
          <button
            type="button"
            className="row-btn"
            onClick={() => {
              if (
                confirm("Delete every set you have logged? This cannot be undone.")
              ) {
                onClearHistory();
              }
            }}
          >
            <span className="lift-name flex-1">Clear all history</span>
          </button>
        </div>
      </section>
    </div>
  );
}
