import { createSeedData, createStartingPointSessions } from './data'
import type { AppData } from './types'

const KEY = 'optimal-lifts:data'
const UPDATED_KEY = 'optimal-lifts:updated-at'
const CLOUD_OWNER_KEY = 'optimal-lifts:cloud-owner'

export function normalizeData(input: unknown): AppData | null {
  try {
    const value = input as Partial<AppData> & { schemaVersion?: number }
    if (Array.isArray(value.routines) && Array.isArray(value.sessions)) {
      const seed = createSeedData()
      const retiredStarterExercises: Record<string, string[]> = { pull: ['cable-row', 'curl'] }
      const merged = seed.routines.map((starter) => {
        const existing = value.routines!.find((routine) => routine.id === starter.id || routine.name.toLowerCase() === starter.name.toLowerCase())
        if (!existing) return starter
        const exercises = existing.exercises.map(exercise => retiredStarterExercises[starter.id]?.includes(exercise.id) ? { ...exercise, archived: true } : exercise)
        starter.exercises.forEach((exercise) => { if (!exercises.some((item) => item.id === exercise.id)) exercises.push(exercise) })
        const variations = starter.variations.map((variation) => {
          const prior = existing.variations.find(item => item.id === variation.id || item.name.toLowerCase() === variation.name.toLowerCase())
          return prior ? { ...prior, id: variation.id, name: variation.name, exerciseIds: variation.exerciseIds } : variation
        })
        existing.variations.forEach((variation) => {
          if (!variations.some(item => item.id === variation.id || item.name.toLowerCase() === variation.name.toLowerCase())) variations.push(variation)
        })
        return { ...existing, id: starter.id, exercises, variations }
      })
      value.routines.forEach((routine) => { if (!merged.some((item) => item.id === routine.id || item.name.toLowerCase() === routine.name.toLowerCase())) merged.push(routine) })
      const sessions = value.sessions.filter(session => !session.id.startsWith('two-week-sample-'))
      if (value.startingDataVersion !== 1) {
        createStartingPointSessions().forEach(session => { if (!sessions.some(existing => existing.id === session.id)) sessions.push(session) })
      }
      return { schemaVersion: 3, sampleDataVersion: 1, startingDataVersion: 1, routines: merged, sessions, draft: value.draft, drafts: value.drafts, restSeconds: value.restSeconds, nextRoutineId: value.nextRoutineId ?? seed.nextRoutineId }
    }
  } catch { /* preserve a usable app when storage is malformed */ }
  return null
}

export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(KEY)
    if (!stored) {
      const seed = createSeedData()
      return { ...seed, sessions: createStartingPointSessions() }
    }
    return normalizeData(JSON.parse(stored)) ?? createSeedData()
  } catch { return createSeedData() }
}

export function saveData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data))
  localStorage.setItem(UPDATED_KEY, new Date().toISOString())
}

export const getLocalDataUpdatedAt = () => localStorage.getItem(UPDATED_KEY)
export const getCloudOwnerId = () => localStorage.getItem(CLOUD_OWNER_KEY)
export const setCloudOwnerId = (userId: string) => localStorage.setItem(CLOUD_OWNER_KEY, userId)

export function clearData() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(UPDATED_KEY)
}
