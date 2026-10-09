import { describe, expect, it } from 'vitest'
import { advanceSetHighWater, remainingRestSeconds } from './timer'

describe('rest timer', () => {
  it('stays aligned to wall-clock time after background callback throttling', () => {
    const startedAt = 1_000_000
    const endAt = startedAt + 120_000

    expect(remainingRestSeconds(endAt, startedAt)).toBe(120)
    expect(remainingRestSeconds(endAt, startedAt + 37_400)).toBe(83)
    expect(remainingRestSeconds(endAt, startedAt + 120_000)).toBe(0)
    expect(remainingRestSeconds(endAt, startedAt + 180_000)).toBe(0)
  })

  it('starts rest only for a set beyond the workout high-water mark', () => {
    const initial = { bench: 3 }
    const afterDelete = advanceSetHighWater({ bench: 2 }, initial)
    const afterRetype = advanceSetHighWater({ bench: 3 }, afterDelete.next)
    const afterNewSet = advanceSetHighWater({ bench: 4 }, afterRetype.next)

    expect(afterDelete.addedExerciseIds).toEqual([])
    expect(afterRetype.addedExerciseIds).toEqual([])
    expect(afterNewSet.addedExerciseIds).toEqual(['bench'])
  })
})
