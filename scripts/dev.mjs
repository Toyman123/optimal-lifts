import http from 'node:http'
import { createServer as createViteServer, loadEnv } from 'vite'
import { CoachError, checkRateLimit, generateCoachReply } from '../api/coach.ts'

const env = loadEnv('development', process.cwd(), '')
const api = http.createServer((req, res) => {
  if (req.url !== '/api/coach' || req.method !== 'POST') { res.statusCode = 404; res.end(); return }
  let body = ''
  req.on('data', chunk => { body += chunk.toString(); if (body.length > 250_000) req.destroy() })
  req.on('end', async () => {
    try {
      checkRateLimit(req.socket.remoteAddress ?? 'local')
      const result = await generateCoachReply(JSON.parse(body), env.GEMINI_API_KEY)
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(result))
    } catch (error) {
      const known = error instanceof CoachError ? error : new CoachError(500, 'SERVER_ERROR', 'The coach is unavailable.')
      res.statusCode = known.status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ code: known.code, message: known.message }))
    }
  })
})

await new Promise(resolve => api.listen(5174, '127.0.0.1', resolve))
const vite = await createViteServer({ server: { host: '127.0.0.1', port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:5174' } } } })
await vite.listen()
vite.printUrls()

const close = async () => { await vite.close(); api.close(); process.exit(0) }
process.on('SIGINT', close)
process.on('SIGTERM', close)
