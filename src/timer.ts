export function remainingRestSeconds(endAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((endAt - now) / 1000))
}

/** Exercises whose logged set count went up since the last check (a new or re-entered set). */
export function newlyLoggedExerciseIds(current: Record<string, number>, previous: Record<string, number>) {
  return Object.keys(current).filter(id => current[id] > (previous[id] ?? 0))
}
