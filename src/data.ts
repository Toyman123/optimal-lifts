import type { AppData, Session, SessionExercise } from './types'

export const createSeedData = (): AppData => ({
  schemaVersion: 3,
  sampleDataVersion: 1,
  startingDataVersion: 1,
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
