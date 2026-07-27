import type {
  Candle,
  ChartResolution,
  ChartTimeframe,
  ChartTimeframeId,
  PortfolioSummary,
  Quote,
  SymbolSearchResult,
  WatchlistEntry,
} from '@/types/market'

/**
 * Market-data service — the single data-access boundary (docs/04-architecture.md).
 *
 * Symbol search + quotes now go through the **BFF** at `/api/*` (Phase 6), which
 * owns the Finnhub key server-side. This file stays the seam: stores/components
 * call these functions and don't care where the data comes from. Candles are
 * still mock (Alpaca IEX bars via the BFF land later) and portfolio metrics stay
 * mock until Alpaca (Phase 8). The live WebSocket remains frontend-direct
 * (see `marketStream.ts` + ADR-015).
 */

class MarketDataError extends Error {}

/** Fetch JSON from the BFF, mapping failures to friendly messages for the UI. */
async function api<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(path)
  } catch {
    throw new MarketDataError('Network error contacting the market-data service.')
  }

  if (res.status === 429) {
    throw new MarketDataError('Rate limit reached. Please wait a moment and try again.')
  }
  if (!res.ok) {
    throw new MarketDataError(`Market-data request failed (${res.status}).`)
  }
  return res.json() as Promise<T>
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

// ---- Candles (mock; Alpaca IEX bars via the BFF land later) ----------------

/*
 * Candle data is generated locally, not fetched. Finnhub's `/stock/candle` is a
 * premium endpoint (a free key returns 403), so there's no frontend-direct path
 * for it. This keeps the Chart page on the mock-first track: `fetchCandles` is
 * the seam that Phase 6 swaps for real bars (Alpaca IEX via the BFF) without
 * touching the store or chart component.
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

const TIMEFRAME_BY_ID = new Map(CHART_TIMEFRAMES.map((t) => [t.id, t]))

/** Seconds between bars for each resolution. */
const RESOLUTION_SECONDS: Record<ChartResolution, number> = {
  '5m': 5 * 60,
  '30m': 30 * 60,
  '1d': 24 * 60 * 60,
  '1w': 7 * 24 * 60 * 60,
}

/**
 * Fetch OHLCV candles for a symbol at the given timeframe.
 *
 * Mock implementation: a deterministic seeded random walk (seed derived from
 * symbol + timeframe) so the series looks realistic and is stable across
 * reloads. Async + small delay to mimic a network round-trip.
 */
export function fetchCandles(symbol: string, timeframeId: ChartTimeframeId): Promise<Candle[]> {
  const timeframe = TIMEFRAME_BY_ID.get(timeframeId)
  if (!timeframe) {
    return Promise.reject(new MarketDataError(`Unknown chart timeframe: ${timeframeId}`))
  }
  const candles = generateCandles(symbol, timeframe)
  return new Promise((resolve) => setTimeout(() => resolve(candles), 250))
}

/** Small string hash → 32-bit seed. */
function hashSeed(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 PRNG — deterministic, seedable, good enough for mock data. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Build a deterministic random-walk candle series for a symbol/timeframe. */
function generateCandles(symbol: string, timeframe: ChartTimeframe): Candle[] {
  const rand = mulberry32(hashSeed(`${symbol}:${timeframe.id}`))
  const step = RESOLUTION_SECONDS[timeframe.resolution]
  const { bars } = timeframe

  // Seed a plausible starting price (roughly $20–$520) and per-bar volatility.
  let price = 20 + rand() * 500
  const drift = (rand() - 0.5) * 0.001 // slight up/down bias per symbol
  const volatility = 0.008 + rand() * 0.012

  // Align the last candle to "now" and walk backwards in even steps.
  const now = Math.floor(Date.now() / 1000)
  const start = now - (bars - 1) * step

  const candles: Candle[] = []
  for (let i = 0; i < bars; i++) {
    const open = price
    const shock = (rand() - 0.5) * 2 * volatility + drift
    const close = Math.max(1, open * (1 + shock))
    const high = Math.max(open, close) * (1 + rand() * volatility)
    const low = Math.min(open, close) * (1 - rand() * volatility)
    const volume = Math.round(500_000 + rand() * 4_500_000)
    candles.push({
      time: start + i * step,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    })
    price = close
  }
  return candles
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ---- Portfolio (mock until Alpaca, Phase 8) --------------------------------

const PORTFOLIO_SUMMARY: PortfolioSummary = {
  totalValue: 48250.3,
  buyingPower: 12400,
  dayChange: 1120,
  dayChangePercent: 2.4,
}

export function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(PORTFOLIO_SUMMARY)), 300),
  )
}
