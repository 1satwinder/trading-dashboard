import type {
  Candle,
  ChartTimeframe,
  ChartTimeframeId,
  MarketClock,
  MarketIndex,
  MarketMovers,
  MarketRegion,
  Order,
  OrderRequest,
  OrderStatusFilter,
  PortfolioHistory,
  PortfolioHistoryRange,
  PortfolioSummary,
  Position,
  Quote,
  SectorPerformance,
  StockStats,
  SymbolSearchResult,
  WatchlistEntry,
} from '@/types/market'

/**
 * Market-data service — the single data-access boundary (docs/04-architecture.md).
 *
 * Symbol search + quotes + candles + markets + portfolio (account, positions, history)
 * all go through the **BFF** at `/api/*`, which owns the provider keys server-side
 * (Finnhub for search/quotes, Alpaca for candles, markets and the paper Trading API).
 * This file stays the
 * seam: stores/components call these functions and don't care where the data comes
 * from. The live WebSocket remains frontend-direct (see `marketStream.ts` + ADR-015).
 *
 * Reads are public; placing and cancelling orders need a session cookie issued by
 * `/api/auth/login` (see ADR-024).
 */

class MarketDataError extends Error {}

/**
 * The BFF refused a write because there's no valid session — distinct from a
 * rejected order so callers can prompt for sign-in instead of showing an error.
 */
export class AuthRequiredError extends MarketDataError {}

/**
 * Fetch JSON from the BFF, mapping failures to friendly messages for the UI.
 *
 * The BFF's `{ error }` message is preferred when present — order rejections
 * ("insufficient buying power") only make sense with the upstream reason.
 */
async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = init

  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      // The session cookie rides along on same-origin calls (dev proxy + Netlify
      // redirect both keep `/api` same-origin); stated here rather than implied.
      credentials: 'same-origin',
    })
  } catch {
    throw new MarketDataError('Network error contacting the market-data service.')
  }

  if (res.status === 429) {
    throw new MarketDataError('Rate limit reached. Please wait a moment and try again.')
  }
  if (res.status === 401) {
    throw new AuthRequiredError(await errorMessage(res))
  }
  if (!res.ok) {
    throw new MarketDataError(await errorMessage(res))
  }

  // 204 No Content (e.g. cancelling an order).
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Read the BFF's error message, falling back to the status code. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    if (body?.error) return body.error
  } catch {
    // Non-JSON body — fall through.
  }
  return `Market-data request failed (${res.status}).`
}

// ---- Auth (session for the order writes — ADR-024) -------------------------

interface AuthSession {
  authenticated: boolean
}

/** Whether the browser still holds a valid session cookie (checked on boot). */
export function fetchSession(): Promise<AuthSession> {
  return api<AuthSession>('/api/auth/session')
}

/** Exchange the passcode for a session cookie; throws when it's wrong. */
export function signIn(passcode: string): Promise<AuthSession> {
  return api<AuthSession>('/api/auth/login', { method: 'POST', body: { passcode } })
}

/** Drop the session cookie. */
export function signOut(): Promise<AuthSession> {
  return api<AuthSession>('/api/auth/logout', { method: 'POST' })
}

// ---- Symbol search ---------------------------------------------------------

/** Search symbols by name or ticker (filtering/mapping happens in the BFF). */
export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const q = query.trim()
  if (!q) return []
  return api<SymbolSearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`)
}

// ---- Quotes ----------------------------------------------------------------

/**
 * Fetch quotes for many symbols in one BFF call. The provider's quote endpoint
 * doesn't carry a display name, so we attach each entry's `name` here.
 */
export async function fetchQuotes(entries: WatchlistEntry[]): Promise<Quote[]> {
  if (entries.length === 0) return []
  const symbols = entries.map((e) => e.symbol)
  const nameBySymbol = new Map(entries.map((e) => [e.symbol, e.name]))

  const quotes = await api<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`)
  return quotes.map((q) => ({ ...q, name: nameBySymbol.get(q.symbol) ?? q.name }))
}

/** Fetch a single quote (convenience wrapper over the batch endpoint). */
export async function fetchQuote(entry: WatchlistEntry): Promise<Quote> {
  const [quote] = await fetchQuotes([entry])
  if (!quote) throw new MarketDataError(`No quote returned for ${entry.symbol}.`)
  return quote
}

// ---- Candles ---------------------------------------------------------------

/*
 * Real OHLCV candles come from Alpaca's IEX feed via the BFF (`/api/candles`);
 * the provider keys stay server-side (see `server/alpaca.ts` + ADR-016). This
 * function is the seam — the store and chart component don't know or care that
 * the data is now real rather than the old synthetic walk.
 */

/** Range tabs shown above the chart; each bundles its resolution + span. */
export const CHART_TIMEFRAMES: ChartTimeframe[] = [
  { id: '1D', label: '1D', resolution: '5m', bars: 78 }, // ~1 trading day of 5m bars
  { id: '1W', label: '1W', resolution: '30m', bars: 65 }, // ~5 sessions of 30m bars
  { id: '1M', label: '1M', resolution: '1d', bars: 22 },
  { id: '3M', label: '3M', resolution: '1d', bars: 66 },
  { id: '1Y', label: '1Y', resolution: '1d', bars: 252 },
  { id: '5Y', label: '5Y', resolution: '1w', bars: 260 },
]

/**
 * Fetch OHLCV candles for a symbol at the given timeframe. The BFF owns the
 * timeframe → provider-request mapping; here we just pass the id along.
 */
export function fetchCandles(symbol: string, timeframeId: ChartTimeframeId): Promise<Candle[]> {
  return api<Candle[]>(
    `/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframeId)}`,
  )
}

/**
 * Chart-page symbol-info header: day stats (Alpaca) + fundamentals (Finnhub),
 * combined server-side (see `server/stats.ts` + ADR-023).
 */
export function fetchStockStats(symbol: string): Promise<StockStats> {
  return api<StockStats>(`/api/stats?symbol=${encodeURIComponent(symbol)}`)
}

// ---- Portfolio (real, via Alpaca account + positions through the BFF) ------

/** Account-level metrics (equity, buying power, day change) for the stat cards. */
export function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  return api<PortfolioSummary>('/api/account')
}

/** Open holdings, mapped from Alpaca positions server-side. */
export function fetchPositions(): Promise<Position[]> {
  return api<Position[]>('/api/positions')
}

/** Equity-over-time for the performance chart, for the given range. */
export function fetchPortfolioHistory(range: PortfolioHistoryRange): Promise<PortfolioHistory> {
  return api<PortfolioHistory>(`/api/portfolio/history?range=${encodeURIComponent(range)}`)
}

// ---- Markets (Phase 10 — ADR-020) ------------------------------------------

/*
 * The BFF owns which symbols stand in for each benchmark and how movers are
 * ranked and filtered, so these are plain pass-throughs. See `server/markets.ts`
 * for why indices are ETF proxies and Canada is US-listed.
 */

/** US session state, for the status pill (and to decide whether to poll). */
export function fetchMarketClock(): Promise<MarketClock> {
  return api<MarketClock>('/api/markets/clock')
}

/** Benchmark cards, priced via ETF proxies, each with a sparkline. */
export function fetchMarketIndices(): Promise<MarketIndex[]> {
  return api<MarketIndex[]>('/api/markets/indices')
}

/** Gainers, losers and most-active for a region, in one call. */
export function fetchMovers(region: MarketRegion): Promise<MarketMovers> {
  return api<MarketMovers>(`/api/markets/movers?region=${encodeURIComponent(region)}`)
}

/** Sector performance tiles for the heatmap. */
export function fetchSectors(region: MarketRegion): Promise<SectorPerformance[]> {
  return api<SectorPerformance[]>(`/api/markets/sectors?region=${encodeURIComponent(region)}`)
}

// ---- Orders (paper trading; placement is server-side only) ------------------

/** Submit a paper order. Rejections surface Alpaca's reason as the error message. */
export function placeOrder(input: OrderRequest): Promise<Order> {
  return api<Order>('/api/orders', { method: 'POST', body: input })
}

/** List orders, newest first. */
export function fetchOrders(status: OrderStatusFilter = 'all', limit = 50): Promise<Order[]> {
  return api<Order[]>(`/api/orders?status=${status}&limit=${limit}`)
}

/** Fetch a single order by id. */
export function fetchOrder(id: string): Promise<Order> {
  return api<Order>(`/api/orders/${encodeURIComponent(id)}`)
}

/** Cancel an open order. */
export function cancelOrder(id: string): Promise<void> {
  return api<void>(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
