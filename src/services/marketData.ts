import type {
  Candle,
  ChartTimeframe,
  ChartTimeframeId,
  PortfolioHistory,
  PortfolioHistoryRange,
  PortfolioSummary,
  Position,
  Quote,
  SymbolSearchResult,
  WatchlistEntry,
} from '@/types/market'

/**
 * Market-data service — the single data-access boundary (docs/04-architecture.md).
 *
 * Symbol search + quotes + candles + portfolio (account, positions, history) all go
 * through the **BFF** at `/api/*`, which owns the provider keys server-side (Finnhub
 * for search/quotes, Alpaca for candles + the paper Trading API). This file stays the
 * seam: stores/components call these functions and don't care where the data comes
 * from. The live WebSocket remains frontend-direct (see `marketStream.ts` + ADR-015).
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
