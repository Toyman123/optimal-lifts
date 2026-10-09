import type { Exercise } from './types'

export type ExtractedWorkout = {
  exercises: { name: string; sets: { weight: number; reps: number }[] }[]
  issues: string[]
}
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    row = next
  }
  return row[b.length]
}
export function matchExercise(name: string, exercises: Exercise[]) {
  const key = normalize(name)
  const scored = exercises.map(exercise => ({ exercise, score: Math.min(...[exercise.name, ...exercise.aliases].map(alias => {
    const value = normalize(alias)
    return distance(key, value) / Math.max(key.length, value.length, 1)
  })) })).sort((a, b) => a.score - b.score)
  if (!key || !scored.length || scored[0].score > .2 || (scored[1] && scored[1].score - scored[0].score < .08)) return undefined
  return scored[0].exercise
}
export function validateExtractedWorkout(value: unknown, exercises: Exercise[]) {
  const body = value as Partial<ExtractedWorkout> | null
  if (!body || !Array.isArray(body.exercises) || !Array.isArray(body.issues) || body.exercises.length > 100 || body.issues.some(i => typeof i !== 'string')) throw new Error('The extracted workout has an invalid format.')
  const issues = [...body.issues]
  const lines: string[] = []
  const seen = new Set<string>()
  let total = 0
  for (const item of body.exercises) {
    if (!item || typeof item.name !== 'string' || !Array.isArray(item.sets) || !item.sets.length) throw new Error('An extracted exercise is incomplete.')
    const exercise = matchExercise(item.name, exercises)
    if (!exercise) { issues.push(`Confirm the exercise name: ${item.name}`); continue }
    if (seen.has(exercise.id)) throw new Error('The extracted workout repeats an exercise. Combine its sets before reviewing.')
    seen.add(exercise.id)
    lines.push(exercise.name)
    for (const set of item.sets) {
      if (++total > 300 || !set || typeof set.weight !== 'number' || !Number.isFinite(set.weight) || set.weight < 0 || set.weight > 2000 || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 100) throw new Error('An extracted set has an invalid weight or rep count.')
      lines.push(`${exercise.bodyweight ? 'bw+' : ''}${set.weight}x${set.reps}`)
    }
    lines.push('')
  }
  return { note: lines.join('\n').trim(), issues }
}
