export type DayKey = "push" | "pull" | "legs";

export type Exercise = {
  id: string;
  name: string;
  day: DayKey;
  /** Weight increment for the stepper, in lb. */
  step: number;
  /** Loaded by bodyweight. Weight entered against it is *added* weight. */
  bodyweight?: boolean;
  /** Stepper fallback when the lift has no history yet. */
  seed: { weight: number; reps: number };
};

export type Entry = {
  id: string;
  date: string; // YYYY-MM-DD
  day: DayKey;
  exercise: string; // Exercise id
  weight: number;
  reps: number;
  ts: number;
};

export type Saved = {
  entries: Entry[];
  /** The lifter's current routine. Starts from the built-in split. */
  exercises: Exercise[];
  /** One note per lift per session, keyed by `exerciseId|date`. */
  notes: Record<string, string>;
};
