import { Hono } from 'hono'
import type {
  ChartTimeframeId,
  MarketRegion,
  OrderRequest,
  OrderSide,
  PortfolioHistoryRange,
  TicketOrderType,
  TicketTimeInForce,
} from '../src/types/market'
import { ProviderError } from './errors'
import { fetchQuotes, searchSymbols } from './finnhub'
import {
  cancelOrder,
  fetchAccount,
  fetchBars,
  fetchOrder,
  fetchOrders,
  fetchPortfolioHistory,
  fetchPositions,
  placeOrder,
} from './alpaca'
import { fetchClock, fetchIndices, fetchMovers, fetchSectors } from './markets'
import { fetchStockStats } from './stats'

/**
 * Backend-for-frontend (BFF).
 *
 * A tiny Hono app that owns the provider keys (Finnhub REST for search/quotes,
 * Alpaca for chart candles, the Markets page, and the paper Trading API: account,
 * positions, history and orders) and exposes just what the frontend needs under
 * `/api/*`. This module is the shared app definition — no runtime/entry-point
 * concerns (no `serve()`, no `dotenv`) — so it can be mounted by both:
 *   - `server/index.ts`   — local dev, via `@hono/node-server`
 *   - `netlify/functions/api.ts` — production, via `hono/netlify`'s `handle()`
 * In dev, Vite proxies `/api` here (see vite.config.ts), so the browser makes
 * same-origin calls and never sees the keys. The live WebSocket stays
 * frontend-direct (ADR-015/ADR-021); order placement is server-side only (ADR-018).
 */

export const app = new Hono()

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

app.get('/api/stats', async (c) => {
  const symbol = (c.req.query('symbol') ?? '').trim().toUpperCase()
  if (!symbol) return c.json({ error: 'Missing required "symbol" query param.' }, 400)

  try {
    return c.json(await fetchStockStats(symbol))
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

const HISTORY_RANGES: ReadonlySet<string> = new Set<PortfolioHistoryRange>([
  '1W',
  '1M',
  '3M',
  '1Y',
  'ALL',
])

app.get('/api/portfolio/history', async (c) => {
  const range = (c.req.query('range') ?? '1M').trim().toUpperCase()
  if (!HISTORY_RANGES.has(range)) {
    return c.json({ error: `Unknown "range": ${range}.` }, 400)
  }
  try {
    return c.json(await fetchPortfolioHistory(range as PortfolioHistoryRange))
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 400 | 429 | 500 | 502)
  }
})

// ---- Markets (Phase 10 — ADR-020) ------------------------------------------

const MARKET_REGIONS: ReadonlySet<string> = new Set<MarketRegion>(['us', 'ca'])

/** Read + validate the `region` query param, defaulting to US. */
function parseRegion(raw: string | undefined): { region?: MarketRegion; error?: string } {
  const region = (raw ?? 'us').trim().toLowerCase()
  if (!MARKET_REGIONS.has(region)) return { error: `"region" must be us or ca (got ${region}).` }
  return { region: region as MarketRegion }
}

app.get('/api/markets/clock', async (c) => {
  try {
    return c.json(await fetchClock())
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 429 | 500 | 502)
  }
})

app.get('/api/markets/indices', async (c) => {
  try {
    return c.json(await fetchIndices())
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 429 | 500 | 502)
  }
})

app.get('/api/markets/movers', async (c) => {
  const { region, error } = parseRegion(c.req.query('region'))
  if (!region) return c.json({ error }, 400)

  try {
    return c.json(await fetchMovers(region))
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 400 | 429 | 500 | 502)
  }
})

app.get('/api/markets/sectors', async (c) => {
  const { region, error } = parseRegion(c.req.query('region'))
  if (!region) return c.json({ error }, 400)

  try {
    return c.json(await fetchSectors(region))
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 400 | 429 | 500 | 502)
  }
})

// ---- Orders (paper trading writes — Phase 9) -------------------------------

// We only place the subset our ticket offers, even though Alpaca accepts more.
const ORDER_SIDES: ReadonlySet<string> = new Set<OrderSide>(['buy', 'sell'])
const ORDER_TYPES: ReadonlySet<string> = new Set<TicketOrderType>(['market', 'limit', 'stop'])
const ORDER_TIFS: ReadonlySet<string> = new Set<TicketTimeInForce>(['day', 'gtc'])
const ORDER_STATUS_FILTERS: ReadonlySet<string> = new Set(['open', 'closed', 'all'])

/**
 * Validate a new-order ticket before spending an upstream call. Returns the
 * normalized request, or a message describing the first problem found.
 */
function parseOrderRequest(input: unknown): { order?: OrderRequest; error?: string } {
  if (typeof input !== 'object' || input === null) return { error: 'Expected a JSON order body.' }
  const raw = input as Record<string, unknown>

  const symbol = typeof raw.symbol === 'string' ? raw.symbol.trim().toUpperCase() : ''
  if (!symbol) return { error: 'Missing required "symbol".' }

  const qty = Number(raw.qty)
  if (!Number.isFinite(qty) || qty <= 0) return { error: '"qty" must be a positive number.' }

  const side = String(raw.side ?? '')
  if (!ORDER_SIDES.has(side)) return { error: `"side" must be buy or sell (got ${side || 'none'}).` }

  const type = String(raw.type ?? '')
  if (!ORDER_TYPES.has(type)) {
    return { error: `"type" must be market, limit or stop (got ${type || 'none'}).` }
  }

  const timeInForce = String(raw.timeInForce ?? '')
  if (!ORDER_TIFS.has(timeInForce)) {
    return { error: `"timeInForce" must be day or gtc (got ${timeInForce || 'none'}).` }
  }

  const limitPrice = raw.limitPrice === undefined ? undefined : Number(raw.limitPrice)
  const stopPrice = raw.stopPrice === undefined ? undefined : Number(raw.stopPrice)

  if (type === 'limit' && (limitPrice === undefined || !(limitPrice > 0))) {
    return { error: '"limitPrice" is required (and must be positive) for a limit order.' }
  }
  if (type === 'stop' && (stopPrice === undefined || !(stopPrice > 0))) {
    return { error: '"stopPrice" is required (and must be positive) for a stop order.' }
  }

  return {
    order: {
      symbol,
      qty,
      side: side as OrderSide,
      type: type as TicketOrderType,
      timeInForce: timeInForce as TicketTimeInForce,
      limitPrice,
      stopPrice,
    },
  }
}

app.post('/api/orders', async (c) => {
  let payload: unknown
  try {
    payload = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400)
  }

  const { order, error } = parseOrderRequest(payload)
  if (!order) return c.json({ error }, 400)

  try {
    return c.json(await placeOrder(order))
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 400 | 403 | 422 | 429 | 500 | 502)
  }
})

app.get('/api/orders', async (c) => {
  const status = (c.req.query('status') ?? 'all').trim().toLowerCase()
  if (!ORDER_STATUS_FILTERS.has(status)) {
    return c.json({ error: `"status" must be open, closed or all (got ${status}).` }, 400)
  }

  const requested = Number(c.req.query('limit') ?? 50)
  const limit = Number.isFinite(requested) ? Math.min(500, Math.max(1, Math.trunc(requested))) : 50

  try {
    return c.json(await fetchOrders(status, limit))
  } catch (err) {
    const { status: code, body } = fail(err)
    return c.json(body, code as 400 | 429 | 500 | 502)
  }
})

app.get('/api/orders/:id', async (c) => {
  const id = c.req.param('id')
  try {
    return c.json(await fetchOrder(id))
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 400 | 422 | 429 | 500 | 502)
  }
})

app.delete('/api/orders/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await cancelOrder(id)
    return c.body(null, 204)
  } catch (err) {
    const { status, body } = fail(err)
    return c.json(body, status as 400 | 422 | 429 | 500 | 502)
  }
})
