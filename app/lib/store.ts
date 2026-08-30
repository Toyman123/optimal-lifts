"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_EXERCISES, makeExercise } from "./exercises";
import { noteKey } from "./metrics";
import type { DayKey, Exercise, Saved } from "./types";

const KEY = "optimallifts.v1";
const EMPTY: Saved = { entries: [], exercises: DEFAULT_EXERCISES, notes: {} };

// Returns false through the hydration render and true afterwards, so the first
// client paint matches the server HTML without touching state in an effect.
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved>;
      if (Array.isArray(parsed?.entries)) {
        return {
          entries: parsed.entries,
          exercises:
            Array.isArray(parsed.exercises) && parsed.exercises.length
              ? parsed.exercises
              : DEFAULT_EXERCISES,
          // Stores written before notes existed have none.
          notes: parsed.notes && typeof parsed.notes === "object"
            ? parsed.notes
            : {},
        };
      }
    }
  } catch {
    // Corrupt or unavailable storage starts fresh rather than throwing.
  }
  return EMPTY;
}

export function useLog() {
  const ready = useSyncExternalStore(subscribe, onClient, onServer);

  const [state, setState] = useState<Saved>(() =>
    typeof window === "undefined" ? EMPTY : load(),
  );

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked — the session still works in memory.
    }
  }, [state]);


  /**
   * Writes a whole workout, replacing everything previously logged for that
   * date and split. Saving a note is a statement about the entire session,
   * so a lift deleted from a reopened note has to disappear from the log —
   * writing only what the note contains would leave the old sets behind.
   */
  const replaceWorkout = useCallback(
    (
      date: string,
      day: DayKey,
      items: { exerciseId: string; sets: { weight: number; reps: number }[] }[],
      comments: Record<string, string>,
    ) => {
      setState((s) => {
        const kept = s.entries.filter(
          (e) => !(e.date === date && e.day === day),
        );
        const now = Date.now();
        let n = 0;
        const added = items.flatMap((item) =>
          item.sets.map((set) => ({
            id: newId(),
            date,
            day,
            exercise: item.exerciseId,
            weight: set.weight,
            reps: set.reps,
            ts: now + n++,
          })),
        );

        // Notes follow the same rule: drop this date's, then re-add.
        const notes: Record<string, string> = {};
        for (const [k, v] of Object.entries(s.notes)) {
          if (!k.endsWith(`|${date}`)) notes[k] = v;
        }
        for (const [exId, text] of Object.entries(comments)) {
          if (text.trim()) notes[noteKey(exId, date)] = text;
        }

        return { ...s, entries: [...kept, ...added], notes };
      });
    },
    [],
  );

  /** Returns false when the name is empty or already on that day. */
  const addExercise = useCallback(
    (name: string, day: DayKey, bodyweight: boolean) => {
      const next = makeExercise(name, day, bodyweight);
      const clashes = (list: Exercise[]) =>
        list.some((e) => e.id === next.id && e.day === day);
      // Decided against the current list: a setState updater runs later, so its
      // result cannot be reported back to the caller.
      if (!next.id || clashes(state.exercises)) return false;
      setState((s) =>
        clashes(s.exercises) ? s : { ...s, exercises: [...s.exercises, next] },
      );
      return true;
    },
    [state.exercises],
  );

  /** Drops the lift from the routine. Its logged sets stay in history. */
  const removeExercise = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      exercises: s.exercises.filter((e) => e.id !== id),
    }));
  }, []);

  /** Swaps a lift with its neighbour on the same day. */
  const moveExercise = useCallback((id: string, dir: -1 | 1) => {
    setState((s) => {
      const target = s.exercises.find((e) => e.id === id);
      if (!target) return s;

      const sameDay = s.exercises.filter((e) => e.day === target.day);
      const at = sameDay.findIndex((e) => e.id === id);
      const to = at + dir;
      if (to < 0 || to >= sameDay.length) return s;

      // Swap within the day, then splice the reordered day back in place.
      const reordered = [...sameDay];
      [reordered[at], reordered[to]] = [reordered[to], reordered[at]];

      let n = 0;
      const exercises = s.exercises.map((e) =>
        e.day === target.day ? reordered[n++] : e,
      );
      return { ...s, exercises };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setState((s) => ({ ...s, entries: [], notes: {} }));
  }, []);

  const resetRoutine = useCallback(() => {
    setState((s) => ({ ...s, exercises: DEFAULT_EXERCISES }));
  }, []);

  return {
    ready,
    state,
    replaceWorkout,
    addExercise,
    removeExercise,
    moveExercise,
    clearHistory,
    resetRoutine,
  };
}
