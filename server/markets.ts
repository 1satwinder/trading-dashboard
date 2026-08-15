import type {
  MarketClock,
  MarketIndex,
  MarketMovers,
  MarketRegion,
  Mover,
  SectorPerformance,
} from '../src/types/market'
import { ALPACA_DATA_URL, ALPACA_TRADING_URL, alpacaRequest, num } from './alpacaClient'
import { cached } from './cache'

/**
 * Markets page data (Phase 10 — ADR-020). Alpaca only: Finnhub's free tier is
 * US-only and has no screener.
 *
 * Two things have no free data source, so both are approximated deliberately:
 *   - **Index levels** (`^GSPC` & co are premium) → quoted via liquid **ETF proxies**.
 *   - **The TSX** (Canadian data is a paid Finnhub add-on) → Canadian companies'
 *     **US listings**, which keeps every row tradable in the paper account.
 *
 * Everything is batched: one `snapshots` call prices a whole list, so a region's
 * movers and sector heatmap share a single upstream request.
 */

const DAY_MS = 24 * 60 * 60 * 1000

const CLOCK_TTL = 30 * 1000 // `is_open` flips at 09:30 / 16:00
const INDICES_TTL = 30 * 1000
const MOVERS_TTL = 60 * 1000
const SECTORS_TTL = 60 * 1000
const ASSET_TTL = 24 * 60 * 60 * 1000 // names/listings are static

// ---- Curated symbol tables --------------------------------------------------

interface IndexProxy {
  name: string
  symbol: string
  region: MarketRegion
}

/** Benchmarks shown as cards, each quoted through its tracking ETF. */
const INDEX_PROXIES: readonly IndexProxy[] = [
  { name: 'S&P 500', symbol: 'SPY', region: 'us' },
  { name: 'Nasdaq 100', symbol: 'QQQ', region: 'us' },
  { name: 'Dow 30', symbol: 'DIA', region: 'us' },
  { name: 'Russell 2000', symbol: 'IWM', region: 'us' },
  { name: 'Canada', symbol: 'EWC', region: 'ca' },
]

/** The 11 GICS sectors, via the SPDR Select Sector ETFs. */
const SECTOR_ETFS: readonly { name: string; symbol: string }[] = [
  { name: 'Technology', symbol: 'XLK' },
  { name: 'Financials', symbol: 'XLF' },
  { name: 'Health Care', symbol: 'XLV' },
  { name: 'Consumer Discretionary', symbol: 'XLY' },
  { name: 'Consumer Staples', symbol: 'XLP' },
  { name: 'Energy', symbol: 'XLE' },
  { name: 'Industrials', symbol: 'XLI' },
  { name: 'Materials', symbol: 'XLB' },
  { name: 'Real Estate', symbol: 'XLRE' },
  { name: 'Utilities', symbol: 'XLU' },
  { name: 'Communication Services', symbol: 'XLC' },
]

/**
 * Canadian large caps, by their **NYSE** listing. Names are hardcoded so this
 * list costs zero asset lookups, and the sector tag doubles as the source for
 * the Canadian heatmap (no extra upstream call).
 */
const CA_UNIVERSE: readonly { symbol: string; name: string; sector: string }[] = [
  { symbol: 'RY', name: 'Royal Bank of Canada', sector: 'Financials' },
  { symbol: 'TD', name: 'Toronto-Dominion Bank', sector: 'Financials' },
  { symbol: 'BNS', name: 'Bank of Nova Scotia', sector: 'Financials' },
  { symbol: 'BMO', name: 'Bank of Montreal', sector: 'Financials' },
  { symbol: 'CM', name: 'Canadian Imperial Bank of Commerce', sector: 'Financials' },
  { symbol: 'MFC', name: 'Manulife Financial', sector: 'Financials' },
  { symbol: 'SLF', name: 'Sun Life Financial', sector: 'Financials' },
  { symbol: 'BN', name: 'Brookfield Corporation', sector: 'Financials' },
  { symbol: 'ENB', name: 'Enbridge', sector: 'Energy' },
  { symbol: 'TRP', name: 'TC Energy', sector: 'Energy' },
  { symbol: 'CNQ', name: 'Canadian Natural Resources', sector: 'Energy' },
  { symbol: 'SU', name: 'Suncor Energy', sector: 'Energy' },
  { symbol: 'IMO', name: 'Imperial Oil', sector: 'Energy' },
  { symbol: 'PBA', name: 'Pembina Pipeline', sector: 'Energy' },
  { symbol: 'AEM', name: 'Agnico Eagle Mines', sector: 'Materials' },
  { symbol: 'WPM', name: 'Wheaton Precious Metals', sector: 'Materials' },
  { symbol: 'NTR', name: 'Nutrien', sector: 'Materials' },
  { symbol: 'FNV', name: 'Franco-Nevada', sector: 'Materials' },
  { symbol: 'TECK', name: 'Teck Resources', sector: 'Materials' },
  { symbol: 'CNI', name: 'Canadian National Railway', sector: 'Industrials' },
  { symbol: 'CP', name: 'Canadian Pacific Kansas City', sector: 'Industrials' },
  { symbol: 'WCN', name: 'Waste Connections', sector: 'Industrials' },
  { symbol: 'SHOP', name: 'Shopify', sector: 'Technology' },
  { symbol: 'OTEX', name: 'Open Text', sector: 'Technology' },
  { symbol: 'BCE', name: 'BCE Inc', sector: 'Communication Services' },
  { symbol: 'RCI', name: 'Rogers Communications', sector: 'Communication Services' },
  { symbol: 'QSR', name: 'Restaurant Brands International', sector: 'Consumer Discretionary' },
  { symbol: 'MG', name: 'Magna International', sector: 'Consumer Discretionary' },
]

/** How many rows each mover table shows. */
const MOVER_ROWS = 8

// ---- Snapshots --------------------------------------------------------------

export interface AlpacaSnapshotBar {
  c: number
  h: number
  l: number
  o: number
  v: number
  t: string
}

export interface AlpacaSnapshot {
  dailyBar?: AlpacaSnapshotBar
  prevDailyBar?: AlpacaSnapshotBar
  latestTrade?: { p: number }
}

export type SnapshotMap = Record<string, AlpacaSnapshot | undefined>

/** Price + day change for one symbol, in one batched call per list. */
interface SnapshotStats {
  price: number
  change: number
  changePercent: number
  volume: number
}

/**
 * Derive the day's move from a snapshot.
 *
 * `prevDailyBar` is the consolidated previous close (same on every plan), while
 * `dailyBar` is IEX-only intraday, so the price can lag the consolidated tape
 * slightly — the same trade-off the chart already makes (ADR-016). Before the
 * first IEX print of a session there's no `dailyBar`, hence the fallbacks.
 */
function fromSnapshot(snapshot: AlpacaSnapshot | undefined): SnapshotStats {
  const prev = snapshot?.prevDailyBar?.c ?? 0
  const price = snapshot?.dailyBar?.c ?? snapshot?.latestTrade?.p ?? prev
  const change = prev > 0 ? price - prev : 0
  return {
    price,
    change,
    changePercent: prev > 0 ? (change / prev) * 100 : 0,
    volume: snapshot?.dailyBar?.v ?? 0,
  }
}

/** Fetch snapshots for many symbols in a single call. Shared with `server/stats.ts`. */
export async function fetchSnapshots(symbols: readonly string[]): Promise<SnapshotMap> {
  if (symbols.length === 0) return {}
  const url = new URL(`${ALPACA_DATA_URL}/v2/stocks/snapshots`)
  url.searchParams.set('symbols', symbols.join(','))
  url.searchParams.set('feed', 'iex')
  return alpacaRequest<SnapshotMap>(url)
}

// ---- Market clock -----------------------------------------------------------

interface AlpacaClock {
  is_open: boolean
  next_open: string
  next_close: string
}

/** Current US session state — drives the status pill and gates polling. */
export function fetchClock(): Promise<MarketClock> {
  return cached('markets:clock', CLOCK_TTL, async () => {
    const clock = await alpacaRequest<AlpacaClock>(`${ALPACA_TRADING_URL}/v2/clock`)
    return {
      isOpen: Boolean(clock.is_open),
      nextOpen: clock.next_open ?? '',
      nextClose: clock.next_close ?? '',
    }
  })
}

// ---- Index cards ------------------------------------------------------------

interface AlpacaMultiBarsResponse {
  bars?: Record<string, { c: number }[] | undefined>
}

/**
 * Price the benchmark ETFs and attach a short sparkline: one `snapshots` call
 * for the numbers plus one multi-symbol `bars` call for the trend line.
 */
export function fetchIndices(): Promise<MarketIndex[]> {
  return cached('markets:indices', INDICES_TTL, async () => {
    const symbols = INDEX_PROXIES.map((proxy) => proxy.symbol)

    const barsUrl = new URL(`${ALPACA_DATA_URL}/v2/stocks/bars`)
    barsUrl.searchParams.set('symbols', symbols.join(','))
    barsUrl.searchParams.set('timeframe', '1Hour')
    barsUrl.searchParams.set('feed', 'iex')
    barsUrl.searchParams.set('start', new Date(Date.now() - 6 * DAY_MS).toISOString())
    barsUrl.searchParams.set('limit', '10000')

    const [snapshots, barsResponse] = await Promise.all([
      fetchSnapshots(symbols),
      alpacaRequest<AlpacaMultiBarsResponse>(barsUrl),
    ])

    return INDEX_PROXIES.map((proxy) => {
      const { price, change, changePercent } = fromSnapshot(snapshots[proxy.symbol])
      return {
        name: proxy.name,
        symbol: proxy.symbol,
        region: proxy.region,
        price,
        change,
        changePercent,
        sparkline: (barsResponse.bars?.[proxy.symbol] ?? []).map((bar) => bar.c),
      }
    })
  })
}

// ---- Movers -----------------------------------------------------------------

/*
 * Alpaca's screener ranks the raw tape, which on any given day is topped by
 * warrants, rights and sub-dollar tickers (live samples: `ATTO +4544%`,
 * `MUA.RT` at $0.004, `FTHAW` at $0.63). None of that belongs on the page, so
 * we over-fetch and filter down to ordinary, tradable common stock.
 */

const MIN_MOVER_PRICE = 5 // drops sub-dollar tickers
const MAX_MOVER_PERCENT = 100 // a >100% day is ~always a reverse split, not a move
const SCREENER_FETCH = 50 // the screener's maximum — over-fetch so filtering still fills a table
const NON_COMMON = /\b(warrant|rights?|units?|preferred|depositary)\b/i
const ALLOWED_EXCHANGES: ReadonlySet<string> = new Set(['NYSE', 'NASDAQ', 'ARCA', 'AMEX', 'BATS'])

/**
 * Geared products ("Direxion Daily TSLA Bull 2X ETF", "ProShares UltraPro QQQ")
 * would otherwise dominate every list — a 2x fund mechanically out-moves
 * whatever it tracks, so the board fills with derivatives of the same handful
 * of stocks.
 *
 * A name must look like *both* a fund and a geared one to be dropped, which
 * keeps operating companies whose names happen to contain a trigger word
 * ("Ultra Clean Holdings", "Bear Creek Mining"). Plain 1x funds such as
 * "ProShares Bitcoin ETF" stay — they're ordinary instruments.
 */
const FUND_NAME = /\b(etf|etn|fund|trust|proshares)\b/i
const GEARED = /\b(\d+x|ultra(pro|short)?|bull|bear|inverse|leveraged)\b/i

interface AlpacaAsset {
  symbol: string
  name: string
  exchange: string
  tradable: boolean
}

/**
 * Look up a symbol's listing metadata, cached for a day. Used to name screener
 * hits (the screener returns symbols only) and to weed out anything that isn't
 * ordinary tradable stock.
 */
function assetInfo(symbol: string): Promise<AlpacaAsset> {
  return cached(`asset:${symbol}`, ASSET_TTL, () =>
    alpacaRequest<AlpacaAsset>(
      `${ALPACA_TRADING_URL}/v2/assets/${encodeURIComponent(symbol)}`,
    ),
  )
}

/**
 * Resolve names for screener symbols, dropping anything that isn't ordinary
 * tradable stock. Lookups run in parallel and failures drop that one symbol
 * rather than the whole table (as `fetchQuotes` does for quotes).
 */
async function namedCommonStock(symbols: readonly string[]): Promise<Map<string, string>> {
  const results = await Promise.allSettled(symbols.map((symbol) => assetInfo(symbol)))
  const names = new Map<string, string>()

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const asset = result.value
    if (!asset?.tradable) continue
    if (!ALLOWED_EXCHANGES.has(asset.exchange)) continue

    const name = asset.name ?? ''
    if (NON_COMMON.test(name)) continue
    if (FUND_NAME.test(name) && GEARED.test(name)) continue

    names.set(asset.symbol, name)
  }

  return names
}

interface ScreenerMover {
  symbol: string
  price: number
  change: number
  percent_change: number
}

interface ScreenerMoversResponse {
  gainers?: ScreenerMover[]
  losers?: ScreenerMover[]
}

interface ScreenerMostActive {
  symbol: string
  volume: number
}

interface ScreenerMostActivesResponse {
  most_actives?: ScreenerMostActive[]
}

/** Plausible as a headline mover: real price, believable move. */
function isPlausible(price: number, percentChange: number): boolean {
  return price >= MIN_MOVER_PRICE && Math.abs(percentChange) <= MAX_MOVER_PERCENT
}

/** Rank the whole US tape via Alpaca's screener, filtered down to real names. */
async function fetchUsMovers(): Promise<MarketMovers> {
  const [moversResponse, activesResponse] = await Promise.all([
    alpacaRequest<ScreenerMoversResponse>(
      `${ALPACA_DATA_URL}/v1beta1/screener/stocks/movers?top=${SCREENER_FETCH}`,
    ),
    alpacaRequest<ScreenerMostActivesResponse>(
      `${ALPACA_DATA_URL}/v1beta1/screener/stocks/most-actives?top=${SCREENER_FETCH}`,
    ),
  ])

  const rawGainers = (moversResponse.gainers ?? []).filter((m) =>
    isPlausible(num(m.price), num(m.percent_change)),
  )
  const rawLosers = (moversResponse.losers ?? []).filter((m) =>
    isPlausible(num(m.price), num(m.percent_change)),
  )
  const rawActives = activesResponse.most_actives ?? []

  const names = await namedCommonStock([
    ...new Set([
      ...rawGainers.map((m) => m.symbol),
      ...rawLosers.map((m) => m.symbol),
      ...rawActives.map((m) => m.symbol),
    ]),
  ])

  const toMover = (m: ScreenerMover): Mover => ({
    symbol: m.symbol,
    name: names.get(m.symbol) ?? m.symbol,
    price: num(m.price),
    change: num(m.change),
    changePercent: num(m.percent_change),
    volume: 0,
  })

  const survivingActives = rawActives.filter((m) => names.has(m.symbol)).slice(0, MOVER_ROWS * 2)

  // The most-actives screener reports volume only, so price its survivors.
  const activeSnapshots = await fetchSnapshots(survivingActives.map((m) => m.symbol))
  const mostActive = survivingActives
    .map((active) => {
      const stats = fromSnapshot(activeSnapshots[active.symbol])
      return {
        symbol: active.symbol,
        name: names.get(active.symbol) ?? active.symbol,
        price: stats.price,
        change: stats.change,
        changePercent: stats.changePercent,
        volume: num(active.volume),
      }
    })
    .filter((m) => m.price >= MIN_MOVER_PRICE)
    .slice(0, MOVER_ROWS)

  return {
    region: 'us',
    source: 'screener',
    gainers: rawGainers
      .filter((m) => names.has(m.symbol))
      .slice(0, MOVER_ROWS)
      .map(toMover),
    losers: rawLosers
      .filter((m) => names.has(m.symbol))
      .slice(0, MOVER_ROWS)
      .map(toMover),
    mostActive,
  }
}

/** Snapshot the Canadian universe once and cache it for movers + sectors. */
function fetchCanadianSnapshots(): Promise<SnapshotMap> {
  return cached('markets:ca-snapshots', MOVERS_TTL, () =>
    fetchSnapshots(CA_UNIVERSE.map((entry) => entry.symbol)),
  )
}

/**
 * Rank the curated Canadian universe. There's no screener for it (and no free
 * TSX feed at all), so gainers/losers are just the ends of this list — which is
 * why the response is flagged `source: 'universe'`.
 */
async function fetchCanadianMovers(): Promise<MarketMovers> {
  const snapshots = await fetchCanadianSnapshots()

  const rows: Mover[] = CA_UNIVERSE.map((entry) => ({
    symbol: entry.symbol,
    name: entry.name,
    ...fromSnapshot(snapshots[entry.symbol]),
  })).filter((row) => row.price > 0)

  const byChange = [...rows].sort((a, b) => b.changePercent - a.changePercent)

  return {
    region: 'ca',
    source: 'universe',
    gainers: byChange.filter((row) => row.changePercent > 0).slice(0, MOVER_ROWS),
    losers: byChange
      .filter((row) => row.changePercent < 0)
      .slice(-MOVER_ROWS)
      .reverse(),
    mostActive: [...rows].sort((a, b) => b.volume - a.volume).slice(0, MOVER_ROWS),
  }
}

/** Gainers, losers and most-active for a region. */
export function fetchMovers(region: MarketRegion): Promise<MarketMovers> {
  return cached(`markets:movers:${region}`, MOVERS_TTL, () =>
    region === 'ca' ? fetchCanadianMovers() : fetchUsMovers(),
  )
}

// ---- Sectors ----------------------------------------------------------------

/**
 * Sector performance for the heatmap. US sectors come from the SPDR sector
 * ETFs; Canada has no sector ETFs on a US listing, so those tiles are the
 * equal-weighted mean of the curated universe's constituents — reusing the
 * snapshot the movers table already cached.
 */
export function fetchSectors(region: MarketRegion): Promise<SectorPerformance[]> {
  return cached(`markets:sectors:${region}`, SECTORS_TTL, async () => {
    if (region === 'ca') {
      const snapshots = await fetchCanadianSnapshots()
      const groups = new Map<string, number[]>()

      for (const entry of CA_UNIVERSE) {
        const stats = fromSnapshot(snapshots[entry.symbol])
        if (stats.price <= 0) continue
        const bucket = groups.get(entry.sector) ?? []
        bucket.push(stats.changePercent)
        groups.set(entry.sector, bucket)
      }

      return [...groups.entries()]
        .map(([name, changes]) => ({
          name,
          symbol: '',
          changePercent: changes.reduce((sum, c) => sum + c, 0) / changes.length,
          memberCount: changes.length,
        }))
        .sort((a, b) => b.changePercent - a.changePercent)
    }

    const snapshots = await fetchSnapshots(SECTOR_ETFS.map((sector) => sector.symbol))
    return SECTOR_ETFS.map((sector) => ({
      name: sector.name,
      symbol: sector.symbol,
      changePercent: fromSnapshot(snapshots[sector.symbol]).changePercent,
    })).sort((a, b) => b.changePercent - a.changePercent)
  })
}
