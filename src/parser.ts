import type { Exercise, ParsedExercise, ParseIssue, ParseResult, SetEntry } from './types'

const uid = () => Math.random().toString(36).slice(2, 10)
const normal = (value: string) => value.toLowerCase().replace(/[^a-z0-9+]/g, '')

function findExercise(line: string, exercises: Exercise[]) {
  const lowered = line.toLowerCase().trim()
  return [...exercises]
    .sort((a, b) => b.name.length - a.name.length)
    .find((exercise) => [exercise.name, ...exercise.aliases].some((name) => {
      const candidate = name.toLowerCase()
      return lowered === candidate || lowered.startsWith(`${candidate}:`) || lowered.startsWith(`${candidate} `)
        || normal(lowered).startsWith(normal(candidate))
    }))
}

function parseSets(value: string, bodyweight: boolean): { sets: SetEntry[]; consumed: string } {
  const sets: SetEntry[] = []
  let source = value
  const repeated = source.match(/\b(\d+)\s*x\s*(\d+)\s*@\s*(\d+(?:\.\d+)?)/i)
  if (repeated) {
    const count = Number(repeated[1]); const reps = Number(repeated[2]); const weight = Number(repeated[3])
    for (let i = 0; i < count; i++) sets.push({ id: uid(), weight, reps, bodyweight })
    return { sets, consumed: repeated[0] }
  }
  const compact = source.match(/\b(\d+(?:\.\d+)?)\s+((?:\d+\s*,\s*)+\d+)\b/)
  if (compact) {
    const weight = Number(compact[1])
    compact[2].split(',').forEach((rep) => sets.push({ id: uid(), weight, reps: Number(rep.trim()), bodyweight }))
    return { sets, consumed: compact[0] }
  }

  let carried: number | undefined
  const pattern = /(bw\s*\+\s*(\d+(?:\.\d+)?)\s*x\s*(\d+))|(bodyweight\s*x\s*(\d+))|(bw\s*x\s*(\d+))|((\d+(?:\.\d+)?)\s*x\s*(\d+))|((?<![a-z0-9])x\s*(\d+))/gi
  const consumed: string[] = []
  for (const match of source.matchAll(pattern)) {
    let weight: number; let reps: number
    if (match[1]) { weight = Number(match[2]); reps = Number(match[3]); carried = weight }
    else if (match[4]) { weight = 0; reps = Number(match[5]); carried = 0 }
    else if (match[6]) { weight = 0; reps = Number(match[7]); carried = 0 }
    else if (match[8]) { weight = Number(match[9]); reps = Number(match[10]); carried = weight }
    else { weight = carried ?? 0; reps = Number(match[12]) }
    if (Number.isFinite(reps) && reps > 0 && reps <= 100 && weight >= 0 && weight <= 2000) {
      sets.push({ id: uid(), weight, reps, bodyweight, effort: sets.length === 0 ? '1 RIR' : sets.length === 1 ? 'Failure' : undefined })
      consumed.push(match[0])
    }
  }
  return { sets, consumed: consumed.join(' ') }
}

export function parseWorkoutNote(note: string, exercises: Exercise[]): ParseResult {
  const parsed = new Map<string, ParsedExercise>()
  const issues: ParseIssue[] = []
  const sessionComments: string[] = []
  let current: Exercise | undefined
  note.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (!line) return
    const recognized = findExercise(line, exercises)
    if (recognized) current = recognized
    if (!current) {
      if (/\d/.test(line)) issues.push({ line: index + 1, text: line, kind: 'unrecognized', message: 'Name the exercise for these numbers.' })
      else sessionComments.push(line)
      return
    }
    const aliases = [current.name, ...current.aliases].sort((a, b) => b.length - a.length)
    let values = line
    if (recognized) {
      const alias = aliases.find((name) => normal(line).startsWith(normal(name)))
      if (alias) values = line.slice(alias.length).replace(/^\s*:\s*/, '')
    }
    const result = parseSets(values, current.bodyweight)
    if (current.bodyweight && result.sets.some(set => set.weight > 0 && set.weight <= 10) && !/bw\s*\+/i.test(values)) {
      issues.push({ line: index + 1, text: line, kind: 'ambiguous', message: 'For added loads of 10 lb or less, write bw+ before the weight.' })
      result.sets = result.sets.filter(set => set.weight === 0 || set.weight > 10)
    }
    const incompleteSet = /(?:\bbw\s*\+\s*)?\b\d+(?:\.\d+)?\s*x\s*(?:$|[^\d\s])|\b\d+(?:\.\d+)?\s*x\s*$/i.test(values)
    if (incompleteSet) issues.push({ line: index + 1, text: line, kind: 'incomplete', message: 'Finish the set by adding reps after ×.' })
    const comment = values
      .replace(/\b\d+\s*x\s*\d+\s*@\s*\d+(?:\.\d+)?/gi, '')
      .replace(/\b\d+(?:\.\d+)?\s+(?:\d+\s*,\s*)+\d+\b/g, '')
      .replace(/bw\s*\+\s*\d+(?:\.\d+)?\s*x\s*\d+|bodyweight\s*x\s*\d+|bw\s*x\s*\d+|\d+(?:\.\d+)?\s*x\s*\d+|(?<![a-z0-9])x\s*\d+/gi, '')
      .replace(/^\s*[-–—,:]\s*/, '').replace(/\s{2,}/g, ' ').trim()
    if (result.sets.length) {
      const existing = parsed.get(current.id)
      if (existing) {
        existing.sets.push(...result.sets); existing.sourceLines.push(index + 1)
        if (comment) existing.comment = [existing.comment, comment].filter(Boolean).join(' · ')
      } else parsed.set(current.id, { exercise: current, sets: result.sets, comment: comment || undefined, sourceLines: [index + 1] })
    } else if (recognized && values) {
      if (/\d/.test(values)) issues.push({ line: index + 1, text: line, kind: 'incomplete', message: 'A completed set needs both weight and reps.' })
      else parsed.set(current.id, { exercise: current, sets: [], comment: values || undefined, sourceLines: [index + 1] })
    } else if (!recognized && /\d/.test(line)) {
      issues.push({ line: index + 1, text: line, kind: 'ambiguous', message: 'Could not confidently read these sets.' })
    } else if (!recognized) {
      const existing = parsed.get(current.id)
      if (existing) existing.comment = [existing.comment, line].filter(Boolean).join(' · ')
    }
  })
  return { exercises: [...parsed.values()].filter((item) => item.sets.length > 0), issues, sessionComment: sessionComments.join(' · ') || undefined }
}

export const estimatedOneRepMax = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30) * 10) / 10
