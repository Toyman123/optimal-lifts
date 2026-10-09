import type { SetEntry } from './types'

export type ChartMetric = 'performance' | 'weight' | 'reps' | 'volume'

export function repAdjustedSetScore(weight: number, reps: number) {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight < 0 || reps < 1) return 0
  return weight * (1 + 0.025 * (reps - 1))
}

export function sessionMetric(sets: SetEntry[], metric: ChartMetric) {
  if (!sets.length) return 0
  if (metric === 'weight') return Math.max(...sets.map(set => set.weight))
  if (metric === 'reps') return Math.max(...sets.map(set => set.reps))
  if (metric === 'volume') return sets.reduce((total, set) => total + set.weight * set.reps, 0)
  return sets.reduce((total, set) => total + repAdjustedSetScore(set.weight, set.reps), 0) / sets.length
}
