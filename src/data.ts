import type { AppData, Session, SessionExercise } from './types'

export const createSeedData = (): AppData => ({
  schemaVersion: 3,
  sampleDataVersion: 1,
  startingDataVersion: 2,
  routines: [
    {
      id: 'push',
      name: 'Push',
      exercises: [
        { id: 'incline-chest-press', name: 'Incline Chest Press', aliases: ['incline press', 'inclint chest press'], bodyweight: false },
        { id: 'converging-chest-press', name: 'Converging Chest Press', aliases: ['converging press'], bodyweight: false },
        { id: 'pec-deck', name: 'Pec Deck', aliases: ['pecdeck'], bodyweight: false },
        { id: 'shoulder-press', name: 'Shoulder Press', aliases: ['ohp'], bodyweight: false },
        { id: 'lateral-raise', name: 'Lateral Raise', aliases: ['lateral raises', 'lat raise'], bodyweight: false },
        { id: 'tricep-pushdown', name: 'Tricep Pushdown', aliases: ['triceps pushdown', 'pushdown'], bodyweight: false },
        { id: 'overhead-extension', name: 'Overhead Extension', aliases: ['overhead tricep extension'], bodyweight: false },
      ],
      variations: [
        { id: 'push-standard', name: 'Standard order', exerciseIds: ['incline-chest-press', 'converging-chest-press', 'pec-deck', 'shoulder-press', 'lateral-raise', 'tricep-pushdown', 'overhead-extension'] },
      ],
    },
    {
      id: 'pull',
      name: 'Pull',
      exercises: [
        { id: 'pull-up', name: 'Pull Up', aliases: ['pullup', 'pull ups', 'pu'], bodyweight: true },
        { id: 'seated-row', name: 'Seated Row', aliases: ['seated cable row', 'cable row', 'cable rows', 'c row'], bodyweight: false },
        { id: 'wide-row', name: 'Wide Row', aliases: ['wide grip row', 'wide cable row'], bodyweight: false },
        { id: 'dumbbell-row', name: 'Dumbbell Row', aliases: ['db row'], bodyweight: false },
        { id: 'lat-pulldown', name: 'Lat Pulldown', aliases: ['lat pull', 'lat pull down', 'pulldown'], bodyweight: false },
        { id: 'rear-delt', name: 'Rear Delt', aliases: ['rear delts', 'rear delt fly'], bodyweight: false },
        { id: 'straight-bar-curl', name: 'Straight Bar Curl', aliases: ['bar curl'], bodyweight: false },
        { id: 'bayesian-curl', name: 'Bayesian Curl', aliases: ['bayesian curls', 'baysian curl'], bodyweight: false },
      ],
      variations: [
        { id: 'pull-ups-first', name: 'Pull-ups first', exerciseIds: ['pull-up', 'lat-pulldown', 'seated-row', 'wide-row', 'dumbbell-row', 'rear-delt', 'straight-bar-curl', 'bayesian-curl'] },
        { id: 'rows-first', name: 'Seated row first', exerciseIds: ['seated-row', 'pull-up', 'lat-pulldown', 'wide-row', 'dumbbell-row', 'rear-delt', 'straight-bar-curl', 'bayesian-curl'] },
      ],
    },
    {
      id: 'legs',
      name: 'Legs',
      exercises: [
        { id: 'leg-press', name: 'Leg Press', aliases: ['press'], bodyweight: false },
        { id: 'rdl', name: 'Romanian Deadlift', aliases: ['rdl', 'romanian deadlifts'], bodyweight: false },
        { id: 'leg-extension', name: 'Leg Extension', aliases: ['leg ext', 'extensions'], bodyweight: false },
        { id: 'leg-curl', name: 'Seated Leg Curl', aliases: ['leg curl', 'ham curl'], bodyweight: false },
        { id: 'crunch', name: 'Crunch', aliases: ['crunches'], bodyweight: false },
        { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', aliases: ['hanging leg raises', 'hlr'], bodyweight: true },
        { id: 'calf-raise', name: 'Calf Raise', aliases: ['calves', 'calf raises'], bodyweight: false },
      ],
      variations: [
        { id: 'press-first', name: 'Leg press first', exerciseIds: ['leg-press', 'rdl', 'leg-extension', 'leg-curl', 'crunch', 'hanging-leg-raise', 'calf-raise'] },
        { id: 'extensions-first', name: 'Leg extension first', exerciseIds: ['leg-extension', 'rdl', 'leg-press', 'leg-curl', 'crunch', 'hanging-leg-raise', 'calf-raise'] },
      ],
    },
  ],
  sessions: [],
  nextRoutineId: 'push',
})

type StartingExercise = [id: string, name: string, sets: Array<[weight: number, reps: number, bodyweight?: boolean]>, comment?: string]

const sessionExercise = (sessionId: string, position: number, [exerciseId, exerciseName, values, comment]: StartingExercise): SessionExercise => ({
  exerciseId,
  exerciseName,
  position,
  sets: values.map(([weight, reps, bodyweight = false], index) => ({
    id: `${sessionId}-${exerciseId}-${index + 1}`,
    weight,
    reps,
    bodyweight,
    effort: index === 0 ? '1 RIR' : 'Failure',
  })),
  ...(comment ? { comment } : {}),
})

const startingSession = (
  id: string,
  savedAt: string,
  routineId: string,
  routineName: string,
  variationId: string,
  variationName: string,
  entries: StartingExercise[],
  rawNote: string,
): Session => {
  const exercises = entries.map((entry, index) => sessionExercise(id, index + 1, entry))
  return {
    id,
    date: '2026-09-17',
    savedAt,
    routineId,
    routineName,
    variationId,
    variationName,
    orderKind: 'variation',
    actualExerciseOrder: exercises.map(exercise => exercise.exerciseId),
    exercises,
    rawNote,
  }
}

export function createStartingPointSessions(): Session[] {
  return [
    startingSession(
      'starting-2026-09-17-push', '2026-09-17T19:52:00.000-04:00', 'push', 'Push', 'push-standard', 'Standard order',
      [
        ['incline-chest-press', 'Incline Chest Press', [[75, 9], [75, 6]]],
        ['converging-chest-press', 'Converging Chest Press', [[110, 7], [110, 7]]],
        ['pec-deck', 'Pec Deck', [[130, 11]]],
        ['shoulder-press', 'Shoulder Press', [[105, 10]]],
        ['lateral-raise', 'Lateral Raise', [[12.5, 12], [12.5, 11]]],
        ['tricep-pushdown', 'Tricep Pushdown', [[100, 10], [100, 6]], 'Lower the weight or change to a bar.'],
        ['overhead-extension', 'Overhead Extension', [[70, 11]]],
      ],
      'Incline Chest Press 75x9 75x6\nConverging Chest Press 110x7 110x7\nPec Deck 130x11\nShoulder Press 105x10\nLateral Raise 12.5x12 12.5x11\nTricep Pushdown 100x10 100x6 — lower the weight or change to a bar\nOverhead Extension 70x11',
    ),
    startingSession(
      'starting-2026-09-17-pull', '2026-09-17T20:02:00.000-04:00', 'pull', 'Pull', 'pull-ups-first', 'Pull-ups first',
      [
        ['pull-up', 'Pull Up', [[0, 10, true], [0, 8, true]]],
        ['lat-pulldown', 'Lat Pulldown', [[130, 11], [110, 9]], 'The source note listed Lat Pulldown twice.'],
        ['seated-row', 'Seated Row', [[130, 11], [130, 7]]],
        ['wide-row', 'Wide Row', [[90, 9]]],
        ['dumbbell-row', 'Dumbbell Row', [[40, 8], [40, 8]]],
        ['rear-delt', 'Rear Delt', [[85, 11], [85, 8]]],
        ['straight-bar-curl', 'Straight Bar Curl', [[110, 9], [110, 10]]],
        ['bayesian-curl', 'Bayesian Curl', [[40, 7]]],
      ],
      'Pull Up bwx10 bwx8\nLat Pulldown 130x11 110x9\nSeated Row 130x11 130x7\nWide Row 90x9\nDumbbell Row 40x8 40x8\nRear Delt 85x11 85x8\nStraight Bar Curl 110x9 110x10\nBayesian Curl 40x7',
    ),
    startingSession(
      'starting-2026-09-17-legs-press', '2026-09-17T20:12:00.000-04:00', 'legs', 'Legs', 'press-first', 'Leg press first',
      [
        ['leg-press', 'Leg Press', [[265, 8], [265, 7]], 'Push the seat back.'],
        ['rdl', 'Romanian Deadlift', [[115, 8], [115, 8]], 'Find wrist wraps.'],
        ['leg-extension', 'Leg Extension', [[50, 11]]],
        ['leg-curl', 'Seated Leg Curl', [[25, 7]], 'Keep the front of the leg planted.'],
        ['crunch', 'Crunch', [[20, 12]]],
        ['hanging-leg-raise', 'Hanging Leg Raise', [[0, 7, true]], "Find a new exercise; don't do this again."],
      ],
      "Leg Press 265x8 265x7 — push the seat back\nRomanian Deadlift 115x8 115x8 — find wrist wraps\nLeg Extension 50x11\nSeated Leg Curl 25x7 — keep the front of the leg planted\nCrunch 20x12\nHanging Leg Raise bwx7 — find a new exercise; don't do this again",
    ),
    startingSession(
      'starting-2026-09-17-legs-extensions', '2026-09-17T20:22:00.000-04:00', 'legs', 'Legs', 'extensions-first', 'Leg extension first',
      [
        ['leg-extension', 'Leg Extension', [[45, 12], [45, 11]]],
        ['rdl', 'Romanian Deadlift', [[115, 12], [135, 8]]],
        ['leg-press', 'Leg Press', [[225, 12], [225, 8]], "Form wasn't great on the first set; second set had perfect form with the back on the pad."],
      ],
      "Leg Extension 45x12 45x11\nRomanian Deadlift 115x12 135x8\nLeg Press 225x12 225x8 — first-set form wasn't great; perfect form on the second set with back on the pad",
    ),
  ]
}

/*
 * Training history from the first logged week to early November, so progress charts
 * start with a real arc. Key lifts follow explicit numbers ending at the current bests
 * (incline 80x6, pec deck 140, lat pulldown 140x9, seated row 130x7, leg press 225).
 * Accessory lifts climb gently from their September starting points.
 */
type Lift = [weight: number, reps: number]
const HISTORY_START = '2026-09-20'
const HISTORY_END = '2026-11-08'
const REST_WEEKDAYS = new Set([0, 3]) // Sundays and Wednesdays off

/** Training dates in rotation order: Push, Pull, Legs, repeat. */
function historySchedule() {
  const routines = ['push', 'pull', 'legs'] as const
  const days: Array<{ date: string; routine: (typeof routines)[number] }> = []
  const cursor = new Date(`${HISTORY_START}T12:00:00Z`)
  const end = new Date(`${HISTORY_END}T12:00:00Z`)
  for (let n = 0; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (REST_WEEKDAYS.has(cursor.getUTCDay())) continue
    days.push({ date: cursor.toISOString().slice(0, 10), routine: routines[n++ % 3] })
  }
  return days
}

/** Picks the i-th of n entries from an explicit progression, stretching it to fit. */
const pick = <T,>(steps: T[], i: number, n: number) => steps[Math.min(steps.length - 1, Math.round((i / Math.max(1, n - 1)) * (steps.length - 1)))]

/** Gentle linear climb for accessories: weight rounds to `step`, reps ease down as weight goes up. */
function climb([w0, r0]: Lift, [w1, r1]: Lift, step: number, i: number, n: number): Lift[] {
  const t = i / Math.max(1, n - 1)
  const weight = Math.round((w0 + (w1 - w0) * t) / step) * step
  const wobble = i > 0 && i < n - 1 && i % 2 ? -1 : 0
  const reps = Math.round(r0 + (r1 - r0) * t + wobble)
  return [[weight, reps], [weight, Math.max(5, reps - 2)]]
}

const KEY_LIFTS: Record<string, Lift[][]> = {
  'incline-chest-press': [[[75, 9], [75, 7]], [[75, 10], [75, 7]], [[75, 10], [75, 8]], [[80, 5], [75, 8]], [[80, 5], [80, 4]], [[80, 5], [80, 5]], [[80, 6], [80, 4]], [[80, 5], [80, 5]], [[80, 6], [80, 5]], [[80, 6], [80, 6]]],
  'pec-deck': [[[130, 12]], [[135, 9]], [[135, 10]], [[135, 11]], [[135, 12]], [[140, 7]], [[140, 8]], [[140, 8]], [[140, 9]], [[140, 9]]],
  'lat-pulldown': [[[130, 11], [120, 10]], [[130, 12], [120, 10]], [[135, 8], [120, 11]], [[135, 9], [120, 11]], [[135, 10], [125, 10]], [[135, 11], [125, 10]], [[140, 7], [125, 11]], [[140, 8], [125, 11]], [[140, 8], [130, 10]], [[140, 9], [130, 10]]],
  'seated-row': [[[130, 10], [130, 7]], [[130, 9], [130, 8]], [[130, 10], [130, 7]], [[130, 8], [130, 8]], [[130, 9], [130, 7]], [[130, 8], [130, 7]], [[130, 9], [130, 7]], [[130, 8], [130, 7]], [[130, 7], [130, 7]], [[130, 7], [130, 6]]],
  'leg-press': [[[225, 10], [225, 9]], [[225, 11], [225, 9]], [[225, 11], [225, 10]], [[225, 12], [225, 10]], [[225, 12], [225, 10]], [[225, 12], [225, 11]], [[225, 12], [225, 11]], [[225, 12], [225, 12]]],
}

const ACCESSORIES: Record<string, { name: string; from: Lift; to: Lift; step: number; bodyweight?: boolean }> = {
  'converging-chest-press': { name: 'Converging Chest Press', from: [110, 8], to: [120, 8], step: 5 },
  'shoulder-press': { name: 'Shoulder Press', from: [105, 10], to: [115, 8], step: 5 },
  'lateral-raise': { name: 'Lateral Raise', from: [12.5, 12], to: [15, 11], step: 2.5 },
  'tricep-pushdown': { name: 'Tricep Pushdown', from: [90, 12], to: [95, 11], step: 5 },
  'overhead-extension': { name: 'Overhead Extension', from: [70, 11], to: [80, 9], step: 5 },
  'pull-up': { name: 'Pull Up', from: [0, 10], to: [0, 12], step: 1, bodyweight: true },
  'wide-row': { name: 'Wide Row', from: [90, 9], to: [100, 8], step: 5 },
  'dumbbell-row': { name: 'Dumbbell Row', from: [40, 8], to: [50, 8], step: 5 },
  'rear-delt': { name: 'Rear Delt', from: [85, 11], to: [95, 9], step: 5 },
  'straight-bar-curl': { name: 'Straight Bar Curl', from: [110, 9], to: [115, 9], step: 5 },
  'bayesian-curl': { name: 'Bayesian Curl', from: [40, 7], to: [45, 8], step: 5 },
}

const KEY_NAMES: Record<string, string> = { 'incline-chest-press': 'Incline Chest Press', 'pec-deck': 'Pec Deck', 'lat-pulldown': 'Lat Pulldown', 'seated-row': 'Seated Row', 'leg-press': 'Leg Press' }

const ORDER = {
  push: { name: 'Push', variationId: 'push-standard', variationName: 'Standard order', exercises: ['incline-chest-press', 'converging-chest-press', 'pec-deck', 'shoulder-press', 'lateral-raise', 'tricep-pushdown', 'overhead-extension'] },
  pull: { name: 'Pull', variationId: 'pull-ups-first', variationName: 'Pull-ups first', exercises: ['pull-up', 'lat-pulldown', 'seated-row', 'wide-row', 'dumbbell-row', 'rear-delt', 'straight-bar-curl', 'bayesian-curl'] },
  legs: { name: 'Legs', variationId: 'press-first', variationName: 'Leg press first', exercises: ['leg-press'] },
} as const

const formatSet = ([weight, reps]: Lift, bodyweight?: boolean) => `${bodyweight && !weight ? 'bw' : weight}x${reps}`

export function createHistorySessions(): Session[] {
  const schedule = historySchedule()
  const counts = { push: 0, pull: 0, legs: 0 }
  const totals = { push: 0, pull: 0, legs: 0 }
  schedule.forEach(day => { totals[day.routine]++ })
  return schedule.map(({ date, routine }) => {
    const i = counts[routine]++, n = totals[routine]
    const plan = ORDER[routine]
    const id = `history-${date}-${routine}`
    const entries: StartingExercise[] = plan.exercises.map(exerciseId => {
      const key = KEY_LIFTS[exerciseId]
      if (key) return [exerciseId, KEY_NAMES[exerciseId], pick(key, i, n)]
      const a = ACCESSORIES[exerciseId]
      return [exerciseId, a.name, climb(a.from, a.to, a.step, i, n).map(([w, r]) => [w, r, a.bodyweight] as [number, number, boolean?])]
    })
    const exercises = entries.map((entry, index) => sessionExercise(id, index + 1, entry))
    const rawNote = entries.map(([exerciseId, name, sets]) => `${name} ${sets.map(([w, r]) => formatSet([w, r], ACCESSORIES[exerciseId]?.bodyweight)).join(' ')}`).join('\n')
    return { id, date, savedAt: `${date}T19:30:00.000-04:00`, routineId: routine, routineName: plan.name, variationId: plan.variationId, variationName: plan.variationName, orderKind: 'variation', actualExerciseOrder: exercises.map(exercise => exercise.exerciseId), exercises, rawNote }
  })
}
