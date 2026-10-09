import { useState } from 'react'
import { getCloudAccessToken } from './cloud'
import { parseWorkoutNote } from './parser'
import type { Exercise } from './types'

export function GeminiWorkoutEntry({ exercises, onApply }: { exercises: Exercise[]; onApply: (note: string) => void }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ note: string; issues: string[]; routine: string }>()
  const routine = JSON.stringify(exercises)
  const current = preview?.routine === routine ? preview : undefined
  const parsed = current ? parseWorkoutNote(current.note, exercises) : undefined
  async function extract() {
    setBusy(true); setError(''); setPreview(undefined)
    const requestedRoutine = routine
    try {
      const token = await getCloudAccessToken()
      if (!token) throw new Error('Sign in under Settings to parse a workout with Gemini.')
      const response = await fetch('/api/parse', { method: 'POST', signal: AbortSignal.timeout(35000), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ note: input, exercises }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message || 'Could not parse your workout.')
      if (typeof body.note !== 'string' || !Array.isArray(body.issues) || body.issues.some((issue: unknown) => typeof issue !== 'string')) throw new Error('The workout response was invalid.')
      setPreview({ ...body, routine: requestedRoutine })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not parse your workout. Your draft is unchanged.') }
    finally { setBusy(false) }
  }
  return <details className="gemini-entry"><summary>Describe your workout with Gemini</summary>
    <p>Describe the sets you completed, then review the weights and reps. Applying the result replaces the workout note below and starts its normal save process.</p>
    <label htmlFor="natural-workout">What did you do?</label>
    <textarea id="natural-workout" rows={3} value={input} disabled={busy} maxLength={12000} placeholder="I did two sets of incline dumbbell press at 70 pounds for 7 reps each." onChange={event => { setInput(event.target.value); setPreview(undefined) }} />
    <button type="button" className="secondary-button" disabled={busy || !input.trim()} onClick={extract}>{busy ? 'Reading workout…' : 'Parse with Gemini'}</button>
    {error && <p role="alert">{error}</p>}
    {current && <div aria-live="polite"><h3>Review before saving</h3><pre>{current.note || 'No complete sets recognized.'}</pre>{current.issues.map((issue, i) => <p role="alert" key={i}>{issue}</p>)}{parsed?.issues.map((issue, i) => <p role="alert" key={i}>{issue.message}</p>)}<button type="button" className="primary-button" disabled={!parsed?.exercises.length || !!parsed.issues.length || !!current.issues.length} onClick={() => { onApply(current.note); setPreview(undefined); setInput('') }}>Use reviewed sets</button></div>}
    <p className="sheet-help">This sends your description and routine exercise names to Google Gemini when you press Parse. Your existing workout history is not sent.</p>
  </details>
}
