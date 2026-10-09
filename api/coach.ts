const MODEL = 'gemini-3.1-flash-lite'
const WINDOW_MS = 60_000
const MAX_REQUESTS = 8
const buckets = new Map<string, number[]>()

type CoachExercise = { name: string; position: number; sets: { weight: number; reps: number; bodyweight: boolean }[]; comment?: string }
export type CoachSession = { date: string; routine: string; variation?: string; orderKind: string; exercises: CoachExercise[]; comment?: string }
export type CoachRequest = { question: string; sessions: CoachSession[] }

export class CoachError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code }
}

export function checkRateLimit(identity: string) {
  const now = Date.now()
  const recent = (buckets.get(identity) ?? []).filter((time) => now - time < WINDOW_MS)
  if (recent.length >= MAX_REQUESTS) throw new CoachError(429, 'RATE_LIMITED', 'Too many questions at once. Try again in a minute.')
  recent.push(now); buckets.set(identity, recent)
}

export async function requireSignedInUser(req: any) {
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) throw new CoachError(401, 'AUTH_REQUIRED', 'Sign in under Settings before using AI coaching.')
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) throw new CoachError(503, 'AUTH_NOT_CONFIGURED', 'AI coaching authentication is unavailable.')
  let response: Response
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: publishableKey } })
  } catch {
    throw new CoachError(503, 'AUTH_UNAVAILABLE', 'Sign-in verification is temporarily unavailable.')
  }
  if (!response.ok) throw new CoachError(401, 'AUTH_REQUIRED', 'Your sign-in has expired. Sign in again under Settings.')
  const user = await response.json() as { id?: string }
  if (!user.id) throw new CoachError(401, 'AUTH_REQUIRED', 'Your sign-in could not be verified.')
  return user.id
}

export async function generateCoachReply(payload: CoachRequest, apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey) throw new CoachError(503, 'AI_NOT_CONFIGURED', 'Gemini is not configured. Add GEMINI_API_KEY to the server environment.')
  const question = typeof payload.question === 'string' ? payload.question.trim() : ''
  if (!question || question.length > 1200) throw new CoachError(400, 'INVALID_QUESTION', 'Ask a question between 1 and 1,200 characters.')
  const sessions = Array.isArray(payload.sessions) ? payload.sessions.slice(0, 30) : []
  const prompt = `You are the private workout coach inside Optimal Lifts. Answer concisely and practically. Use only the supplied saved-session evidence. Never claim a workout happened when it is absent. If evidence is insufficient, say exactly what is missing. Do not diagnose injuries or provide medical treatment. Do not propose or imply any modification to stored records. Distinguish bodyweight reps from added load. Compare sessions with different variation/order context carefully.\n\nSAVED WORKOUT HISTORY (most recent first):\n${JSON.stringify(sessions)}\n\nQUESTION:\n${question}`
  let response: Response
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.25, maxOutputTokens: 700 } }),
    })
  } catch {
    throw new CoachError(502, 'PROVIDER_UNAVAILABLE', 'Gemini could not be reached. Your workout data is unchanged.')
  }
  if (!response.ok) {
    if (response.status === 429) throw new CoachError(429, 'AI_QUOTA', 'The Gemini free-tier limit is temporarily exhausted. Try again later.')
    if (response.status === 401 || response.status === 403) throw new CoachError(503, 'AI_CREDENTIALS', 'The Gemini credential was rejected. Update the server environment key.')
    throw new CoachError(502, 'PROVIDER_ERROR', 'Gemini returned an error. Workout logging remains available.')
  }
  const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
  if (!answer) throw new CoachError(502, 'EMPTY_RESPONSE', 'Gemini did not return an answer. Try rephrasing the question.')
  return { answer, model: MODEL }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' })
  try {
    const userId = await requireSignedInUser(req)
    checkRateLimit(userId)
    const result = await generateCoachReply(req.body)
    res.status(200).json(result)
  } catch (error) {
    const known = error instanceof CoachError ? error : new CoachError(500, 'SERVER_ERROR', 'The coach is unavailable. Your workout data is unchanged.')
    res.status(known.status).json({ code: known.code, message: known.message })
  }
}
