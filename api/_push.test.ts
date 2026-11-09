import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOP_MS, PushError, parseRestAlert, runRestAlert } from './_push'

const subscription = { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p', auth: 'a' } }
const env = { VITE_SUPABASE_URL: 'https://db.example.com', VITE_SUPABASE_PUBLISHABLE_KEY: 'pk' }

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('parseRestAlert', () => {
  const now = 1_000_000
  it('accepts an alert due within 15 minutes', () => {
    expect(parseRestAlert({ subscription, alertId: 't1:1', dueAt: now + 90_000, name: 'Bench' }, now)).toMatchObject({ alertId: 't1:1', dueAt: now + 90_000, name: 'Bench' })
  })
  it('rejects alerts too far ahead, in the past, or with a non-https endpoint', () => {
    expect(() => parseRestAlert({ subscription, alertId: 'x', dueAt: now + 16 * 60_000, name: '' }, now)).toThrow(PushError)
    expect(() => parseRestAlert({ subscription, alertId: 'x', dueAt: now - 60_000, name: '' }, now)).toThrow(PushError)
    expect(() => parseRestAlert({ subscription: { ...subscription, endpoint: 'http://push.example.com' }, alertId: 'x', dueAt: now + 1000, name: '' }, now)).toThrow(PushError)
  })
})

describe('runRestAlert', () => {
  const userWith = (id: string | null) => vi.fn(async () => new Response(JSON.stringify({ id: 'u1', user_metadata: { rest_alert: id ? { id } : null } })))

  it('skips the push when the alert was cancelled or replaced', async () => {
    vi.stubGlobal('fetch', userWith('other-alert'))
    const result = await runRestAlert({ subscription, alertId: 'mine', dueAt: Date.now(), name: 'Bench' }, 'token', vi.fn(), env)
    expect(result).toBe('cancelled')
  })

  it('hands off to a fresh invocation when the rest is longer than one allows', async () => {
    vi.useFakeTimers()
    const handOff = vi.fn(async () => undefined)
    const pending = runRestAlert({ subscription, alertId: 'mine', dueAt: Date.now() + HOP_MS + 60_000, name: 'Bench' }, 'token', handOff, env)
    await vi.advanceTimersByTimeAsync(HOP_MS)
    expect(await pending).toBe('handed-off')
    expect(handOff).toHaveBeenCalledOnce()
  })
})
