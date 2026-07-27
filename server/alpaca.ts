import type { Candle, ChartTimeframeId } from '../src/types/market'
import { ProviderError } from './errors'
import { cached } from './cache'

/**
 * Server-side Alpaca market-data client — the candle provider for the BFF.
 *
 * Fetches real OHLCV bars from Alpaca's free **IEX** feed
 * (`GET /v2/stocks/{symbol}/bars`) and maps them into the app's `Candle` shape.
 * Keys live only here (server-side); the browser only ever sees `/api/candles`.
 * Replaces the old client-side synthetic candle generator (see ADR-016).
 */

const ALPACA_DATA_URL = process.env.ALPACA_DATA_URL ?? 'https://data.alpaca.markets'

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

function credentials(): { keyId: string; secretKey: string } {
  const keyId = process.env.ALPACA_API_KEY_ID
  const secretKey = process.env.ALPACA_API_SECRET_KEY
  if (!keyId || !secretKey) {
    throw new ProviderError(
      500,
      'Server is missing ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY (see .env.example).',
    )
  }
  return { keyId, secretKey }
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
    const { keyId, secretKey } = credentials()

    const url = new URL(`${ALPACA_DATA_URL}/v2/stocks/${encodeURIComponent(symbol)}/bars`)
    url.searchParams.set('timeframe', spec.timeframe)
    url.searchParams.set('feed', 'iex')
    url.searchParams.set('adjustment', 'split')
    url.searchParams.set('sort', 'desc')
    url.searchParams.set('limit', String(spec.limit))
    url.searchParams.set('start', new Date(Date.now() - spec.lookbackMs).toISOString())

    let res: Response
    try {
      res = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': keyId,
          'APCA-API-SECRET-KEY': secretKey,
        },
      })
    } catch {
      throw new ProviderError(502, 'Upstream network error contacting Alpaca.')
    }

    if (res.status === 429) throw new ProviderError(429, 'Alpaca rate limit reached.')
    if (res.status === 401 || res.status === 403) {
      throw new ProviderError(502, 'Alpaca rejected the request — check ALPACA API credentials.')
    }
    if (!res.ok) throw new ProviderError(502, `Alpaca request failed (${res.status}).`)

    const data = (await res.json()) as AlpacaBarsResponse
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
