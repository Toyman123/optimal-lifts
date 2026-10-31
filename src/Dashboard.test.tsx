import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Dashboard, dashboardStats } from './Dashboard'
import type { AppData, Session } from './types'

const session = (id: string, date: string, weight: number, durationSeconds?: number): Session => ({ id, date, savedAt: `${date}T12:00:00Z`, routineId: 'push', routineName: 'Push Day', orderKind: 'unknown', actualExerciseOrder: ['bench'], exercises: [{ exerciseId: 'bench', exerciseName: 'Bench', position: 1, sets: [{ id, weight, reps: 10, bodyweight: false }] }], rawNote: `Bench ${weight}x10`, durationSeconds })
const data = (sessions: Session[]): AppData => ({ schemaVersion: 3, routines: [], sessions })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('reference dashboard data', () => {
  it('keeps week boundaries and consecutive training weeks correct across a month change', () => {
    const stats = dashboardStats(data([session('one', '2026-10-19', 100), session('two', '2026-10-25', 110), session('three', '2026-10-26', 120), session('future', '2026-11-02', 150)]), new Date('2026-11-01T12:00:00'))
    expect(stats.streak).toBe(2)
    expect(stats.week[0].date).toBe('2026-10-26')
    expect(stats.week[6].date).toBe('2026-11-01')
    expect(stats.weekVolume).toBe(1200)
    expect(stats.sessions).toHaveLength(3)
    expect(stats.records).toBe(2)
  })
  it('uses only measured durations and never invents timings for legacy workouts', () => {
    const stats = dashboardStats(data([session('old', '2026-10-27', 100), session('timed', '2026-10-28', 110, 1800)]), new Date('2026-10-31T12:00:00'))
    expect(stats.averageDuration).toBe(1800)
    expect(stats.week[2].time).toBe(30)
    expect(dashboardStats(data([session('old', '2026-10-27', 100)]), new Date('2026-10-31T12:00:00')).averageDuration).toBeUndefined()
  })
  it('switches chart metrics, navigates dates, and opens the actual recent session', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-31T12:00:00'))
    const saved = session('saved', '2026-10-30', 100, 1800), onSession = vi.fn()
    render(<Dashboard data={data([saved])} startWorkout={vi.fn()} navigate={vi.fn()} onSession={onSession} />)
    fireEvent.click(screen.getByRole('button', { name: 'Time' }))
    expect(screen.getByRole('img', { name: /Weekly time from/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'View Push Day from 2026-10-30' }))
    expect(onSession).toHaveBeenCalledWith(saved)
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    expect((screen.getByLabelText('Dashboard date') as HTMLInputElement).value).toBe('2026-10-30')
    fireEvent.change(screen.getByLabelText('Dashboard date'), { target: { value: '2026-10-23' } })
    expect(screen.getByRole('img', { name: /Weekly time from 2026-10-19 to 2026-10-25/ })).toBeTruthy()
    expect(screen.queryByText('Push Day')).toBeNull()
  })
})

