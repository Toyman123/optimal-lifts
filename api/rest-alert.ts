import { waitUntil } from '@vercel/functions'
import { PushError, bearerToken, fetchUser, parseRestAlert, runRestAlert } from './_push.ts'

/** Schedules a rest-complete push notification so it arrives even when the phone is locked. */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Use POST.' })
  try {
    const alert = parseRestAlert(req.body)
    const token = bearerToken(req)
    await fetchUser(token)
    const continueUrl = `https://${req.headers.host}/api/rest-alert`
    const handOff = () => fetch(continueUrl, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(alert) })
    waitUntil(runRestAlert(alert, token, handOff).catch(error => console.error('rest alert failed', error instanceof Error ? error.message : error)))
    res.status(202).json({ scheduled: true })
  } catch (error) {
    const known = error instanceof PushError ? error : new PushError(400, 'Could not schedule the alert.')
    res.status(known.status).json({ message: known.message })
  }
}
