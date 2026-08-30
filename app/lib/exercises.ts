import type { DayKey, Exercise } from "./types";

export const DAYS: { key: DayKey; label: string }[] = [
  { key: "push", label: "Push" },
  { key: "pull", label: "Pull" },
  { key: "legs", label: "Legs" },
];

export const DEFAULT_EXERCISES: Exercise[] = [
  // Push
  { id: "incline-db-press", name: "Incline DB Press", day: "push", step: 5, seed: { weight: 60, reps: 10 } },
  { id: "machine-chest-press", name: "Machine Chest Press", day: "push", step: 5, seed: { weight: 120, reps: 10 } },
  { id: "pec-deck", name: "Pec Deck", day: "push", step: 5, seed: { weight: 85, reps: 12 } },
  { id: "machine-shoulder-press", name: "Machine Shoulder Press", day: "push", step: 5, seed: { weight: 70, reps: 10 } },
  { id: "lateral-raise", name: "Lateral Raise", day: "push", step: 2.5, seed: { weight: 15, reps: 15 } },
  { id: "tricep-extension", name: "Tricep Extension", day: "push", step: 5, seed: { weight: 45, reps: 12 } },
  { id: "overhead-extension", name: "Overhead Extension", day: "push", step: 5, seed: { weight: 40, reps: 12 } },

  // Pull
  { id: "pull-up", name: "Pull Up", day: "pull", step: 5, bodyweight: true, seed: { weight: 0, reps: 8 } },
  { id: "cable-row", name: "Cable Row", day: "pull", step: 5, seed: { weight: 130, reps: 10 } },
  { id: "lat-pulldown", name: "Lat Pulldown", day: "pull", step: 5, seed: { weight: 120, reps: 10 } },
  { id: "reverse-pec-deck", name: "Reverse Pec Deck", day: "pull", step: 5, seed: { weight: 50, reps: 15 } },
  { id: "straight-bar-curl", name: "Straight Bar Curl", day: "pull", step: 5, seed: { weight: 60, reps: 10 } },
  { id: "bayesian-curl", name: "Bayesian Curl", day: "pull", step: 2.5, seed: { weight: 20, reps: 12 } },

  // Legs
  { id: "leg-press", name: "Leg Press", day: "legs", step: 10, seed: { weight: 270, reps: 10 } },
  { id: "rdl", name: "RDL", day: "legs", step: 10, seed: { weight: 155, reps: 10 } },
  { id: "leg-extension", name: "Leg Extension", day: "legs", step: 5, seed: { weight: 100, reps: 12 } },
  { id: "leg-curl", name: "Leg Curl", day: "legs", step: 5, seed: { weight: 90, reps: 12 } },
  { id: "calf-raise", name: "Calf Raise", day: "legs", step: 10, seed: { weight: 160, reps: 15 } },
];

/** Ids come from the name, so re-adding a lift reconnects its old history. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeExercise(
  name: string,
  day: DayKey,
  bodyweight: boolean,
): Exercise {
  return {
    id: slugify(name),
    name: name.trim(),
    day,
    step: 5,
    ...(bodyweight ? { bodyweight: true } : {}),
    seed: bodyweight ? { weight: 0, reps: 10 } : { weight: 45, reps: 10 },
  };
}

export function exerciseById(
  list: Exercise[],
  id: string,
): Exercise | undefined {
  return list.find((e) => e.id === id);
}

export function exercisesForDay(list: Exercise[], day: DayKey): Exercise[] {
  return list.filter((e) => e.day === day);
}
