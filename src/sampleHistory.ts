import { createStartingPointSessions } from './data'
import type { Routine, Session } from './types'

// Read-only examples for chart previews. Never merge these into saved account history.
export function createSampleHistory(routines: Routine[], now = new Date()): Session[] {
  const active = routines.filter(routine => !routine.archived)
  const baseline = createStartingPointSessions()
  const count = active.length * 6
  return Array.from({ length: count }, (_, index) => {
    const routine = active[index % active.length]
    const round = Math.floor(index / active.length)
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
    day.setDate(day.getDate() - ((count - index - 1) * 2 + 1))
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    const id = `preview-${routine.id}-${round}`
    const variation = routine.variations.find(item => !item.archived)
    const order = variation?.exerciseIds ?? routine.exercises.filter(item => !item.archived).map(item => item.id)
    const exercises = order.flatMap((exerciseId, position) => {
      const exercise = routine.exercises.find(item => item.id === exerciseId && !item.archived)
      if (!exercise) return []
      const original = baseline.find(item => item.routineId === routine.id)?.exercises.find(item => item.exerciseId === exerciseId)?.sets[0]
      const weight = exercise.bodyweight ? 0 : (original?.weight ?? 40) + Math.floor(round / 2) * 5
      const reps = exercise.bodyweight ? 7 + round : 7 + round % 2
      return [{ exerciseId, exerciseName: exercise.name, position: position + 1, sets: [0, 1].map(set => ({ id: `${id}-${exerciseId}-${set}`, weight, reps: reps - set, bodyweight: exercise.bodyweight })) }]
    })
    return { id, date, savedAt: `${date}T18:00:00Z`, routineId: routine.id, routineName: routine.name, variationId: variation?.id, variationName: variation?.name, orderKind: variation ? 'variation' : 'one-off', actualExerciseOrder: exercises.map(item => item.exerciseId), exercises, comment: 'Sample session', rawNote: exercises.map(exercise => `${exercise.exerciseName}\n${exercise.sets.map(set => `${set.bodyweight ? 'bw+' : ''}${set.weight}x${set.reps}`).join(' ')}`).join('\n\n') }
  })
}
