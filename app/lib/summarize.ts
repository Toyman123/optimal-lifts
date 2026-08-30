import { exerciseById } from "./exercises";
import { formatSets, metricValue, sessionsForExercise } from "./metrics";
import type { Saved } from "./types";

/**
 * A compact, readable digest of the log for the coaching request.
 *
 * Deliberately not the raw entry list: a year of lifting is thousands of
 * entries, and the model only needs the shape of each lift's progress. This
 * keeps a request in the low thousands of tokens instead of tens of them.
 */

const MAX_SESSIONS_PER_LIFT = 8;

export function buildDigest(state: Saved): string {
  const lines: string[] = [];

  for (const ex of state.exercises) {
    const groups = sessionsForExercise(state.entries, ex.id);
    if (!groups.length) continue;

    const recent = groups.slice(-MAX_SESSIONS_PER_LIFT);
    const head = `${ex.name} (${ex.day}${ex.bodyweight ? ", bodyweight" : ""}, ${ex.step} lb increment)`;

    const body = recent
      .map((g) => {
        const e1rm = ex.bodyweight ? "" : `, e1RM ${metricValue(g.sets, "e1rm")}`;
        return `    ${g.date}: ${formatSets(g.sets, ex.bodyweight)}${e1rm}`;
      })
      .join("\n");

    const skipped =
      groups.length > recent.length
        ? `    (${groups.length - recent.length} earlier sessions not shown)\n`
        : "";

    lines.push(`  ${head}\n${skipped}${body}`);
  }

  if (!lines.length) return "The log is empty — nothing has been recorded yet.";

  const notes = Object.entries(state.notes)
    .slice(-12)
    .map(([key, text]) => {
      const [exId, date] = key.split("|");
      const name = exerciseById(state.exercises, exId)?.name ?? exId;
      return `  ${date} ${name}: ${text}`;
    });

  return [
    "LIFT HISTORY (oldest to newest per lift; loads in lb, 'BW' means bodyweight):",
    lines.join("\n\n"),
    notes.length ? `\nRECENT SESSION NOTES:\n${notes.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** One-line orientation for the model: what the lifter is working from. */
export function describeRoutine(state: Saved): string {
  const byDay = (["push", "pull", "legs"] as const).map((d) => {
    const names = state.exercises
      .filter((e) => e.day === d)
      .map((e) => e.name)
      .join(", ");
    return `  ${d}: ${names || "(none)"}`;
  });
  return `CURRENT ROUTINE (push/pull/legs split):\n${byDay.join("\n")}`;
}

