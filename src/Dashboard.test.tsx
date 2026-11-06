import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Dashboard } from './Dashboard'
import type { AppData, Session } from './types'

const data = (sessions: Session[]): AppData => ({ schemaVersion: 3, routines: [], sessions })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('reference dashboard data', () => {
  it('starts the selected routine and only offers continue for the routine with a draft', () => {
    const seed = data([])
    seed.routines = ['Push', 'Pull', 'Legs'].map(name => ({ id: name.toLowerCase(), name, exercises: [{ id: 'bench', name: 'Bench', aliases: [], bodyweight: false }], variations: [] }))
    seed.routines.push({ id: 'old', name: 'Archived', archived: true, exercises: [], variations: [] })
    seed.draft = { routineId: 'pull', date: '2026-11-05', note: '', order: [], updatedAt: '2026-11-05T12:00:00Z' }
    const startWorkout = vi.fn()
    render(<Dashboard data={seed} startWorkout={startWorkout} navigate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Continue Pull' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Push' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Push' }))
    expect(startWorkout).toHaveBeenLastCalledWith('push')
    fireEvent.click(screen.getByRole('button', { name: 'Pull' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue Pull' }))
    expect(startWorkout).toHaveBeenLastCalledWith('pull')
    expect(screen.queryByText('Bench')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Archived' })).toBeNull()
  })
  it('keeps the home screen focused on choosing a workout', () => {
    render(<Dashboard data={data([])} startWorkout={vi.fn()} navigate={vi.fn()} />)
    expect(screen.queryByText('Recent Workouts')).toBeNull()
    expect(screen.queryByText('Weekly Activity')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Time' })).toBeNull()
  })
})
