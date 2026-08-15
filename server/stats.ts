import type { StockStats } from '../src/types/market'
import { fetchMetrics } from './finnhub'
import { fetchSnapshots } from './markets'
import { cached } from './cache'

/**
 * Chart-page symbol-info header (ADR-023). Combines two providers, each
 * supplying what the other can't:
 *   - **Alpaca** snapshot → today's open/high/low/previous close/volume (same
 *     source `server/markets.ts` uses for the Markets page).
 *   - **Finnhub** basic financials → 52-week range, market cap, P/E, dividend
 *     yield — fundamentals Alpaca doesn't carry at any tier.
 */

const STATS_TTL = 30 * 1000 // day fields should track the session; Finnhub's own metric cache is longer

export function fetchStockStats(symbol: string): Promise<StockStats> {
  return cached(`stats:${symbol}`, STATS_TTL, async () => {
    const [snapshots, metrics] = await Promise.all([
      fetchSnapshots([symbol]),
      fetchMetrics(symbol).catch(() => ({}) as Partial<StockStats>),
    ])

    const snapshot = snapshots[symbol]
    const daily = snapshot?.dailyBar
    const prevClose = snapshot?.prevDailyBar?.c ?? 0

    return {
      symbol,
      open: daily?.o ?? 0,
      high: daily?.h ?? 0,
      low: daily?.l ?? 0,
      previousClose: prevClose,
      volume: daily?.v ?? 0,
      ...metrics,
    }
  })
}
