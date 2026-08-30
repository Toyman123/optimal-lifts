import { makeExercise } from "./exercises";
import { formatEntryLine, noteKey } from "./metrics";
import { matchExercise, parseSpec, type ParsedSet } from "./parse";
import type { DayKey, Entry, Exercise } from "./types";

/**
 * Reads a whole written note into a workout.
 *
 * The note is a free text block, so nothing about its shape is guaranteed —
 * lines can be reordered, names edited, extra lifts written in, comments left
 * anywhere. Everything here is therefore inferred from the text alone, and
 * anything uncertain is reported rather than guessed at. The confirm screen
 * shows the result before a single entry is written.
 */

export type NoteLift = {
  /** Matched routine lift, or a freshly made one when it is new. */
  exercise: Exercise;
  /** True when this lift is not yet on the routine and would be added. */
  isNew: boolean;
  sets: ParsedSet[];
  comment: string;
  /** Lines under this lift that could not be read. */
  problems: string[];
};

export type NoteParse = {
  /** Lifts with at least one set, in the order they appear in the note. */
  lifts: NoteLift[];
  /** Named but left empty — skipped, and deliberately not logged. */
  skipped: string[];
  /** Lines that belong to no lift at all. */
  orphans: string[];
};

/** Blank template for a day: every lift named, room to write under each. */
export function buildNoteTemplate(exercises: Exercise[]): string {
  return exercises.map((e) => e.name).join("\n\n\n") + "\n\n";
}

/**
 * A past workout rendered back into the note you would have written. Editing
 * history uses the same screen as logging it did — the numbers come back in
 * the shorthand they went in as.
 */
export function buildNoteFromLog(
  exercises: Exercise[],
  entries: Entry[],
  notes: Record<string, string>,
  date: string,
  day: DayKey,
): string {
  // Lifts on this day, plus anything logged that day which has since been
  // dropped from the routine — otherwise reopening would silently lose it.
  const onDay = exercises.filter((e) => e.day === day);
  const extraIds = [
    ...new Set(
      entries
        .filter((e) => e.date === date && e.day === day)
        .map((e) => e.exercise),
    ),
  ].filter((id) => !onDay.some((e) => e.id === id));
  const extras = exercises.filter((e) => extraIds.includes(e.id));

  return (
    [...onDay, ...extras]
      .map((ex) => {
        const sets = entries.filter(
          (e) => e.date === date && e.exercise === ex.id,
        );
        const line = sets.length ? formatEntryLine(sets, ex.bodyweight) : "";
        const comment = notes[noteKey(ex.id, date)] ?? "";
        return [ex.name, line, comment].filter(Boolean).join("\n");
      })
      .join("\n\n\n") + "\n\n"
  );
}

const isBlank = (line: string) => line.trim() === "";

/** "10 10 8" — bare reps, only meaningful for a bodyweight lift. */
function bareReps(line: string): number[] | null {
  const parts = line.trim().split(/[\s,]+/).filter(Boolean);
  if (!parts.length || parts.length > 20) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 500)) return null;
  return nums;
}

/** A line is prose if it has no digits at all beyond an incidental one. */
function looksLikeComment(line: string): boolean {
  return !/\d/.test(line);
}

export function parseNote(
  text: string,
  routine: Exercise[],
  day: DayKey,
): NoteParse {
  const lifts: NoteLift[] = [];
  const skipped: string[] = [];
  const orphans: string[] = [];

  // Lifts already named in this note, so a repeated name adds to the same one.
  const seen = new Map<string, NoteLift>();
  let current: NoteLift | null = null;

  const open = (exercise: Exercise, isNew: boolean): NoteLift => {
    const existing = seen.get(exercise.id);
    if (existing) return existing;
    const lift: NoteLift = { exercise, isNew, sets: [], comment: "", problems: [] };
    seen.set(exercise.id, lift);
    lifts.push(lift);
    return lift;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (isBlank(line)) continue;

    // "Cable Fly: 50x12" — name and numbers on one line.
    const colon = line.match(/^([^:]+):\s*(.*)$/);
    const namePart = colon ? colon[1].trim() : line;
    const specPart = colon ? colon[2].trim() : "";

    const { best, candidates, topScore } = matchExercise(namePart, routine, day);

    // A near-match on a digit-free line is still a lift: people write
    // "Incline Dumbbell Press" where the routine says "Incline DB Press".
    // The bar is well above what a prose comment ever scores.
    const nearMatch =
      !best && !/\d/.test(namePart) && topScore >= 0.6 ? candidates[0] : null;

    // A line that names a lift starts a new block.
    if (best || nearMatch || (colon && namePart && !/^\d/.test(namePart))) {
      const matched = best ?? nearMatch;
      const exercise =
        matched ?? makeExercise(namePart, day, /bodyweight|bw\b/i.test(namePart));
      if (!exercise.id) {
        orphans.push(line);
        continue;
      }
      current = open(exercise, !matched);

      if (specPart) {
        const { sets, problem } = parseSpec(specPart);
        if (problem) current.problems.push(`${namePart}: ${problem}`);
        else current.sets.push(...sets);
      }
      continue;
    }

    // Everything below a name belongs to that lift.
    if (!current) {
      orphans.push(line);
      continue;
    }

    if (looksLikeComment(line)) {
      current.comment = current.comment ? `${current.comment} ${line}` : line;
      continue;
    }

    const { sets, problem } = parseSpec(line);
    if (!problem && sets.length) {
      current.sets.push(...sets);
      continue;
    }

    // Bare reps are only unambiguous for a lift carrying no external load.
    if (current.exercise.bodyweight) {
      const reps = bareReps(line);
      if (reps) {
        current.sets.push(...reps.map((r) => ({ weight: 0, reps: r })));
        continue;
      }
    }

    current.problems.push(`${current.exercise.name}: ${problem ?? `couldn't read "${line}"`}`);
  }

  // A named lift with nothing written under it was skipped, not logged.
  const withSets = lifts.filter((l) => l.sets.length > 0 || l.problems.length > 0);
  for (const l of lifts) {
    if (!l.sets.length && !l.problems.length) skipped.push(l.exercise.name);
  }

  return { lifts: withSets, skipped, orphans };
}

/** Nothing worth saving, so the Save button can stay disabled. */
export function noteIsEmpty(p: NoteParse): boolean {
  return p.lifts.every((l) => l.sets.length === 0);
}

export function countSets(p: NoteParse): number {
  return p.lifts.reduce((n, l) => n + l.sets.length, 0);
}
