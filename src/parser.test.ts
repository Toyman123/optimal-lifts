import { describe, expect, it } from 'vitest'
import { estimatedOneRepMax, parseWorkoutNote } from './parser'
import type { Exercise } from './types'

const exercises: Exercise[] = [
  { id: 'pull-up', name: 'Pull Up', aliases: ['pullup', 'pull ups', 'pu'], bodyweight: true },
  { id: 'cable-row', name: 'Cable Row', aliases: ['c row'], bodyweight: false },
]

const sets = (note: string) => parseWorkoutNote(note, exercises).exercises[0]?.sets.map(({ weight, reps }) => [weight, reps])

describe('workout parser', () => {
  it('reads one-line and multiline exercise entries', () => {
    const one = parseWorkoutNote('Pull Up 70x8 70x5', exercises)
    expect(one.exercises).toHaveLength(1)
    expect(sets('Pull Up 70x8 70x5')).toEqual([[70, 8], [70, 5]])
    const many = parseWorkoutNote('Pull Up 70x8 70x5\nCable Row: 130x10 130x8', exercises)
    expect(many.exercises).toHaveLength(2)
  })

  it.each([
    ['Pull Up x8 x5', [[0, 8], [0, 5]]],
    ['Pull Up 0x8 0x5', [[0, 8], [0, 5]]],
    ['Pull Up bodyweight x8 x5', [[0, 8], [0, 5]]],
    ['Pull Up bwx8 bwx5', [[0, 8], [0, 5]]],
    ['Pull Up bw+25x8 bw+25x6', [[25, 8], [25, 6]]],
    ['Pull Up 15x8 x6', [[15, 8], [15, 6]]],
    ['Pull Up bw+5x8', [[5, 8]]],
    ['Cable Row 65 x 10 x 10 x 8', [[65, 10], [65, 10], [65, 8]]],
    ['Cable Row 135 8,8,6', [[135, 8], [135, 8], [135, 6]]],
    ['Cable Row 3x10 @ 65', [[65, 10], [65, 10], [65, 10]]],
  ])('parses %s', (note, expected) => expect(sets(note)).toEqual(expected))

  it('resets explicit bodyweight and never carries load between exercises', () => {
    const result = parseWorkoutNote('Pull Up 15x8 bodyweight x6\nCable Row x10', exercises)
    expect(result.exercises[0].sets.map(s => s.weight)).toEqual([15, 0])
    expect(result.exercises[1].sets[0].weight).toBe(0)
  })

  it('does not turn a load alone into a completed set', () => {
    const result = parseWorkoutNote('Cable Row 135', exercises)
    expect(result.exercises).toHaveLength(0)
    expect(result.issues[0].kind).toBe('incomplete')
  })

  it('keeps valid sets but flags an unfinished trailing set', () => {
    const result = parseWorkoutNote('Cable Row 110x12 120x', exercises)
    expect(result.exercises[0].sets.map(set => [set.weight, set.reps])).toEqual([[110, 12]])
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'incomplete' })]))
  })

  it('calculates Epley estimated 1RM', () => expect(estimatedOneRepMax(100, 10)).toBe(133.3))
})
