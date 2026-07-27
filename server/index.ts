import { config } from 'dotenv'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { ChartTimeframeId } from '../src/types/market'
import { ProviderError } from './errors'
import { fetchQuotes, searchSymbols } from './finnhub'
import { fetchAccount, fetchBars, fetchPositions } from './alpaca'

// Local dev only: load secrets from .env.local. In production (serverless),
// env vars are injected by the platform and this file won't exist.
config({ path: '.env.local' })

/**
 * Backend-for-frontend (BFF) — Phase 6.
 *
 * A tiny Hono server that owns the provider keys (Finnhub REST for search/quotes,
 * Alpaca for chart candles) and exposes just what the frontend needs under
 * `/api/*`. In dev, Vite proxies `/api` here (see vite.config.ts), so the browser
 * makes same-origin calls and never sees the keys. The live WebSocket stays
 * frontend-direct for now (ADR-015).
 */

const app = new Hono()

/** Turn a thrown error into the right status + JSON body. */
function fail(err: unknown): { status: number; body: { error: string } } {
  if (err instanceof ProviderError) return { status: err.status, body: { error: err.message } }
  const message = err instanceof Error ? err.message : 'Unexpected server error.'
  return { status: 500, body: { error: message } }
}

const CHART_TIMEFRAME_IDS: ReadonlySet<string> = new Set<ChartTimeframeId>([
  '1D',
  '1W',
  '1M',
  '3M',
  '1Y',
  '5Y',
])

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

app.get('/api/candles', async (c) => {
  const symbol = (c.req.query('symbol') ?? '').trim().toUpperCase()
  const timeframe = (c.req.query('timeframe') ?? '').trim()

  if (!symbol) return c.json({ error: 'Missing required "symbol" query param.' }, 400)
  if (!CHART_TIMEFRAME_IDS.has(timeframe)) {
    return c.json({ error: `Unknown or missing "timeframe": ${timeframe || '(none)'}.` }, 400)
  }

  try {
    return c.json(await fetchBars(symbol, timeframe as ChartTimeframeId))
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 400 | 429 | 500 | 502)
  }
})

app.get('/api/account', async (c) => {
  try {
    return c.json(await fetchAccount())
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 429 | 500 | 502)
  }
})

app.get('/api/positions', async (c) => {
  try {
    return c.json(await fetchPositions())
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 429 | 500 | 502)
  }
})

const port = Number(process.env.PORT) || 8787
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[bff] listening on http://localhost:${info.port}`)
})
