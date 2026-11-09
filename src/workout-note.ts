import { parseWorkoutNote } from './parser'
import type { Exercise } from './types'

export function reorderWorkoutNote(note: string, exercises: Exercise[], order: string[]) {
  const parsed = parseWorkoutNote(note, exercises)
  // Never rewrite a note with unresolved text: keep it available for correction.
  if (parsed.issues.length) return note
  const ids = [...order, ...parsed.exercises.map(e => e.exercise.id).filter(id => !order.includes(id))]
  const blocks = ids.map(id => {
    const exercise = exercises.find(e => e.id === id)
    if (!exercise) return ''
    const entry = parsed.exercises.find(e => e.exercise.id === id)
    return [exercise.name, ...(entry?.sets.map(set => `${set.bodyweight && !set.weight ? 'BW' : set.weight}x${set.reps}`) ?? []), entry?.comment].filter(Boolean).join('\n')
  })
  return [...blocks, parsed.sessionComment].filter(Boolean).join('\n\n')
}
