import { afterEach, describe, expect, it, vi } from 'vitest'
import { matchExercise, validateExtractedWorkout } from './gemini-parser'
import { extractWorkout } from '../api/parse'
const exercises = [{ id: 'press', name: 'Incline DB Press', aliases: ['Incline Dumbbell Press'], bodyweight: false }, { id: 'pull', name: 'Pull Up', aliases: ['Pullup'], bodyweight: true }]
const valid = { exercises: [{ name: 'Incline Dumbbell Press', sets: [{ weight: 70, reps: 7 }, { weight: 70, reps: 7 }] }], issues: [] }
describe('Gemini workout extraction', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('matches aliases and minor spelling variations without guessing unknown names', () => {
    expect(matchExercise('Incline Dumbell Press', exercises)?.id).toBe('press')
    expect(matchExercise('unknown machine', exercises)).toBeUndefined()
    const similar = [{ ...exercises[0], id: 'a', name: 'Row A', aliases: [] }, { ...exercises[0], id: 'b', name: 'Row B', aliases: [] }]
    expect(matchExercise('Row C', similar)).toBeUndefined()
  })
  it('preserves repeated sets and canonicalizes exercise names', () => {
    expect(validateExtractedWorkout(valid, exercises)).toEqual({ note: 'Incline DB Press\n70x7\n70x7', issues: [] })
  })
  it('blocks unknown exercises and retains ambiguity warnings', () => {
    const result = validateExtractedWorkout({ exercises: [{ name: 'unknown', sets: [{ weight: 70, reps: 7 }] }], issues: ['Weight missing'] }, exercises)
    expect(result.issues).toHaveLength(2)
    expect(result.note).toBe('')
  })
  it('rejects negative weights, fractional reps, and duplicate exercise records', () => {
    expect(() => validateExtractedWorkout({ ...valid, exercises: [{ ...valid.exercises[0], sets: [{ weight: -1, reps: 7 }] }] }, exercises)).toThrow()
    expect(() => validateExtractedWorkout({ ...valid, exercises: [{ ...valid.exercises[0], sets: [{ weight: 70, reps: 7.5 }] }] }, exercises)).toThrow()
    expect(() => validateExtractedWorkout({ ...valid, exercises: [...valid.exercises, ...valid.exercises] }, exercises)).toThrow()
  })
  it('preserves bodyweight and added-load notation', () => {
    expect(validateExtractedWorkout({ exercises: [{ name: 'Pull Up', sets: [{ weight: 0, reps: 8 }, { weight: 5, reps: 6 }] }], issues: [] }, exercises).note).toBe('Pull Up\nbw+0x8\nbw+5x6')
  })
  it('uses structured Gemini output for a natural-language workout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(valid) }] } }] })))
    vi.stubGlobal('fetch', fetchMock)
    const result = await extractWorkout({ note: 'I pressed seventy pounds for seven reps twice.', exercises }, 'test-key')
    expect(result.note).toBe('Incline DB Press\n70x7\n70x7')
    const request = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(request.generationConfig.responseMimeType).toBe('application/json')
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key')
  })
  it('rejects truncated and malformed responses without saving anything', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: JSON.stringify(valid) }] } }] }))))
    await expect(extractWorkout({ note: 'Press 70 for 7', exercises }, 'test-key')).rejects.toMatchObject({ code: 'INVALID_EXTRACTION' })
  })
  it('handles missing credentials and provider quotas', async () => {
    await expect(extractWorkout({ note: 'Press 70 for 7', exercises }, '')).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })))
    await expect(extractWorkout({ note: 'Press 70 for 7', exercises }, 'test-key')).rejects.toMatchObject({ status: 429 })
  })
})
