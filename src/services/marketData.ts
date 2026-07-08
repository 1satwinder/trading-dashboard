import type { PortfolioSummary, Quote } from '@/types/market'

/**
 * Mock market-data service.
 *
 * This is the single data-access boundary (see docs/04-architecture.md). Views
 * go through Pinia stores, which call these functions. Swapping to a real API
 * later means changing only this file — nothing in the stores or components.
 */

const WATCHLIST: Quote[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.42,
    change: 2.24,
    changePercent: 1.2,
    sparkline: [185, 184.5, 186, 185.8, 187, 186.5, 188, 187.6, 188.9, 189.42],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 242.1,
    change: -1.95,
    changePercent: -0.8,
    sparkline: [246, 245, 245.5, 244, 243.2, 243.8, 242.9, 242.5, 242.1],
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 880.15,
    change: 28.98,
    changePercent: 3.4,
    sparkline: [851, 855, 853, 860, 858, 866, 870, 872, 878, 880.15],
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 415.2,
    change: 2.06,
    changePercent: 0.5,
    sparkline: [413, 413.5, 412.8, 414, 413.6, 414.5, 415, 415.2],
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    price: 178.3,
    change: -1.98,
    changePercent: -1.1,
    sparkline: [180.5, 180, 179.6, 179, 179.3, 178.8, 178.5, 178.3],
  },
]

const PORTFOLIO_SUMMARY: PortfolioSummary = {
  totalValue: 48250.3,
  buyingPower: 12400,
  dayChange: 1120,
  dayChangePercent: 2.4,
}

/** Simulate network latency so loading states are exercised. */
function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

export function fetchWatchlist(): Promise<Quote[]> {
  return withLatency(WATCHLIST)
}

export function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  return withLatency(PORTFOLIO_SUMMARY)
}
