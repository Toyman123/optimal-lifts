// Shared helpers for rest-complete push notifications. The leading underscore keeps
// Vercel from deploying this file as its own function.
import webpush from 'web-push'

export const MAX_DELAY_MS = 15 * 60_000
/** Each invocation waits at most this long before handing off to a fresh one (Vercel limit is 300s). */
export const HOP_MS = 270_000

export type PushSubscriptionJSON = { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } }
export type RestAlertRequest = { subscription: PushSubscriptionJSON; alertId: string; dueAt: number; name: string }
export type AuthUser = { id: string; user_metadata?: { rest_alert?: { id?: string } | null } }

export class PushError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

/** Validates the request body; throws PushError(400) when anything is off. */
export function parseRestAlert(body: unknown, now = Date.now()): RestAlertRequest {
  const value = (typeof body === 'string' ? JSON.parse(body) : body) as Partial<RestAlertRequest> | null
  const sub = value?.subscription
  if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || typeof sub.keys?.p256dh !== 'string' || typeof sub.keys?.auth !== 'string') throw new PushError(400, 'A valid push subscription is required.')
  if (typeof value.alertId !== 'string' || !value.alertId || value.alertId.length > 120) throw new PushError(400, 'A valid alert id is required.')
  if (typeof value.dueAt !== 'number' || !Number.isFinite(value.dueAt) || value.dueAt < now - 30_000 || value.dueAt > now + MAX_DELAY_MS) throw new PushError(400, 'The alert time must be within the next 15 minutes.')
  const name = typeof value.name === 'string' ? value.name.slice(0, 80) : ''
  return { subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, alertId: value.alertId, dueAt: value.dueAt, name }
}

export function bearerToken(req: { headers: Record<string, unknown> }) {
  const header = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

/** Looks the user up with their own token, so a stale or cancelled alert can be detected. */
export async function fetchUser(token: string, env: Record<string, string | undefined> = process.env): Promise<AuthUser> {
  const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new PushError(503, 'Sign-in is not configured.')
  if (!token) throw new PushError(401, 'Sign in to schedule rest alerts.')
  const response = await fetch(`${url}/auth/v1/user`, { signal: AbortSignal.timeout(10_000), headers: { authorization: `Bearer ${token}`, apikey: key } })
  if (!response.ok) throw new PushError(401, 'Your sign-in has expired.')
  const user = await response.json() as AuthUser
  if (!user.id) throw new PushError(401, 'Your sign-in could not be verified.')
  return user
}

export async function sendRestPush(alert: RestAlertRequest, env: Record<string, string | undefined> = process.env) {
  const publicKey = env.VITE_VAPID_PUBLIC_KEY, privateKey = env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) throw new PushError(503, 'Push notifications are not configured.')
  webpush.setVapidDetails('https://optimal-lifts.vercel.app', publicKey, privateKey)
  const body = alert.name ? `Ready for your next ${alert.name} set.` : 'Ready for your next set.'
  await webpush.sendNotification(alert.subscription, JSON.stringify({ title: 'Rest complete', body }), { TTL: 60, urgency: 'high' })
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Waits until the alert is due, then sends it if it is still the user's current alert.
 * When the wait is longer than one invocation allows, `handOff` continues it in a fresh one.
 */
export async function runRestAlert(alert: RestAlertRequest, token: string, handOff: () => Promise<unknown>, env: Record<string, string | undefined> = process.env, now = Date.now) {
  const start = now()
  const wait = Math.max(0, Math.min(alert.dueAt - start, HOP_MS))
  await sleep(wait)
  if (alert.dueAt - now() > 1_000) { await handOff(); return 'handed-off' as const }
  const user = await fetchUser(token, env)
  if (user.user_metadata?.rest_alert?.id !== alert.alertId) return 'cancelled' as const
  await sendRestPush(alert, env)
  return 'sent' as const
}
