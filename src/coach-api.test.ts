import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoachError, generateCoachReply } from '../api/coach'

describe('Gemini coach safeguards', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fails gracefully when credentials are missing', async () => {
    await expect(generateCoachReply({ question: 'How am I doing?', sessions: [] }, '')).rejects.toMatchObject({
      status: 503,
      code: 'AI_NOT_CONFIGURED',
    })
  })

  it('turns provider quota exhaustion into a safe app error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })))
    await expect(generateCoachReply({ question: 'What should I beat?', sessions: [] }, 'test-key')).rejects.toEqual(
      expect.objectContaining<Partial<CoachError>>({ status: 429, code: 'AI_QUOTA' }),
    )
  })
})
