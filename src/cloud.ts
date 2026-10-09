import { createClient, type Session as AuthSession } from '@supabase/supabase-js'
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { createSeedData } from './data'
import { getCloudOwnerId, getLocalDataUpdatedAt, normalizeData, setCloudOwnerId } from './storage'
import type { AppData } from './types'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()
const supabase = projectUrl && publishableKey ? createClient(projectUrl, publishableKey) : null

export async function getCloudAccessToken() {
  if (!supabase) return undefined
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export type CloudState = {
  configured: boolean
  authReady: boolean
  googleEnabled: boolean
  email?: string
  status: 'local' | 'connecting' | 'syncing' | 'synced' | 'error'
  message?: string
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

async function readCloudData(userId: string) {
  if (!supabase) return null
  const { data, error } = await supabase.from('user_workout_data').select('data, updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const normalized = normalizeData(data.data)
  if (!normalized) throw new Error('Cloud workout data has an unsupported format.')
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
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [status, setStatus] = useState<CloudState['status']>(supabase ? 'connecting' : 'local')
  const [message, setMessage] = useState<string>()
  const dataRef = useRef(data)
  const hydratedUser = useRef<string | undefined>(undefined)
  const syncTimer = useRef<number | undefined>(undefined)
  dataRef.current = data

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: result }) => { setSession(result.session); setStatus(result.session ? 'connecting' : 'local'); setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAuthReady(true) })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!projectUrl || !publishableKey) return
    fetch(`${projectUrl}/auth/v1/settings`, { headers: { apikey: publishableKey } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Auth settings unavailable')))
      .then((settings: { external?: { google?: boolean } }) => setGoogleEnabled(Boolean(settings.external?.google)))
      .catch(() => setGoogleEnabled(false))
  }, [])

  useEffect(() => {
    const user = session?.user
    if (!supabase || !user || hydratedUser.current === user.id) {
      if (supabase && !user) setStatus('local')
      return
    }
    let cancelled = false
    setStatus('syncing'); setMessage(undefined)
    ;(async () => {
      try {
        const remote = await readCloudData(user.id)
        if (cancelled) return
        const localOwner = getCloudOwnerId()
        const localUpdatedAt = getLocalDataUpdatedAt()
        if (!remote) {
          const initial = localOwner && localOwner !== user.id ? createSeedData() : dataRef.current
          setData(initial)
          await writeCloudData(user.id, initial)
        } else if (localOwner === user.id && localUpdatedAt && localUpdatedAt > remote.updatedAt) {
          await writeCloudData(user.id, dataRef.current)
        } else {
          setData(remote.data)
        }
        setCloudOwnerId(user.id)
        hydratedUser.current = user.id
        if (!cancelled) setStatus('synced')
      } catch (error) {
        if (!cancelled) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Cloud sync failed.') }
      }
    })()
    return () => { cancelled = true }
  }, [session?.user?.id, setData])

  useEffect(() => {
    const userId = session?.user.id
    if (!supabase || !userId || hydratedUser.current !== userId) return
    window.clearTimeout(syncTimer.current)
    setStatus('syncing')
    syncTimer.current = window.setTimeout(async () => {
      try { await writeCloudData(userId, dataRef.current); setStatus('synced'); setMessage(undefined) }
      catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Cloud sync failed.') }
    }, 900)
    return () => window.clearTimeout(syncTimer.current)
  }, [data, session?.user.id])

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    setStatus('connecting'); setMessage(undefined)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setStatus('error'); setMessage(error.message); throw error }
  }
  const signUpWithPassword = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    setStatus('connecting'); setMessage(undefined)
    const { data: result, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    if (error) { setStatus('error'); setMessage(error.message); throw error }
    const needsConfirmation = !result.session
    setStatus(needsConfirmation ? 'local' : 'connecting')
    setMessage(needsConfirmation ? 'Check your email to confirm your account, then sign in.' : undefined)
    return needsConfirmation
  }
  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    setStatus('connecting'); setMessage(undefined)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) { setStatus('error'); setMessage(error.message); throw error }
  }
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); hydratedUser.current = undefined; setSession(null); setStatus('local'); setMessage('Signed out. This device copy remains available.') }
  const syncNow = async () => {
    const userId = session?.user.id
    if (!userId) return
    try { setStatus('syncing'); await writeCloudData(userId, dataRef.current); setStatus('synced'); setMessage('Everything on this device is backed up.') }
    catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Cloud sync failed.') }
  }

  return { configured: Boolean(supabase), authReady, googleEnabled, email: session?.user.email, status, message, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut, syncNow }
}
