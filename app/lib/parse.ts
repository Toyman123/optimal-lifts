import { slugify } from "./exercises";
import type { DayKey, Exercise } from "./types";

/**
 * Turns gym shorthand into sets. No model involved — the notation is regular
 * enough to parse outright, which keeps entry instant, free, and usable with
 * no signal at the gym.
 *
 * Understood forms:
 *   incline db 3x10 @ 65      3 sets of 10 at 65
 *   65 x 10 x 10 x 8          one weight, a rep per set
 *   135 8,8,6                 same, comma-separated
 *   10,10,8 @ 65              reps first, weight after
 *   bw x 12                   bodyweight
 *   bw+25 x 8                 bodyweight plus added load
 *   ... , felt easy           trailing prose becomes the note
 */

export type ParsedSet = { weight: number; reps: number };

const MAX_SETS = 20;

/* -- numbers ------------------------------------------------------------- */

function normalizeSpec(spec: string): string {
  return spec
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\bat\b/g, "@")
    .replace(/\b(lbs|lb)\b/g, "")
    .replace(/\b(reps|rep)\b/g, "")
    .replace(/\b(sets|set)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NUM = "\\d+(?:\\.\\d+)?";

/** "bw", "bw+25", or a plain number. Returns null when it isn't a weight. */
function parseWeight(
  text: string,
): { weight: number; bodyweight: boolean } | null {
  const t = text.trim();
  const bw = t.match(new RegExp(`^bw\\s*(?:\\+\\s*(${NUM}))?$`));
  if (bw) return { weight: bw[1] ? Number(bw[1]) : 0, bodyweight: true };
  if (new RegExp(`^${NUM}$`).test(t)) return { weight: Number(t), bodyweight: false };
  return null;
}

function repList(text: string): number[] | null {
  const parts = text.split(/[,x]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 500)) return null;
  return nums;
}

type SpecResult = { sets: ParsedSet[]; problem: string | null };

export function parseSpec(spec: string): SpecResult {
  const s = normalizeSpec(spec);
  if (!s) return { sets: [], problem: null };

  // No \b before "kg": in "60kg" both neighbours are word characters.
  if (/kgs?\b/.test(s)) {
    return { sets: [], problem: "This app logs in lb — try the weight in pounds." };
  }

  // --- with an explicit weight: "<reps spec> @ <weight>" -----------------
  if (s.includes("@")) {
    const [left, right, ...rest] = s.split("@").map((p) => p.trim());
    if (rest.length) return { sets: [], problem: "Too many @ signs to read." };

    const w = parseWeight(right);
    if (!w) return { sets: [], problem: `Couldn't read "${right}" as a weight.` };

    // "3x10 @ 65" — sets × reps.
    const sxr = left.match(new RegExp(`^(\\d+)\\s*x\\s*(\\d+)$`));
    if (sxr) {
      const count = Number(sxr[1]);
      const reps = Number(sxr[2]);
      if (count < 1 || count > MAX_SETS) {
        return { sets: [], problem: `${count} sets is more than this can log.` };
      }
      return {
        sets: Array.from({ length: count }, () => ({ weight: w.weight, reps })),
        problem: null,
      };
    }

    // "10,10,8 @ 65" or "8 @ 65".
    const reps = repList(left);
    if (reps && reps.length <= MAX_SETS) {
      return {
        sets: reps.map((r) => ({ weight: w.weight, reps: r })),
        problem: null,
      };
    }
    return { sets: [], problem: `Couldn't read "${left}" as reps.` };
  }

  // --- one group per set: "70x7 70x7", "70x7, 65x5", "bw+25x8 bwx10" -----
  // The most natural way to write a session down, so it is tried early. Two
  // or more groups only: a lone "3x10" is sets x reps, handled further down.
  const groups = s.split(/[\s,]+/).filter(Boolean);
  if (groups.length >= 2) {
    const asSets = groups.map((g) => {
      const m = g.match(new RegExp(`^(bw(?:\\+${NUM})?|${NUM})x(\\d+)$`));
      if (!m) return null;
      const w = parseWeight(m[1]);
      const reps = Number(m[2]);
      if (!w || reps < 1 || reps > 500) return null;
      return { weight: w.weight, reps };
    });
    if (asSets.every(Boolean)) {
      if (asSets.length > MAX_SETS) {
        return { sets: [], problem: `${asSets.length} sets is more than this can log.` };
      }
      return { sets: asSets as ParsedSet[], problem: null };
    }
  }

  // --- bodyweight without an @: "bw x 12", "bw+25 x 8" -------------------
  const bwFirst = s.match(new RegExp(`^(bw(?:\\s*\\+\\s*${NUM})?)\\s*x\\s*(.+)$`));
  if (bwFirst) {
    const w = parseWeight(bwFirst[1]);
    const reps = repList(bwFirst[2]);
    if (w && reps && reps.length <= MAX_SETS) {
      return {
        sets: reps.map((r) => ({ weight: w.weight, reps: r })),
        problem: null,
      };
    }
    return { sets: [], problem: `Couldn't read "${bwFirst[2]}" as reps.` };
  }

  // --- "135 8,8,6" — weight, space, rep list -----------------------------
  const wThenReps = s.match(new RegExp(`^(${NUM})\\s+(\\d+(?:\\s*,\\s*\\d+)*)$`));
  if (wThenReps) {
    const weight = Number(wThenReps[1]);
    const reps = repList(wThenReps[2]);
    if (reps && reps.length <= MAX_SETS) {
      return { sets: reps.map((r) => ({ weight, reps: r })), problem: null };
    }
  }

  // --- x-chains: "65 x 10 x 10 x 8" or the ambiguous "3x10" --------------
  const chain = s.split("x").map((p) => p.trim()).filter(Boolean);
  if (chain.length >= 3 && chain.every((p) => new RegExp(`^${NUM}$`).test(p))) {
    // Three or more terms only reads one way: a weight, then a rep per set.
    const weight = Number(chain[0]);
    const reps = chain.slice(1).map(Number);
    if (reps.every((r) => Number.isInteger(r) && r >= 1)) {
      return { sets: reps.map((r) => ({ weight, reps: r })), problem: null };
    }
  }

  if (chain.length === 2 && chain.every((p) => new RegExp(`^${NUM}$`).test(p))) {
    const a = Number(chain[0]);
    const b = Number(chain[1]);
    // "3x10" is sets × reps; "135x8" is weight × reps. Nobody does 20 sets,
    // and nobody loads 3 lb — the magnitude is the only honest signal here.
    if (a <= MAX_SETS && Number.isInteger(a)) {
      return {
        sets: [],
        problem: `Read "${chain[0]}x${chain[1]}" as ${a} sets of ${b} — add a weight, like "${chain[0]}x${chain[1]} @ 65".`,
      };
    }
    if (Number.isInteger(b) && b >= 1) {
      return { sets: [{ weight: a, reps: b }], problem: null };
    }
  }

  return { sets: [], problem: `Couldn't read "${spec.trim()}" as sets.` };
}

/* -- exercise matching --------------------------------------------------- */

/**
 * Gym names vary more than exercise ids do — "Incline Dumbbell Press" and
 * "Incline DB Press" are the same lift. Folding both sides onto one spelling
 * before scoring is what lets the note be written naturally.
 */
const SYNONYM: Record<string, string> = {
  dumbbell: "db",
  dumbbells: "db",
  dumbell: "db",
  dumbells: "db",
  barbell: "bb",
  barbells: "bb",
  machines: "machine",
  cables: "cable",
  triceps: "tricep",
  tris: "tricep",
  tri: "tricep",
  biceps: "bicep",
  bis: "bicep",
  bi: "bicep",
  extensions: "extension",
  ext: "extension",
  presses: "press",
  raises: "raise",
  curls: "curl",
  rows: "row",
  pulldowns: "pulldown",
  pullups: "pull",
  pullup: "pull",
  chinup: "chin",
  chinups: "chin",
  flye: "fly",
  flyes: "fly",
  flys: "fly",
  flies: "fly",
  legs: "leg",
  calves: "calf",
  deadlifts: "deadlift",
  romanian: "rdl",
};

function tokens(s: string): string[] {
  return slugify(s)
    .split("-")
    .filter(Boolean)
    .map((t) => SYNONYM[t] ?? t);
}

/** 0 = no relation, 1 = certain. */
function score(query: string, ex: Exercise): number {
  const q = slugify(query);
  if (!q) return 0;
  if (q === ex.id) return 1;

  const qt = tokens(query);
  const et = tokens(ex.name);
  if (!qt.length || !et.length) return 0;

  const hits = qt.filter((t) =>
    et.some((e) => e === t || (t.length >= 3 && e.startsWith(t))),
  ).length;
  if (!hits) return 0;

  // Reward covering the query, and covering more of the target name.
  const coverage = hits / qt.length;
  const specificity = hits / et.length;
  return 0.55 * coverage + 0.45 * specificity;
}

export function matchExercise(
  name: string,
  routine: Exercise[],
  day: DayKey,
): { best: Exercise | null; candidates: Exercise[]; topScore: number } {
  if (!name.trim()) return { best: null, candidates: [], topScore: 0 };

  const ranked = routine
    // A small nudge toward today's split — same name on another day is rarer.
    .map((ex) => ({ ex, s: score(name, ex) + (ex.day === day ? 0.06 : 0) }))
    .filter((r) => r.s > 0.34)
    .sort((a, b) => b.s - a.s);

  if (!ranked.length) return { best: null, candidates: [], topScore: 0 };

  const [top, next] = ranked;
  // Commit only when the leader is clear; otherwise let the user pick.
  const decisive = top.s >= 0.75 && (!next || top.s - next.s >= 0.12);
  return {
    best: decisive ? top.ex : null,
    candidates: ranked.slice(0, 4).map((r) => r.ex),
    // Exposed so the note reader can set its own bar: a prose line like
    // "left shoulder tight" scores just high enough to be a candidate, and
    // must not be mistaken for the start of a new lift.
    topScore: top.s,
  };
}

