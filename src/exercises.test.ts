import { describe, expect, it } from 'vitest'
import { createSeedData } from './data'
import { renameExerciseForFutureWorkouts } from './exercises'

describe('renameExerciseForFutureWorkouts', () => {
  it('updates workout templates and unfinished drafts without rewriting history', () => {
    const data = createSeedData()
    data.draft = {
      routineId: 'pull',
      date: '2026-09-22',
      note: 'Seated Row 130x10\nWide Row',
      order: ['seated-row', 'wide-row'],
      updatedAt: '2026-09-22T12:00:00.000Z',
    }
    data.sessions = [{
      id: 'old', date: '2026-09-20', savedAt: '2026-09-20T12:00:00.000Z', routineId: 'pull', routineName: 'Pull',
      orderKind: 'unknown', actualExerciseOrder: ['seated-row'], rawNote: 'Seated Row 120x10',
      exercises: [{ exerciseId: 'seated-row', exerciseName: 'Seated Row', position: 1, sets: [{ id: 'set', weight: 120, reps: 10, bodyweight: false }] }],
    }]

    const renamed = renameExerciseForFutureWorkouts(data, 'seated-row', 'Chest-Supported Row')

    expect(renamed.routines.find(routine => routine.id === 'pull')?.exercises.find(exercise => exercise.id === 'seated-row')?.name).toBe('Chest-Supported Row')
    expect(renamed.draft?.note).toBe('Chest-Supported Row 130x10\nWide Row')
    expect(renamed.sessions[0].exercises[0].exerciseName).toBe('Seated Row')
  })
})
