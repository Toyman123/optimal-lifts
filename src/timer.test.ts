import { describe, expect, it } from 'vitest'
import { newlyLoggedExerciseIds, remainingRestSeconds } from './timer'

describe('rest timer', () => {
  it('stays aligned to wall-clock time after background callback throttling', () => {
    const startedAt = 1_000_000
    const endAt = startedAt + 120_000

    expect(remainingRestSeconds(endAt, startedAt)).toBe(120)
    expect(remainingRestSeconds(endAt, startedAt + 37_400)).toBe(83)
    expect(remainingRestSeconds(endAt, startedAt + 120_000)).toBe(0)
    expect(remainingRestSeconds(endAt, startedAt + 180_000)).toBe(0)
  })

  it('starts rest for every logged set, including a re-entered one', () => {
    expect(newlyLoggedExerciseIds({ bench: 1 }, {})).toEqual(['bench'])
    expect(newlyLoggedExerciseIds({ bench: 2 }, { bench: 3 })).toEqual([])
    expect(newlyLoggedExerciseIds({ bench: 3 }, { bench: 2 })).toEqual(['bench'])
    expect(newlyLoggedExerciseIds({ bench: 3, row: 1 }, { bench: 3 })).toEqual(['row'])
  })
})
