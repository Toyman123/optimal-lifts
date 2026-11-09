import { describe, expect, it } from 'vitest'
import { createHistorySessions, createSeedData, createStartingPointSessions } from './data'
import { normalizeData } from './storage'

const latest = (routineId: string) => createHistorySessions().filter(session => session.routineId === routineId).at(-1)!
const topSet = (routineId: string, exerciseId: string) => latest(routineId).exercises.find(exercise => exercise.exerciseId === exerciseId)!.sets[0]

describe('training history', () => {
  it('runs from late September to early November and ends at the current lifts', () => {
    const sessions = createHistorySessions()
    expect(sessions[0].date >= '2026-09-20').toBe(true)
    expect(sessions.at(-1)!.date <= '2026-11-08').toBe(true)
    expect(topSet('push', 'incline-chest-press')).toMatchObject({ weight: 80, reps: 6 })
    expect(topSet('push', 'pec-deck')).toMatchObject({ weight: 140 })
    expect(topSet('pull', 'lat-pulldown')).toMatchObject({ weight: 140, reps: 9 })
    expect(topSet('pull', 'seated-row')).toMatchObject({ weight: 130, reps: 7 })
    expect(latest('legs').exercises.map(exercise => exercise.exerciseId)).toEqual(['leg-press'])
    expect(topSet('legs', 'leg-press')).toMatchObject({ weight: 225 })
  })

  const v1Document = (extraSessions = createStartingPointSessions()) => ({ ...createSeedData(), startingDataVersion: 1, sessions: extraSessions })

  it('adds the history to accounts that kept the starting sessions', () => {
    const data = normalizeData(v1Document())!
    expect(data.startingDataVersion).toBe(2)
    expect(data.sessions.length).toBe(createStartingPointSessions().length + createHistorySessions().length)
  })

  it('leaves accounts without the starting sessions alone and never doubles a logged day', () => {
    expect(normalizeData(v1Document([]))!.sessions).toHaveLength(0)
    const first = createHistorySessions()[0]
    const own = { ...first, id: 'my-own-session', exercises: [] }
    const data = normalizeData(v1Document([...createStartingPointSessions(), own]))!
    expect(data.sessions.filter(session => session.date === first.date && session.routineId === first.routineId)).toHaveLength(1)
    expect(data.sessions.some(session => session.id === 'my-own-session')).toBe(true)
  })

  it('does not add history twice', () => {
    const once = normalizeData(v1Document())!
    expect(normalizeData(once)!.sessions).toHaveLength(once.sessions.length)
  })
})
