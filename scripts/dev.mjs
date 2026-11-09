import http from 'node:http'
import { createServer as createViteServer, loadEnv } from 'vite'
import { CoachError, checkRateLimit, generateCoachReply, requireSignedInUser } from '../api/coach.ts'

import { extractWorkout } from '../api/parse.ts'
import { PushError, bearerToken, fetchUser, parseRestAlert, runRestAlert } from '../api/_push.ts'

const env = loadEnv('development', process.cwd(), '')
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']) {
  if (env[key]) process.env[key] = env[key]
}
// Local stand-in for api/rest-alert.ts: same checks, but waits in-process instead of using waitUntil.
function handleRestAlert(req, res) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString(); if (body.length > 20_000) req.destroy() })
  req.on('end', async () => {
    res.setHeader('content-type', 'application/json')
    try {
      const alert = parseRestAlert(body)
      const token = bearerToken(req)
      await fetchUser(token)
      const run = () => runRestAlert(alert, token, run).catch(error => console.error('rest alert failed', error.message))
      void run()
      res.statusCode = 202; res.end(JSON.stringify({ scheduled: true }))
    } catch (error) {
      const known = error instanceof PushError ? error : new PushError(400, 'Could not schedule the alert.')
      res.statusCode = known.status; res.end(JSON.stringify({ message: known.message }))
    }
  })
}

const api = http.createServer((req, res) => {
  if (req.url === '/api/rest-alert' && req.method === 'POST') return handleRestAlert(req, res)
  if (!['/api/coach', '/api/parse'].includes(req.url) || req.method !== 'POST') { res.statusCode = 404; res.end(); return }
  let body = ''
  req.on('data', chunk => { body += chunk.toString(); if (body.length > 250_000) req.destroy() })
  req.on('end', async () => {
    try {
      const userId = await requireSignedInUser(req)
      checkRateLimit(userId)
      const result = await (req.url === '/api/parse' ? extractWorkout : generateCoachReply)(JSON.parse(body), env.GEMINI_API_KEY)
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(result))
    } catch (error) {
      const known = error instanceof CoachError ? error : new CoachError(500, 'SERVER_ERROR', 'The coach is unavailable.')
      res.statusCode = known.status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ code: known.code, message: known.message }))
    }
  })
})

await new Promise(resolve => api.listen(5174, '127.0.0.1', resolve))
const vite = await createViteServer({ configFile: 'vite.config.ts', server: { host: '127.0.0.1', port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:5174' } } } })
await vite.listen()
vite.printUrls()

const close = async () => { await vite.close(); api.close(); process.exit(0) }
process.on('SIGINT', close)
process.on('SIGTERM', close)
