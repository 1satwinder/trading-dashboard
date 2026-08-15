import type { Quote, StockStats, SymbolSearchResult } from '../src/types/market'
import { ProviderError } from './errors'
import { cached } from './cache'

/**
 * Server-side Finnhub client — the provider half of the BFF (docs/04-architecture.md).
 *
 * This is the code that used to live frontend-direct in `src/services/marketData.ts`.
 * It now runs only on the server so the API key (`FINNHUB_API_KEY`) never reaches
 * the browser. Responses are mapped into the app's shared shapes (`SymbolSearchResult`,
 * `Quote`) and cached briefly to stay under Finnhub's ~60 req/min free tier.
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

function requireKey(): string {
  const key = process.env.FINNHUB_API_KEY
  if (!key) {
    throw new ProviderError(500, 'Server is missing FINNHUB_API_KEY (see .env.example).')
  }
  return key
}

async function finnhub<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${FINNHUB_BASE}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.searchParams.set('token', requireKey())

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new ProviderError(502, 'Upstream network error contacting Finnhub.')
  }

  if (res.status === 429) throw new ProviderError(429, 'Finnhub rate limit reached.')
  if (!res.ok) throw new ProviderError(502, `Finnhub request failed (${res.status}).`)
  return res.json() as Promise<T>
}

const SEARCH_TTL = 60 * 60 * 1000 // 1 hour — symbol metadata is stable
const QUOTE_TTL = 10 * 1000 // 10 seconds — protects bursts without feeling stale
const METRIC_TTL = 60 * 60 * 1000 // 1 hour — fundamentals (52W range, market cap, P/E…) move slowly

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
export function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const q = query.trim()
  if (!q) return Promise.resolve([])

  return cached(`search:${q.toLowerCase()}`, SEARCH_TTL, async () => {
    const data = await finnhub<FinnhubSearchResponse>('/search', { q })
    return (data.result ?? [])
      .filter((r) => r.description && !r.symbol.includes('.') && !r.symbol.includes(':'))
      .slice(0, 12)
      .map((r) => ({
        symbol: r.symbol,
        name: toTitleCase(r.description),
        type: r.type || 'Stock',
      }))
  })
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

/**
 * Fetch a quote for one symbol. `name` is left blank — the client attaches the
 * watchlist display name, which the provider's quote endpoint doesn't carry.
 */
function fetchQuote(symbol: string): Promise<Quote> {
  return cached(`quote:${symbol}`, QUOTE_TTL, async () => {
    const q = await finnhub<FinnhubQuote>('/quote', { symbol })
    return {
      symbol,
      name: '',
      price: q.c ?? 0,
      change: q.d ?? 0,
      changePercent: q.dp ?? 0,
      previousClose: q.pc ?? undefined,
      // Finnhub's free tier has no intraday candles; approximate a tiny trend
      // line from the day's open → high/low → last so the sparkline isn't blank.
      sparkline: buildSparkline(q),
    }
  })
}

/** Fetch quotes for many symbols; a single failure doesn't sink the batch. */
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(symbols.map((s) => fetchQuote(s)))
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
    .map((r) => r.value)
}

/**
 * Rough intraday shape from a single quote (previous close, open, low, high,
 * current). Not a true time series — just a cheap trend cue for a watchlist row
 * (the full candle series comes from Alpaca via `/api/candles`).
 */
function buildSparkline(q: FinnhubQuote): number[] {
  const pts = [q.pc, q.o, q.l, q.h, q.c].filter((n) => typeof n === 'number' && n > 0)
  return pts.length >= 2 ? pts : []
}

// ---- Basic financials (fundamentals) ---------------------------------------

/**
 * The handful of fields we use from Finnhub's `/stock/metric?metric=all`
 * ("Basic Financials"), which returns ~100+ fields under `metric` — free tier,
 * unlike market cap / 52-week range / P/E / dividend yield on Alpaca, which
 * doesn't carry fundamentals at any tier.
 *
 * `marketCapitalization` and the average-volume fields are reported in
 * millions (confirmed against Finnhub's own examples, e.g. `2926914.5` for
 * AAPL's market cap ≈ $2.93T).
 */
interface FinnhubMetrics {
  '52WeekHigh'?: number
  '52WeekLow'?: number
  marketCapitalization?: number
  '3MonthAverageTradingVolume'?: number
  peBasicExclExtraTTM?: number
  dividendYieldIndicatedAnnual?: number
}

interface FinnhubMetricResponse {
  metric?: FinnhubMetrics
}

/** Basic-financials fundamentals for one symbol (52W range, market cap, P/E, dividend yield). */
export function fetchMetrics(symbol: string): Promise<Partial<StockStats>> {
  return cached(`metrics:${symbol}`, METRIC_TTL, async () => {
    const data = await finnhub<FinnhubMetricResponse>('/stock/metric', { symbol, metric: 'all' })
    const m = data.metric ?? {}
    const million = (n: number | undefined) => (typeof n === 'number' ? n * 1_000_000 : undefined)
    return {
      weekHigh52: m['52WeekHigh'],
      weekLow52: m['52WeekLow'],
      marketCap: million(m.marketCapitalization),
      avgVolume3Month: million(m['3MonthAverageTradingVolume']),
      peRatio: m.peBasicExclExtraTTM,
      dividendYield: m.dividendYieldIndicatedAnnual,
    }
  })
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Inc|Corp|Ltd|Plc|Co|Etf|Reit|Sa|Ag|Nv)\b/gi, (m) => m.toUpperCase())
}
