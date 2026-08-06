import type {
  Candle,
  ChartTimeframeId,
  Order,
  OrderRequest,
  OrderSide,
  OrderStatus,
  OrderTimeInForce,
  OrderType,
  PortfolioHistory,
  PortfolioHistoryRange,
  PortfolioSummary,
  Position,
} from '../src/types/market'
import { ProviderError } from './errors'
import { cached, invalidate } from './cache'
import {
  ALPACA_DATA_URL,
  ALPACA_TRADING_URL,
  alpacaRequest,
  num,
  optionalNum,
} from './alpacaClient'

/**
 * Server-side Alpaca client for the BFF: chart candles (`/api/candles`, ADR-016)
 * from the Market Data host, plus the paper Trading API — account + positions
 * (ADR-017), portfolio history (Phase 8) and orders (ADR-018).
 *
 * The shared transport (hosts, credentials, `alpacaRequest`) lives in
 * `alpacaClient.ts`, which `markets.ts` also builds on.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Per-timeframe request recipe. The server owns this mapping so the client only
 * passes a timeframe id. `lookbackMs` bounds the query window generously (with
 * slack for weekends/holidays); `sort=desc` + `limit` then keep only the latest
 * N bars, which we reverse to oldest→newest for the chart.
 */
interface BarSpec {
  timeframe: string // Alpaca timeframe string
  limit: number
  lookbackMs: number
  /** TTL for cached results — short for intraday, longer for daily/weekly. */
  ttlMs: number
}

const BAR_SPECS: Record<ChartTimeframeId, BarSpec> = {
  '1D': { timeframe: '5Min', limit: 78, lookbackMs: 5 * DAY_MS, ttlMs: 30_000 },
  '1W': { timeframe: '30Min', limit: 65, lookbackMs: 10 * DAY_MS, ttlMs: 60_000 },
  '1M': { timeframe: '1Day', limit: 22, lookbackMs: 45 * DAY_MS, ttlMs: 5 * 60_000 },
  '3M': { timeframe: '1Day', limit: 66, lookbackMs: 130 * DAY_MS, ttlMs: 5 * 60_000 },
  '1Y': { timeframe: '1Day', limit: 252, lookbackMs: 400 * DAY_MS, ttlMs: 5 * 60_000 },
  '5Y': { timeframe: '1Week', limit: 260, lookbackMs: 6 * 365 * DAY_MS, ttlMs: 5 * 60_000 },
}

/** One bar as returned by Alpaca's stock bars API. */
interface AlpacaBar {
  t: string // RFC-3339 timestamp
  o: number // open
  h: number // high
  l: number // low
  c: number // close
  v: number // volume
  n?: number // trade count
  vw?: number // volume-weighted average price
}

interface AlpacaBarsResponse {
  bars: AlpacaBar[] | null
  symbol: string
  next_page_token: string | null
}

/**
 * Fetch OHLCV candles for a symbol at the given timeframe from Alpaca (IEX).
 * Returns oldest→newest; an empty range resolves to `[]`.
 */
export function fetchBars(symbol: string, timeframeId: ChartTimeframeId): Promise<Candle[]> {
  const spec = BAR_SPECS[timeframeId]
  if (!spec) {
    return Promise.reject(new ProviderError(400, `Unknown chart timeframe: ${timeframeId}`))
  }

  return cached(`bars:${symbol}:${timeframeId}`, spec.ttlMs, async () => {
    const url = new URL(`${ALPACA_DATA_URL}/v2/stocks/${encodeURIComponent(symbol)}/bars`)
    url.searchParams.set('timeframe', spec.timeframe)
    url.searchParams.set('feed', 'iex')
    url.searchParams.set('adjustment', 'split')
    url.searchParams.set('sort', 'desc')
    url.searchParams.set('limit', String(spec.limit))
    url.searchParams.set('start', new Date(Date.now() - spec.lookbackMs).toISOString())

    const data = await alpacaRequest<AlpacaBarsResponse>(url)
    const bars = data.bars ?? []

    // Alpaca returns newest-first (sort=desc); the chart wants oldest→newest.
    return bars
      .map(toCandle)
      .sort((a, b) => a.time - b.time)
  })
}

/** Map an Alpaca bar to the app's `Candle` (epoch **seconds** for the time). */
function toCandle(bar: AlpacaBar): Candle {
  return {
    time: Math.floor(new Date(bar.t).getTime() / 1000),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }
}

// ---- Account + positions (Trading API, read-only — ADR-017) ----------------

const ACCOUNT_TTL = 5_000
const POSITIONS_TTL = 5_000

/** Subset of Alpaca's account object we use (numeric fields are strings). */
interface AlpacaAccount {
  equity: string
  last_equity: string
  buying_power: string
  cash: string
}

/**
 * Fetch account-level metrics and derive the dashboard `PortfolioSummary`.
 * `dayChange` is equity vs the previous trading day's close (`last_equity`).
 */
export function fetchAccount(): Promise<PortfolioSummary> {
  return cached('account', ACCOUNT_TTL, async () => {
    const a = await alpacaRequest<AlpacaAccount>(`${ALPACA_TRADING_URL}/v2/account`)
    const equity = num(a.equity)
    const lastEquity = num(a.last_equity)
    const dayChange = equity - lastEquity
    return {
      totalValue: equity,
      buyingPower: num(a.buying_power),
      dayChange,
      dayChangePercent: lastEquity > 0 ? (dayChange / lastEquity) * 100 : 0,
    }
  })
}

/** One open position as returned by Alpaca (numeric fields are strings). */
interface AlpacaPosition {
  symbol: string
  qty: string
  side: string
  avg_entry_price: string
  current_price: string
  market_value: string
  cost_basis: string
  unrealized_pl: string
  unrealized_plpc: string
  unrealized_intraday_pl: string
  unrealized_intraday_plpc: string
}

/** Fetch all open positions, mapped to the app's `Position` shape. */
export function fetchPositions(): Promise<Position[]> {
  return cached('positions', POSITIONS_TTL, async () => {
    const positions = await alpacaRequest<AlpacaPosition[]>(`${ALPACA_TRADING_URL}/v2/positions`)
    return (positions ?? []).map(toPosition)
  })
}

function toPosition(p: AlpacaPosition): Position {
  return {
    symbol: p.symbol,
    qty: num(p.qty),
    side: p.side === 'short' ? 'short' : 'long',
    avgEntryPrice: num(p.avg_entry_price),
    currentPrice: num(p.current_price),
    marketValue: num(p.market_value),
    costBasis: num(p.cost_basis),
    unrealizedPl: num(p.unrealized_pl),
    unrealizedPlPercent: num(p.unrealized_plpc) * 100,
    dayChange: num(p.unrealized_intraday_pl),
    dayChangePercent: num(p.unrealized_intraday_plpc) * 100,
  }
}

// ---- Portfolio history (Trading API — performance chart, Phase 8) ----------

const HISTORY_TTL = 30_000

/** Map a UI range to Alpaca's `period` + `timeframe` query params. */
const HISTORY_PARAMS: Record<PortfolioHistoryRange, { period: string; timeframe: string }> = {
  '1W': { period: '1W', timeframe: '1D' },
  '1M': { period: '1M', timeframe: '1D' },
  '3M': { period: '3M', timeframe: '1D' },
  '1Y': { period: '1A', timeframe: '1D' },
  ALL: { period: 'all', timeframe: '1D' },
}

/** Alpaca's portfolio-history response (parallel arrays). */
interface AlpacaPortfolioHistory {
  timestamp: number[]
  equity: number[]
  base_value: number
}

/**
 * Fetch equity-over-time for the performance chart. Leading zero-equity points
 * (before the account was funded) are dropped so the line starts at real money.
 */
export function fetchPortfolioHistory(range: PortfolioHistoryRange): Promise<PortfolioHistory> {
  const { period, timeframe } = HISTORY_PARAMS[range]
  return cached(`history:${range}`, HISTORY_TTL, async () => {
    const url = new URL(`${ALPACA_TRADING_URL}/v2/account/portfolio/history`)
    url.searchParams.set('period', period)
    url.searchParams.set('timeframe', timeframe)

    const data = await alpacaRequest<AlpacaPortfolioHistory>(url)
    const times = data.timestamp ?? []
    const equity = data.equity ?? []

    const all = times.map((time, i) => ({ time, value: num(equity[i]) }))
    // Drop the pre-funding flat-zero prefix so the line starts at real money.
    const start = all.findIndex((p) => p.value > 0)
    const points = start === -1 ? [] : all.slice(start)

    return {
      range,
      baseValue: points[0]?.value ?? num(data.base_value),
      points,
    }
  })
}

// ---- Orders (Trading API — paper trading writes, Phase 9) ------------------

const ORDERS_TTL = 2_000

/** Cache keys that a fill can change, dropped after every write. */
const WRITE_INVALIDATES = ['orders:', 'account', 'positions', 'history:']

/** One order as returned by Alpaca (numeric fields are strings). */
interface AlpacaOrder {
  id: string
  symbol: string
  side: string
  type: string
  time_in_force: string
  status: string
  qty: string | null
  filled_qty: string | null
  limit_price: string | null
  stop_price: string | null
  filled_avg_price: string | null
  submitted_at: string | null
}

function toOrder(o: AlpacaOrder): Order {
  return {
    id: o.id,
    symbol: o.symbol,
    side: o.side as OrderSide,
    type: o.type as OrderType,
    timeInForce: o.time_in_force as OrderTimeInForce,
    status: o.status as OrderStatus,
    qty: num(o.qty),
    filledQty: num(o.filled_qty),
    limitPrice: optionalNum(o.limit_price),
    stopPrice: optionalNum(o.stop_price),
    filledAvgPrice: optionalNum(o.filled_avg_price),
    submittedAt: o.submitted_at ?? '',
  }
}

/**
 * Place a paper order. Alpaca expects every number as a string, and only accepts
 * `limit_price`/`stop_price` for the matching order type.
 */
export async function placeOrder(input: OrderRequest): Promise<Order> {
  const body: Record<string, string> = {
    symbol: input.symbol,
    qty: String(input.qty),
    side: input.side,
    type: input.type,
    time_in_force: input.timeInForce,
  }
  if (input.type === 'limit' && input.limitPrice !== undefined) {
    body.limit_price = String(input.limitPrice)
  }
  if (input.type === 'stop' && input.stopPrice !== undefined) {
    body.stop_price = String(input.stopPrice)
  }

  const order = await alpacaRequest<AlpacaOrder>(`${ALPACA_TRADING_URL}/v2/orders`, {
    method: 'POST',
    body,
  })
  invalidate(...WRITE_INVALIDATES)
  return toOrder(order)
}

/** List orders, newest first. `status` is Alpaca's `open` | `closed` | `all`. */
export function fetchOrders(status: string, limit: number): Promise<Order[]> {
  return cached(`orders:${status}:${limit}`, ORDERS_TTL, async () => {
    const url = new URL(`${ALPACA_TRADING_URL}/v2/orders`)
    url.searchParams.set('status', status)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('direction', 'desc')

    const orders = await alpacaRequest<AlpacaOrder[]>(url)
    return (orders ?? []).map(toOrder)
  })
}

/** Fetch a single order by id (used to poll one order's status). */
export async function fetchOrder(id: string): Promise<Order> {
  const order = await alpacaRequest<AlpacaOrder>(
    `${ALPACA_TRADING_URL}/v2/orders/${encodeURIComponent(id)}`,
  )
  return toOrder(order)
}

/** Cancel an open order (Alpaca replies `204`; `422` if it's no longer cancelable). */
export async function cancelOrder(id: string): Promise<void> {
  await alpacaRequest<void>(`${ALPACA_TRADING_URL}/v2/orders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  invalidate(...WRITE_INVALIDATES)
}
