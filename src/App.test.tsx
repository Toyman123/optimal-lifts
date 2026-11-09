import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { createSeedData } from './data'
import type { AppData } from './types'

const auth = vi.hoisted(() => ({ email: 'test@example.com' as string | undefined, signInWithPassword: vi.fn(async () => {}), signUpWithPassword: vi.fn(async () => true), signOut: vi.fn(async () => {}), retry: vi.fn() }))
vi.mock('./cloud', () => ({ getCloudAccessToken: vi.fn(), useCloudSync: () => ({ configured: true, authReady: true, hydrated: Boolean(auth.email), status: auth.email ? 'synced' : 'signed-out', googleEnabled: false, ...auth }) }))
const restTimer = vi.hoisted(() => ({ setTimer: vi.fn() }))
vi.mock('./useRestTimer', () => ({ useRestTimer: () => ({ timer: null, setTimer: restTimer.setTimer, restAlertsEnabled: false, enableRestAlerts: vi.fn(), disableRestAlerts: vi.fn(), testRestAlert: vi.fn() }) }))
const stored = (): AppData => JSON.parse(localStorage.getItem('optimal-lifts:data')!)
const navigate = (name: string) => fireEvent.click(screen.getAllByRole('button', { name })[0])

beforeEach(() => {
  auth.email = 'test@example.com'
  window.history.replaceState(null, '', '#dashboard')
  localStorage.clear()
  localStorage.setItem('optimal-lifts:data', JSON.stringify(createSeedData()))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  window.scrollTo = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('workout app flows', () => {
  it('opens the website home and enters the tracker without losing in-page navigation', async () => {
    window.history.replaceState(null, '', '/')
    render(<App />)
    expect(screen.getByRole('heading', { name: /Built for/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    await screen.findByRole('heading', { name: 'Dashboard.' })
    window.history.replaceState(null, '', '#main-content')
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(screen.getByRole('heading', { name: 'Dashboard.' })).toBeTruthy()
    navigate('Settings')
    await screen.findByRole('heading', { name: 'Account' })
    expect(screen.getByText('test@example.com')).toBeTruthy()
    expect(screen.queryByText('Cloud backup')).toBeNull()
    expect(window.location.hash).toBe('#settings')
  })

  it('logs a set, saves once, finishes, and advances the rotation', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start workout' }))
    await screen.findByLabelText('Set weight')
    fireEvent.change(screen.getByLabelText('Set weight'), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText('Set reps'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add set' }))
    await waitFor(() => expect(stored().sessions).toHaveLength(1), { timeout: 3000 })
    expect(stored().sessions[0].exercises[0].sets[0]).toMatchObject({ weight: 70, reps: 8 })
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }))
    await screen.findByRole('heading', { name: 'Progress' })
    expect(stored().sessions).toHaveLength(1)
    expect(stored().draft).toBeUndefined()
    expect(stored().nextRoutineId).toBe('pull')
  })

  it('starts the rest timer immediately for every logged set, including a retyped one', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start workout' }))
    const note = await screen.findByLabelText('Write it how you trained')
    const base = (note as HTMLTextAreaElement).value
    fireEvent.change(note, { target: { value: base + '\nIncline Chest Press 70x8' } })
    expect(restTimer.setTimer).toHaveBeenCalledTimes(1)
    expect(restTimer.setTimer.mock.calls[0][0]).toMatchObject({ name: 'Incline Chest Press', running: true })
    fireEvent.change(note, { target: { value: base + '\nIncline Chest Press 70x' } })
    fireEvent.change(note, { target: { value: base + '\nIncline Chest Press 70x9' } })
    expect(restTimer.setTimer).toHaveBeenCalledTimes(2)
  })

  it('preserves a draft when navigating immediately after typing', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start workout' }))
    const note = await screen.findByLabelText('Write it how you trained')
    fireEvent.change(note, { target: { value: 'Incline Chest Press 75x' } })
    navigate('Home')
    await screen.findByRole('heading', { name: 'Dashboard.' })
    expect(stored().draft?.note).toBe('Incline Chest Press 75x')
    fireEvent.click(screen.getByRole('button', { name: 'Continue workout' }))
    expect((await screen.findByLabelText('Write it how you trained') as HTMLTextAreaElement).value).toBe('Incline Chest Press 75x')
  })

  it('requires sign-in before showing the tracker', async () => {
    auth.email = undefined
    render(<App />)
    expect(await screen.findByLabelText('Email')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Dashboard.' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start workout' })).toBeNull()
  })

  it('exposes working password sign-in and account creation', async () => {
    auth.email = undefined
    render(<App />)
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith('test@example.com', 'example-password'))
    fireEvent.click(screen.getByRole('button', { name: 'New here? Create an account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByText('Check your email to confirm your account, then sign in.')
    expect(auth.signUpWithPassword).toHaveBeenCalledOnce()
  })

  it('reorders routines using the workout list controls', async () => {
    render(<App />)
    navigate('Workouts')
    fireEvent.click(await screen.findByRole('button', { name: 'Move Pull earlier' }))
    await waitFor(() => expect(stored().routines[0].id).toBe('pull'))
  })
})
