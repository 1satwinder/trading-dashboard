/** A price quote for a single symbol, plus a short sparkline history. */
export interface Quote {
  symbol: string
  name: string
  price: number
  /** Absolute change vs previous close. */
  change: number
  /** Percentage change vs previous close. */
  changePercent: number
  /** Recent prices (oldest → newest) for an inline sparkline. */
  sparkline: number[]
}

/** High-level portfolio metrics shown in the dashboard stat cards. */
export interface PortfolioSummary {
  totalValue: number
  buyingPower: number
  dayChange: number
  dayChangePercent: number
}
