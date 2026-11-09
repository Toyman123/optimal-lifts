import { describe, expect, it } from 'vitest'
import { createSeedData } from './data'
import { normalizeData } from './storage'
import { parseWorkoutNote } from './parser'
import { reorderWorkoutNote } from './workout-note'

describe('saved routines and exercise order', () => {
  it('keeps custom names, order, archived exercises and removed routines after reload', () => {
    const data = createSeedData()
    data.routines = [data.routines[2], data.routines[0]]
    data.routines[0].name = 'Lower body'
    data.routines[0].variations[0].exerciseIds.reverse()
    data.routines[0].exercises[0].archived = true
    expect(normalizeData(JSON.parse(JSON.stringify(data)))?.routines).toEqual(data.routines)
  })
  it('reorders entered sets without losing weights or comments', () => {
    const exercises = createSeedData().routines[0].exercises
    const note = 'Incline Chest Press 70x8 70x6\nPec Deck 90x10\nfelt strong'
    const result = parseWorkoutNote(reorderWorkoutNote(note, exercises, ['pec-deck', 'incline-chest-press']), exercises)
    expect(result.issues).toEqual([])
    expect(result.exercises.map(e => e.exercise.id)).toEqual(['pec-deck', 'incline-chest-press'])
    expect(result.exercises[1].sets.map(s => [s.weight, s.reps])).toEqual([[70, 8], [70, 6]])
    expect(result.exercises[0].comment).toContain('felt strong')
  })
  it('keeps unresolved notes intact when the order changes', () => {
    const note = 'Incline Chest Press 70x'
    expect(reorderWorkoutNote(note, createSeedData().routines[0].exercises, ['pec-deck'])).toBe(note)
  })
})
