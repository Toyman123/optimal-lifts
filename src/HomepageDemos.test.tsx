import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimerDemo, useDemoActivity, useDemoLoop } from './HomepageDemos'

const environment = vi.hoisted(() => ({ inView: true, reduced: false }))
vi.mock('framer-motion', async importOriginal => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useInView: () => environment.inView,
  useReducedMotion: () => environment.reduced,
}))

function LoopHarness() {
  const { ref, running } = useDemoActivity()
  const step = useDemoLoop(5, 1000, running)
  return <div ref={ref}><output aria-label="Demo step">{step}</output></div>
}

beforeEach(() => {
  vi.useFakeTimers()
  environment.inView = true; environment.reduced = false
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('homepage demo motion', () => {
  it('pauses offscreen and when the page is hidden, then resumes without resetting', () => {
    const view = render(<LoopHarness />)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByLabelText('Demo step').textContent).toBe('1')
    environment.inView = false; view.rerender(<LoopHarness />)
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByLabelText('Demo step').textContent).toBe('1')
    environment.inView = true; view.rerender(<LoopHarness />)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByLabelText('Demo step').textContent).toBe('1')
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    fireEvent(document, new Event('visibilitychange'))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByLabelText('Demo step').textContent).toBe('2')
  })
  it('does not run the demo loop with reduced motion', () => {
    environment.reduced = true
    render(<LoopHarness />)
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByLabelText('Demo step').textContent).toBe('0')
  })
  it('supports pause, resume, and adjustment in the isolated timer example', () => {
    render(<TimerDemo />)
    expect(screen.getByRole('img', { name: /02:00/ })).toBeTruthy()
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole('img', { name: /01:58/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pause demo timer' }))
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByRole('img', { name: /01:58, paused/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add 15 seconds to demo' }))
    expect(screen.getByRole('img', { name: /02:13, paused/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Resume demo timer' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('img', { name: /02:12, running/ })).toBeTruthy()
  })
})
