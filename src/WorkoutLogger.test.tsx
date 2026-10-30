import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { WorkoutLogger, validRow } from './WorkoutLogger'
import { useRestTimer, workoutKey } from './useRestTimer'
import type { AppData } from './types'

let latest: AppData
const initial = (): AppData => ({ schemaVersion: 3, routines: [{ id: 'push', name: 'Push Day', exercises: [{ id: 'bench', name: 'Bench', aliases: [], bodyweight: false }], variations: [{ id: 'standard', name: 'Standard', exerciseIds: ['bench'] }] }], sessions: [], draft: { startedAt: Date.now(), routineId: 'push', variationId: 'standard', date: '2026-10-30', note: 'Bench', order: ['bench'], updatedAt: new Date().toISOString() } })
function Harness({ seed = initial() }: { seed?: AppData }) {
  const [data, setData] = useState(seed); latest = data
  const clock = useRestTimer(data.draft ? [workoutKey(data.draft)] : [])
  return <>{data.draft && <WorkoutLogger data={data} setData={setData} clock={clock} onBack={vi.fn()} onFinish={vi.fn()} toast={vi.fn()} />}<output aria-label="Timer id">{clock.timer?.id}</output></>
}
beforeEach(() => localStorage.clear())
afterEach(cleanup)
describe('explicit set flow', () => {
  it('saves unfinished inputs, starts rest only on completion, and does not restart for corrections', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Bench set 1 weight'), { target: { value: '225' } })
    fireEvent.change(screen.getByLabelText('Bench set 1 reps'), { target: { value: '8' } })
    expect(latest.draft?.rows?.bench[0].reps).toBe('8')
    expect(latest.sessions).toHaveLength(0)
    expect(screen.getByLabelText('Timer id').textContent).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Complete Bench set 1' }))
    const timerId = screen.getByLabelText('Timer id').textContent
    expect(timerId).not.toBe('')
    expect(latest.sessions[0].exercises[0].sets[0].reps).toBe(8)
    fireEvent.change(screen.getByLabelText('Bench set 1 reps'), { target: { value: '6' } })
    expect(latest.sessions[0].exercises[0].sets[0].reps).toBe(6)
    expect(screen.getByLabelText('Timer id').textContent).toBe(timerId)
    fireEvent.click(screen.getByRole('button', { name: 'Add set' }))
    expect(latest.sessions[0].exercises[0].sets).toHaveLength(1)
    expect(screen.getByLabelText('Timer id').textContent).toBe(timerId)
    fireEvent.click(screen.getByRole('button', { name: 'Complete Bench set 2' }))
    expect(latest.sessions).toHaveLength(1)
    expect(latest.sessions[0].exercises[0].sets).toHaveLength(2)
    expect(screen.getByLabelText('Timer id').textContent).not.toBe(timerId)
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(latest.draft).toBeUndefined()
    expect(latest.sessions).toHaveLength(1)
    expect(screen.getByLabelText('Timer id').textContent).toBe('')
  })
  it('hydrates incomplete rows and completed sets after remount without starting a new timer', () => {
    const view = render(<Harness />)
    fireEvent.change(screen.getByLabelText('Bench set 1 weight'), { target: { value: '185' } })
    const saved = latest
    view.unmount(); render(<Harness seed={saved} />)
    expect((screen.getByLabelText('Bench set 1 weight') as HTMLInputElement).value).toBe('185')
    expect(screen.getByLabelText('Timer id').textContent).toBe('')
  })
  it('blocks incomplete/invalid sets and preserves legacy note sets when finishing', () => {
    const seed = initial(); seed.draft!.note = 'Bench 225x8'
    render(<Harness seed={seed} />)
    expect(screen.getByRole('button', { name: 'Undo Bench set 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(latest.sessions[0].exercises[0].sets[0].weight).toBe(225)
    expect(latest.draft).toBeUndefined()
    expect(validRow({ id: 'x', weight: '', reps: '8', completed: false })).toBe(false)
    expect(validRow({ id: 'x', weight: '225', reps: '1.5', completed: false })).toBe(false)
    expect(validRow({ id: 'x', weight: '0', reps: '8', completed: false })).toBe(true)
  })
})
