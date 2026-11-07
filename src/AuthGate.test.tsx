import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'

const cloud = vi.hoisted(() => ({ state: { configured: true, authReady: true, hydrated: false, email: undefined as string | undefined, status: 'signed-out', googleEnabled: false } }))
vi.mock('./cloud', () => ({ getCloudAccessToken: vi.fn(), useCloudSync: () => ({ ...cloud.state, signInWithPassword: vi.fn(), signUpWithPassword: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn(), retry: vi.fn() }) }))

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/app')
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  window.scrollTo = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('sign-in requirement', () => {
  it('shows only the sign-in form when signed out', () => {
    cloud.state = { ...cloud.state, email: undefined, hydrated: false, status: 'signed-out' }
    render(<App />)
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('waits for account data before showing the app', () => {
    cloud.state = { ...cloud.state, email: 'me@example.com', hydrated: false, status: 'syncing' }
    render(<App />)
    expect(screen.getByRole('status').textContent).toContain('Loading your workouts')
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('shows the app and an Account section (no cloud backup) once signed in', async () => {
    cloud.state = { ...cloud.state, email: 'me@example.com', hydrated: true, status: 'synced' }
    render(<App />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Settings' })[0])
    expect(await screen.findByRole('heading', { name: 'Account' }, { timeout: 3000 })).toBeTruthy()
    expect(screen.queryByText('Cloud backup')).toBeNull()
    expect(screen.getByText('Sign out')).toBeTruthy()
  })
})
