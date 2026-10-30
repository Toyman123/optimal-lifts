import { describe, expect, it, vi } from 'vitest'
import handler from '../api/parse'

describe('workout import API handler', () => {
  it('rejects unauthenticated calls before parsing or contacting Gemini', async () => {
    const response = { status: vi.fn(), json: vi.fn() }
    response.status.mockReturnValue(response)
    await handler({ method: 'POST', headers: {}, body: {} }, response)
    expect(response.status).toHaveBeenCalledWith(401)
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_REQUIRED' }))
  })
  it('rejects unsupported methods', async () => {
    const response = { status: vi.fn(), json: vi.fn() }
    response.status.mockReturnValue(response)
    await handler({ method: 'GET', headers: {} }, response)
    expect(response.status).toHaveBeenCalledWith(405)
  })
})
