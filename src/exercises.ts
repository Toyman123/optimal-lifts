import type { AppData, Draft } from './types'

const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const renameInDraft = (draft: Draft | undefined, oldNames: string[], name: string) => {
  if (!draft) return draft
  const note = draft.note.split(/\r?\n/).map(line => {
    for (const oldName of oldNames) {
      const pattern = new RegExp(`^(\\s*)${escapePattern(oldName)}(?=\\s|:|$)`, 'i')
      if (pattern.test(line)) return line.replace(pattern, `$1${name}`)
    }
    return line
  }).join('\n')
  return note === draft.note ? draft : { ...draft, note, updatedAt: new Date().toISOString() }
}

export function renameExerciseForFutureWorkouts(data: AppData, exerciseId: string, name: string): AppData {
  const oldNames = [...new Set(data.routines.flatMap(routine => routine.exercises.filter(exercise => exercise.id === exerciseId).map(exercise => exercise.name)))]
  if (!oldNames.length || oldNames.every(oldName => oldName === name)) return data
  return {
    ...data,
    routines: data.routines.map(routine => ({
      ...routine,
      exercises: routine.exercises.map(exercise => exercise.id === exerciseId ? { ...exercise, name } : exercise),
    })),
    draft: renameInDraft(data.draft, oldNames, name),
    drafts: data.drafts?.map(draft => renameInDraft(draft, oldNames, name)!),
  }
}
