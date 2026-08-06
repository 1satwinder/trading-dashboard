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

/**
 * A single open holding, derived from an Alpaca position. Money/quantity fields
 * are numbers (Alpaca returns them as strings; the BFF parses them).
 */
export interface Position {
  symbol: string
  /** Position size; positive for long, negative for short. */
  qty: number
  side: 'long' | 'short'
  /** Average fill price of the position. */
  avgEntryPrice: number
  /** Latest price used for the market value. */
  currentPrice: number
  marketValue: number
  costBasis: number
  /** Total unrealised profit/loss vs cost basis. */
  unrealizedPl: number
  /** Total unrealised P/L as a percentage. */
  unrealizedPlPercent: number
  /** Intraday unrealised P/L (today's move). */
  dayChange: number
  /** Intraday unrealised P/L as a percentage. */
  dayChangePercent: number
}

/** Selectable ranges for the portfolio performance chart. */
export type PortfolioHistoryRange = '1W' | '1M' | '3M' | '1Y' | 'ALL'

/** One equity data point in the portfolio history series (time in epoch seconds). */
export interface PortfolioHistoryPoint {
  time: number
  value: number
}

/**
 * Equity-over-time for the performance chart, derived from Alpaca's portfolio
 * history. `baseValue` is the equity at the start of the range (for total-return).
 */
export interface PortfolioHistory {
  range: PortfolioHistoryRange
  baseValue: number
  points: PortfolioHistoryPoint[]
}

// ---- Orders (Alpaca paper trading — Phase 9) --------------------------------

export type OrderSide = 'buy' | 'sell'

/**
 * Every equity order type Alpaca can report. Orders placed outside this app (e.g.
 * from Alpaca's own dashboard) can use any of these, so responses must allow them.
 */
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'

/** Every time-in-force Alpaca can report on an equity order. */
export type OrderTimeInForce = 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok'

/** The order types our ticket offers (a subset of what Alpaca accepts). */
export type TicketOrderType = 'market' | 'limit' | 'stop'

/** The time-in-force options our ticket offers. */
export type TicketTimeInForce = 'day' | 'gtc'

/** Alpaca's order lifecycle states. */
export type OrderStatus =
  | 'new'
  | 'partially_filled'
  | 'filled'
  | 'done_for_day'
  | 'canceled'
  | 'expired'
  | 'replaced'
  | 'pending_cancel'
  | 'pending_replace'
  | 'accepted'
  | 'pending_new'
  | 'accepted_for_bidding'
  | 'stopped'
  | 'rejected'
  | 'suspended'
  | 'calculated'
  | 'held'

/**
 * Statuses where the order is still working, so it's cancelable and worth
 * polling. Alpaca allows cancels up until filled/canceled/expired.
 */
const OPEN_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'new',
  'partially_filled',
  'accepted',
  'pending_new',
  'accepted_for_bidding',
  'pending_cancel',
  'pending_replace',
  'held',
  'stopped',
  'calculated',
  'done_for_day',
])

/** True while the order is still working (open) rather than in a terminal state. */
export function isOrderOpen(status: OrderStatus): boolean {
  return OPEN_ORDER_STATUSES.has(status)
}

/** An order as returned by the BFF (Alpaca's string numbers already parsed). */
export interface Order {
  id: string
  symbol: string
  side: OrderSide
  type: OrderType
  timeInForce: OrderTimeInForce
  status: OrderStatus
  /** Ordered quantity. */
  qty: number
  /** Quantity filled so far. */
  filledQty: number
  limitPrice?: number
  stopPrice?: number
  /** Average fill price, once (partially) filled. */
  filledAvgPrice?: number
  /** ISO timestamp of submission. */
  submittedAt: string
}

/** Server-side filter for listing orders (Alpaca's `status` query param). */
export type OrderStatusFilter = 'open' | 'closed' | 'all'

/** A new-order ticket sent from the browser to the BFF. */
export interface OrderRequest {
  symbol: string
  side: OrderSide
  type: TicketOrderType
  timeInForce: TicketTimeInForce
  qty: number
  limitPrice?: number
  stopPrice?: number
}

/** A saved watchlist entry (persisted); quotes are fetched on top of these. */
export interface WatchlistEntry {
  symbol: string
  name: string
}

/**
 * A single OHLCV candle. `time` is epoch **seconds** (Lightweight Charts'
 * `UTCTimestamp`), oldest → newest when in a series.
 */
export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/** Candle resolution (bar width) requested from the data source. */
export type ChartResolution = '5m' | '30m' | '1d' | '1w'

/** Range-tab id shown above the chart; each maps to a resolution + bar count. */
export type ChartTimeframeId = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'

/** A chart range preset: a labelled tab bundling its resolution and span. */
export interface ChartTimeframe {
  id: ChartTimeframeId
  label: string
  resolution: ChartResolution
  /** Number of candles to render for this range. */
  bars: number
}

// ---- Markets (Phase 10 — ADR-020) -------------------------------------------

/**
 * Which market the page is showing. `ca` is served by Canadian companies'
 * **US listings** (NYSE dual-listings), not the TSX — no free data source
 * covers the TSX, and US listings stay tradable in the paper account.
 */
export type MarketRegion = 'us' | 'ca'

/**
 * A benchmark card on the Markets page. There is no free source for real index
 * levels, so each one is quoted through a liquid **ETF proxy** — `symbol` is
 * what's actually priced, `name` is the benchmark it stands in for.
 */
export interface MarketIndex {
  /** Benchmark being represented, e.g. `S&P 500`. */
  name: string
  /** The ETF actually quoted, e.g. `SPY`. */
  symbol: string
  region: MarketRegion
  price: number
  change: number
  changePercent: number
  /** Recent hourly closes (oldest → newest) for the inline sparkline. */
  sparkline: number[]
}

/** One row in a gainers / losers / most-active table. */
export interface Mover {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  /** Today's volume; drives the most-active ranking. */
  volume: number
}

/** The three mover lists for one region, fetched together. */
export interface MarketMovers {
  region: MarketRegion
  /**
   * Where the ranking came from: `screener` scans the whole US market, while
   * `universe` ranks a curated list (the only option for Canada). The UI says
   * which, so a curated list never reads as a full-market scan.
   */
  source: 'screener' | 'universe'
  gainers: Mover[]
  losers: Mover[]
  mostActive: Mover[]
}

/** One sector tile in the heatmap. */
export interface SectorPerformance {
  /** Sector name, e.g. `Technology`. */
  name: string
  /** Backing sector ETF, or `''` when the figure is derived from constituents. */
  symbol: string
  changePercent: number
  /** Number of constituents averaged; set only for derived (non-ETF) sectors. */
  memberCount?: number
}

/** US market session state, used for the status pill and to gate polling. */
export interface MarketClock {
  isOpen: boolean
  /** ISO timestamp of the next open. */
  nextOpen: string
  /** ISO timestamp of the next close. */
  nextClose: string
}
