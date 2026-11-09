import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRestTimer } from './useRestTimer'

describe('rest clock lifecycle', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(1_000_000) })
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

  it('restores the deadline after leaving and reopening the app', () => {
    const first = renderHook(() => useRestTimer(vi.fn()))
    act(() => first.result.current.setTimer({ id: 'rest', exerciseId: 'row', name: 'Row', duration: 120, remaining: 120, running: true, endAt: Date.now() + 120_000 }))
    first.unmount()
    vi.setSystemTime(1_045_000)
    const resumed = renderHook(() => useRestTimer(vi.fn()))
    expect(resumed.result.current.timer?.remaining).toBe(75)
    act(() => vi.advanceTimersByTime(75_000))
    expect(resumed.result.current.timer?.remaining).toBe(0)
    expect(resumed.result.current.timer?.running).toBe(false)
  })

  it('uses a service worker to show a notification once and preserves it across reloads', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('Notification', { permission: 'granted' })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: vi.fn().mockResolvedValue({}), ready: Promise.resolve({ showNotification }) } })
    localStorage.setItem('optimal-lifts-rest-alerts', 'true')
    const toast = vi.fn()
    const hook = renderHook(() => useRestTimer(toast))
    await act(async () => {
      hook.result.current.setTimer({ id: 'rest', exerciseId: 'row', name: 'Row', duration: 30, remaining: 0, running: false })
    })
    expect(showNotification).toHaveBeenCalledTimes(1)
    expect(showNotification).toHaveBeenCalledWith('Rest complete', expect.objectContaining({ body: 'Ready for your next Row set.' }))
    hook.unmount()
    await act(async () => { renderHook(() => useRestTimer(toast)) })
    expect(showNotification).toHaveBeenCalledTimes(1)
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
  })
})
