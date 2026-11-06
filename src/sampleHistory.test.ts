import { describe, expect, it } from 'vitest'
import { createSeedData } from './data'
import { createSampleHistory } from './sampleHistory'

describe('read-only sample history', () => {
  it('gives charts multiple recent sessions, one workout per day, without invented durations', () => {
    const routines = createSeedData().routines
    const before = JSON.stringify(routines)
    const history = createSampleHistory(routines, new Date('2026-11-05T12:00:00'))
    expect(history).toHaveLength(18)
    expect(new Set(history.map(session => session.date)).size).toBe(history.length)
    expect(history.every(session => session.date < '2026-11-05' && !('durationSeconds' in session))).toBe(true)
    for (const routine of routines) expect(history.filter(session => session.routineId === routine.id)).toHaveLength(6)
    expect(history.filter(session => session.routineId === 'pull').every(session => session.exercises.find(exercise => exercise.exerciseId === 'pull-up')?.sets.every(set => set.weight === 0 && set.bodyweight))).toBe(true)
    expect(JSON.stringify(routines)).toBe(before)
  })
  it('handles an empty or archived rotation without generating fake sessions', () => {
    expect(createSampleHistory([])).toEqual([])
    expect(createSampleHistory(createSeedData().routines.map(routine => ({ ...routine, archived: true })))).toEqual([])
  })
})
