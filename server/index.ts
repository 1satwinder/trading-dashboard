import { config } from 'dotenv'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { FinnhubError, fetchQuotes, searchSymbols } from './finnhub'

// Local dev only: load secrets from .env.local. In production (serverless),
// env vars are injected by the platform and this file won't exist.
config({ path: '.env.local' })

/**
 * Backend-for-frontend (BFF) — Phase 6.
 *
 * A tiny Hono server that owns the Finnhub REST key and exposes just what the
 * frontend needs under `/api/*`. In dev, Vite proxies `/api` here (see
 * vite.config.ts), so the browser makes same-origin calls and never sees the key.
 * The live WebSocket stays frontend-direct for now (ADR-015).
 */

const app = new Hono()

/** Turn a thrown error into the right status + JSON body. */
function fail(err: unknown): { status: number; body: { error: string } } {
  if (err instanceof FinnhubError) return { status: err.status, body: { error: err.message } }
  const message = err instanceof Error ? err.message : 'Unexpected server error.'
  return { status: 500, body: { error: message } }
}

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/search', async (c) => {
  const q = c.req.query('q') ?? ''
  try {
    return c.json(await searchSymbols(q))
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 429 | 500 | 502)
  }
})

app.get('/api/quotes', async (c) => {
  const symbols = (c.req.query('symbols') ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)

  if (symbols.length === 0) return c.json([])

  try {
    return c.json(await fetchQuotes(symbols))
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 429 | 500 | 502)
  }
})

const port = Number(process.env.PORT) || 8787
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[bff] listening on http://localhost:${info.port}`)
})
