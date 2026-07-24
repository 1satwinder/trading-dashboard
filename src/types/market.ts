/** A price quote for a single symbol, plus an optional sparkline history. */
export interface Quote {
  symbol: string
  name: string
  price: number
  /** Absolute change vs previous close. */
  change: number
  /** Percentage change vs previous close. */
  changePercent: number
  /**
   * Previous session's close. Kept so streaming trades (which carry only a
   * last price) can recompute `change` / `changePercent` on the client.
   */
  previousClose?: number
  /**
   * Recent prices (oldest → newest) for an inline sparkline.
   * Optional: intraday candles aren't on Finnhub's free tier, so live quotes
   * may omit this.
   */
  sparkline?: number[]
}

/** A single real-time trade tick from the streaming feed. */
export interface Trade {
  symbol: string
  /** Last traded price. */
  price: number
  /** Epoch milliseconds of the trade. */
  timestamp: number
}

/** A symbol returned by the provider's search endpoint. */
export interface SymbolSearchResult {
  /** Canonical symbol used for quote lookups (e.g. `AAPL`). */
  symbol: string
  /** Company / instrument name (e.g. `Apple Inc`). */
  name: string
  /** Instrument type (e.g. `Common Stock`, `ETF`). */
  type: string
}

/** High-level portfolio metrics shown in the dashboard stat cards. */
export interface PortfolioSummary {
  totalValue: number
  buyingPower: number
  dayChange: number
  dayChangePercent: number
}

/** A saved watchlist entry (persisted); quotes are fetched on top of these. */
export interface WatchlistEntry {
  symbol: string
  name: string
}
