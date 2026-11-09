import { describe, expect, it } from 'vitest'
import { repAdjustedSetScore, sessionMetric } from './progress'

describe('rep-adjusted weight score', () => {
  it('ranks 225x4 above 235x1 without calling it a one-rep max', () => {
    expect(repAdjustedSetScore(225, 4)).toBeCloseTo(241.875)
    expect(repAdjustedSetScore(235, 1)).toBe(235)
    expect(repAdjustedSetScore(225, 4)).toBeGreaterThan(repAdjustedSetScore(235, 1))
  })

  it('averages every completed set for the session score', () => {
    const sets = [
      { id: 'a', weight: 225, reps: 4, bodyweight: false },
      { id: 'b', weight: 225, reps: 3, bodyweight: false },
    ]
    expect(sessionMetric(sets, 'performance')).toBeCloseTo((241.875 + 236.25) / 2)
    expect(sessionMetric(sets, 'weight')).toBe(225)
    expect(sessionMetric(sets, 'reps')).toBe(4)
    expect(sessionMetric(sets, 'volume')).toBe(1575)
  })
})
