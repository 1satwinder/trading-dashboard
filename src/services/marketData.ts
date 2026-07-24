import type { PortfolioSummary, Quote, SymbolSearchResult, WatchlistEntry } from '@/types/market'

/**
 * Market-data service — the single data-access boundary (docs/04-architecture.md).
 *
 * Stage 2 of the data strategy: symbol search + quotes come **frontend-direct**
 * from Finnhub (local-dev spike only — the key is exposed, so this is never
 * deployed). This whole file is the seam; Phase 7 swaps it for the BFF (`/api/*`)
 * without touching stores or components. Portfolio metrics stay mock until Alpaca
 * (Phase 8).
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY

class MarketDataError extends Error {}

function requireKey(): string {
  if (!API_KEY) {
    throw new MarketDataError(
      'Missing Finnhub API key. Add VITE_FINNHUB_API_KEY to .env.local (see .env.example).',
    )
  }
  return API_KEY
}

async function finnhub<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${FINNHUB_BASE}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.searchParams.set('token', requireKey())

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new MarketDataError('Network error contacting the market-data provider.')
  }

  if (res.status === 429) {
    throw new MarketDataError('Rate limit reached. Please wait a moment and try again.')
  }
  if (res.status === 401 || res.status === 403) {
    throw new MarketDataError('Market-data request was rejected. Check your Finnhub API key.')
  }
  if (!res.ok) {
    throw new MarketDataError(`Market-data request failed (${res.status}).`)
  }
  return res.json() as Promise<T>
}

// ---- Symbol search ---------------------------------------------------------

interface FinnhubSearchResult {
  description: string
  displaySymbol: string
  symbol: string
  type: string
}

interface FinnhubSearchResponse {
  count: number
  result: FinnhubSearchResult[]
}

/**
 * Search symbols by name or ticker. Filters to plain US listings (no `.`/`:`
 * suffixes) with a description, which keeps the dropdown clean and lookup-able.
 */
export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const data = await finnhub<FinnhubSearchResponse>('/search', { q })
  return (data.result ?? [])
    .filter((r) => r.description && !r.symbol.includes('.') && !r.symbol.includes(':'))
    .slice(0, 12)
    .map((r) => ({
      symbol: r.symbol,
      name: toTitleCase(r.description),
      type: r.type || 'Stock',
    }))
}

// ---- Quotes ----------------------------------------------------------------

interface FinnhubQuote {
  c: number // current price
  d: number | null // change
  dp: number | null // percent change
  h: number // high
  l: number // low
  o: number // open
  pc: number // previous close
  t: number // timestamp
}

/** Fetch a live quote for one symbol, keeping the provided display name. */
export async function fetchQuote(entry: WatchlistEntry): Promise<Quote> {
  const q = await finnhub<FinnhubQuote>('/quote', { symbol: entry.symbol })
  return {
    symbol: entry.symbol,
    name: entry.name,
    price: q.c ?? 0,
    change: q.d ?? 0,
    changePercent: q.dp ?? 0,
    previousClose: q.pc ?? undefined,
    // Finnhub's free tier has no intraday candles; approximate a tiny trend
    // line from the day's open → high/low → last so the sparkline isn't blank.
    sparkline: buildSparkline(q),
  }
}

/** Fetch quotes for many symbols; a single failure doesn't sink the batch. */
export async function fetchQuotes(entries: WatchlistEntry[]): Promise<Quote[]> {
  const results = await Promise.allSettled(entries.map((e) => fetchQuote(e)))
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
    .map((r) => r.value)
}

/**
 * Rough intraday shape from a single quote (open, low, high, previous close,
 * current). Not a true time series — just enough to give the row a trend cue
 * until real candles arrive via the BFF.
 */
function buildSparkline(q: FinnhubQuote): number[] {
  const pts = [q.pc, q.o, q.l, q.h, q.c].filter((n) => typeof n === 'number' && n > 0)
  return pts.length >= 2 ? pts : []
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Inc|Corp|Ltd|Plc|Co|Etf|Reit|Sa|Ag|Nv)\b/gi, (m) => m.toUpperCase())
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
