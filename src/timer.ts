export function remainingRestSeconds(endAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((endAt - now) / 1000))
}

export function advanceSetHighWater(current: Record<string, number>, highWater: Record<string, number>) {
  const addedExerciseIds = Object.keys(current).filter(id => current[id] > (highWater[id] ?? 0))
  const next = { ...highWater }
  for (const [id, count] of Object.entries(current)) next[id] = Math.max(next[id] ?? 0, count)
  return { addedExerciseIds, next }
}

/** Exercises whose logged set count went up since the last check (a new or re-entered set). */
export function newlyLoggedExerciseIds(current: Record<string, number>, previous: Record<string, number>) {
  return Object.keys(current).filter(id => current[id] > (previous[id] ?? 0))
}
