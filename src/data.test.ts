import { describe, expect, it } from 'vitest'
import { createSeedData, createStartingPointSessions } from './data'
import { normalizeData } from './storage'

describe('starting workout history', () => {
  it('uses the supplied weights without turning incomplete entries into sets', () => {
    const sessions = createStartingPointSessions()
    expect(sessions).toHaveLength(4)
    expect(sessions.some(session => session.id.startsWith('two-week-sample-'))).toBe(false)

    const push = sessions.find(session => session.routineId === 'push')!
    expect(push.exercises.find(exercise => exercise.exerciseId === 'pec-deck')?.sets).toHaveLength(1)
    expect(push.exercises.find(exercise => exercise.exerciseId === 'tricep-pushdown')?.sets.map(set => [set.weight, set.reps])).toEqual([[100, 10], [100, 6]])

    const pull = sessions.find(session => session.routineId === 'pull')!
    expect(pull.exercises.find(exercise => exercise.exerciseId === 'pull-up')?.sets.map(set => [set.weight, set.reps, set.bodyweight])).toEqual([[0, 10, true], [0, 8, true]])
    expect(pull.exercises.find(exercise => exercise.exerciseId === 'wide-row')?.sets[0]).toMatchObject({ weight: 90, reps: 9 })

    const pressFirst = sessions.find(session => session.id.endsWith('legs-press'))!
    expect(pressFirst.exercises.some(exercise => exercise.exerciseId === 'calf-raise')).toBe(false)
    expect(pressFirst.exercises.find(exercise => exercise.exerciseId === 'leg-extension')?.sets).toHaveLength(1)

    const extensionFirst = sessions.find(session => session.id.endsWith('legs-extensions'))!
    expect(extensionFirst.exercises.find(exercise => exercise.exerciseId === 'leg-press')?.sets.map(set => [set.weight, set.reps])).toEqual([[225, 12], [225, 8]])
  })
})

describe('stored workout preferences', () => {
  it('preserves parked drafts and custom rest times during data migration', () => {
    const seed = createSeedData()
    const parked = { routineId: 'pull', variationId: 'pull-ups-first', date: '2026-09-19', note: 'Pull Up x8', order: ['pull-up'], updatedAt: '2026-09-19T12:00:00.000Z' }
    const realSession = { ...createStartingPointSessions()[0], id: 'my-real-session' }
    const fillerSession = { ...createStartingPointSessions()[0], id: 'two-week-sample-old' }
    const normalized = normalizeData({ ...seed, startingDataVersion: undefined, sessions: [realSession, fillerSession], drafts: [parked], restSeconds: { 'pull-up': 195 } })

    expect(normalized?.drafts).toEqual([parked])
    expect(normalized?.restSeconds?.['pull-up']).toBe(195)
    expect(normalized?.sessions.some(session => session.id === 'my-real-session')).toBe(true)
    expect(normalized?.sessions.some(session => session.id.startsWith('two-week-sample-'))).toBe(false)
    expect(normalized?.sessions.filter(session => session.id.startsWith('starting-'))).toHaveLength(4)
  })
})
