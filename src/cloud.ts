import { createClient, type Session as AuthSession } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { createSeedData } from './data'
import { clearCloudOwnerId, clearData, getCloudOwnerId, getLocalDataUpdatedAt, normalizeData, setCloudOwnerId } from './storage'
import type { AppData } from './types'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()
// Read before the client consumes the URL: a password-reset email link lands here with type=recovery.
const openedFromRecoveryLink = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash)
const supabase = projectUrl && publishableKey ? createClient(projectUrl, publishableKey) : null

export async function getCloudAccessToken() {
  if (!supabase) return undefined
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export type CloudState = {
  configured: boolean
  authReady: boolean
  /** True once the signed-in user's account data has been loaded into the app. */
  hydrated: boolean
  googleEnabled: boolean
  email?: string
  status: 'signed-out' | 'connecting' | 'syncing' | 'synced' | 'error'
  message?: string
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  /** True after the user opens a password-reset link; they must choose a new password. */
  recovering: boolean
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  retry: () => void
}

const friendly = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : ''
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Can’t reach the Optimal Lifts server. Check your connection and try again.'
  if (/relation .* does not exist|could not find the table/i.test(message)) return 'The account database isn’t set up yet (missing user_workout_data table).'
  return message || fallback
}

async function readCloudData(userId: string) {
  if (!supabase) return null
  const { data, error } = await supabase.from('user_workout_data').select('data, updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const normalized = normalizeData(data.data)
  if (!normalized) throw new Error('Saved workout data has an unsupported format.')
  return { data: normalized, updatedAt: data.updated_at as string }
}

async function writeCloudData(userId: string, data: AppData) {
  if (!supabase) return
  const { error } = await supabase.from('user_workout_data').upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export function useCloudSync(data: AppData, setData: Dispatch<SetStateAction<AppData>>): CloudState {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [hydratedId, setHydratedId] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [recovering, setRecovering] = useState(Boolean(supabase) && openedFromRecoveryLink)
  const [status, setStatus] = useState<CloudState['status']>(supabase ? 'connecting' : 'signed-out')
  const [message, setMessage] = useState<string>()
  const dataRef = useRef(data)
  const syncTimer = useRef<number | undefined>(undefined)
  const dirty = useRef(false)
  dataRef.current = data
  const userId = session?.user.id
  const hydrated = Boolean(userId && hydratedId === userId)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    const timeout = window.setTimeout(() => {
      if (!cancelled) { setAuthReady(true); setStatus('error'); setMessage('Can’t reach the Optimal Lifts server. Check your connection and try again.') }
    }, 10000)
    supabase.auth.getSession().then(({ data: result, error }) => {
      if (cancelled) return
      window.clearTimeout(timeout)
      setSession(result.session); setStatus(error ? 'error' : result.session ? 'connecting' : 'signed-out'); setMessage(error ? friendly(error, 'Could not restore your sign-in.') : undefined); setAuthReady(true)
    }).catch(error => {
      if (!cancelled) { window.clearTimeout(timeout); setAuthReady(true); setStatus('error'); setMessage(friendly(error, 'Could not connect to your account.')) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => { if (event === 'PASSWORD_RECOVERY') setRecovering(true); setSession(nextSession); setAuthReady(true) })
    return () => { cancelled = true; window.clearTimeout(timeout); listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!projectUrl || !publishableKey) return
    fetch(`${projectUrl}/auth/v1/settings`, { headers: { apikey: publishableKey } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Auth settings unavailable')))
      .then((settings: { external?: { google?: boolean } }) => setGoogleEnabled(Boolean(settings.external?.google)))
      .catch(() => setGoogleEnabled(false))
  }, [])

  // Load the account's data once per signed-in user before the app is shown.
  useEffect(() => {
    if (!supabase || !userId) { if (supabase && authReady && !userId) setStatus('signed-out'); return }
    if (hydratedId === userId) return
    let cancelled = false
    setStatus('syncing'); setMessage(undefined)
    ;(async () => {
      try {
        const remote = await readCloudData(userId)
        if (cancelled) return
        const localOwner = getCloudOwnerId()
        const localUpdatedAt = getLocalDataUpdatedAt()
        if (!remote) {
          // New account: keep this device's data only if it isn't another user's.
          const initial = localOwner && localOwner !== userId ? createSeedData() : dataRef.current
          await writeCloudData(userId, initial)
          if (cancelled) return
          setData(initial)
        } else if (localOwner === userId && localUpdatedAt && localUpdatedAt > remote.updatedAt) {
          await writeCloudData(userId, dataRef.current)
        } else {
          setData(remote.data)
        }
        if (cancelled) return
        setCloudOwnerId(userId)
        dirty.current = false
        setHydratedId(userId)
        setStatus('synced')
      } catch (error) {
        if (!cancelled) { setStatus('error'); setMessage(friendly(error, 'Could not load your workouts.')) }
      }
    })()
    return () => { cancelled = true }
  }, [userId, hydratedId, authReady, attempt, setData])

  const flush = useCallback(async () => {
    if (!userId || !dirty.current) return
    window.clearTimeout(syncTimer.current)
    try { setStatus('syncing'); await writeCloudData(userId, dataRef.current); dirty.current = false; setStatus('synced'); setMessage(undefined) }
    catch (error) { setStatus('error'); setMessage(friendly(error, 'Could not save your latest changes.')) }
  }, [userId])

  // Save every change to the account shortly after it happens.
  const skipFirst = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!hydrated || !userId) return
    if (skipFirst.current !== userId) { skipFirst.current = userId; return }
    dirty.current = true
    window.clearTimeout(syncTimer.current)
    syncTimer.current = window.setTimeout(() => { void flush() }, 900)
    return () => window.clearTimeout(syncTimer.current)
  }, [data, hydrated, userId, flush])

  // Retry unsaved changes when the connection returns or the app is backgrounded.
  useEffect(() => {
    if (!hydrated) return
    const onOnline = () => { void flush() }
    const onHide = () => { if (document.visibilityState === 'hidden') void flush() }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onHide)
    return () => { window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onHide) }
  }, [hydrated, flush])

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) throw new Error('Sign-in is not configured.')
    setStatus('connecting'); setMessage(undefined)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setStatus('signed-out'); throw new Error(friendly(error, 'Could not sign in.')) }
  }
  const signUpWithPassword = async (email: string, password: string) => {
    if (!supabase) throw new Error('Sign-in is not configured.')
    setStatus('connecting'); setMessage(undefined)
    const { data: result, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    if (error) { setStatus('signed-out'); throw new Error(friendly(error, 'Could not create your account.')) }
    const needsConfirmation = !result.session
    setStatus(needsConfirmation ? 'signed-out' : 'connecting')
    return needsConfirmation
  }
  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Sign-in is not configured.')
    setStatus('connecting'); setMessage(undefined)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) { setStatus('signed-out'); throw new Error(friendly(error, 'Google sign-in failed.')) }
  }
  const sendPasswordReset = async (email: string) => {
    if (!supabase) throw new Error('Sign-in is not configured.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) throw new Error(friendly(error, 'Could not send the reset email.'))
  }
  const updatePassword = async (password: string) => {
    if (!supabase) throw new Error('Sign-in is not configured.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(friendly(error, 'Could not update your password.'))
    setRecovering(false)
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token')) window.history.replaceState(null, '', '#dashboard')
  }
  const signOut = async () => {
    let saved = true
    if (dirty.current) { await flush(); saved = !dirty.current }
    if (supabase) await supabase.auth.signOut()
    setRecovering(false)
    // Leave nothing behind for the next person unless it failed to save.
    if (saved) { clearData(); clearCloudOwnerId(); setData(createSeedData()) }
    setHydratedId(undefined); setSession(null); setStatus('signed-out'); setMessage(undefined)
  }
  const retry = () => { setMessage(undefined); setAttempt(n => n + 1) }

  return { configured: Boolean(supabase), authReady, hydrated, googleEnabled, email: session?.user.email, status, message, signInWithPassword, signUpWithPassword, signInWithGoogle, recovering, sendPasswordReset, updatePassword, signOut, retry }
}
