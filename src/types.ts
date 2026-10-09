export type SetEntry = {
  id: string
  weight: number
  reps: number
  bodyweight: boolean
  effort?: '1 RIR' | 'Failure'
}

export type Exercise = {
  id: string
  name: string
  aliases: string[]
  bodyweight: boolean
  archived?: boolean
}

export type Variation = {
  id: string
  name: string
  exerciseIds: string[]
  archived?: boolean
}

export type Routine = {
  id: string
  name: string
  exercises: Exercise[]
  variations: Variation[]
  archived?: boolean
}

export type SessionExercise = {
  exerciseId: string
  exerciseName: string
  position: number
  sets: SetEntry[]
  comment?: string
}

export type Session = {
  id: string
  date: string
  savedAt: string
  routineId: string
  routineName: string
  variationId?: string
  variationName?: string
  orderKind: 'variation' | 'one-off' | 'unknown'
  actualExerciseOrder: string[]
  exercises: SessionExercise[]
  comment?: string
  rawNote: string
}

export type Draft = {
  routineId: string
  variationId?: string
  date: string
  note: string
  order: string[]
  editingSessionId?: string
  updatedAt: string
}

export type AppData = {
  schemaVersion: 3
  sampleDataVersion?: 1
  startingDataVersion?: 1
  routines: Routine[]
  sessions: Session[]
  draft?: Draft
  drafts?: Draft[]
  restSeconds?: Record<string, number>
  nextRoutineId?: string
}

export type ParsedExercise = {
  exercise: Exercise
  sets: SetEntry[]
  comment?: string
  sourceLines: number[]
}

export type ParseIssue = {
  line: number
  text: string
  message: string
  kind: 'incomplete' | 'ambiguous' | 'unrecognized'
}

export type ParseResult = {
  exercises: ParsedExercise[]
  issues: ParseIssue[]
  sessionComment?: string
}
