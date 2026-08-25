import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Quote, SymbolSearchResult, Trade, WatchlistEntry } from '@/types/market'
import { fetchQuotes } from '@/services/marketData'
import { marketStream, type StreamStatus } from '@/services/marketStream'

/**
 * How often buffered trades are flushed into `items`. Finnhub can push many
 * ticks per second per symbol; coalescing to the latest price on an interval
 * keeps reactivity (and re-renders) cheap without a visible lag.
 */
const FLUSH_INTERVAL_MS = 400

const STORAGE_KEY = 'xtrading-watchlist'

/** Seed a first-time visitor so the page isn't empty on first load. */
const DEFAULT_ENTRIES: WatchlistEntry[] = [
  { symbol: 'AAPL', name: 'Apple Inc' },
  { symbol: 'TSLA', name: 'Tesla Inc' },
  { symbol: 'NVDA', name: 'NVIDIA Corp' },
  { symbol: 'MSFT', name: 'Microsoft Corp' },
  { symbol: 'AMZN', name: 'Amazon.com Inc' },
]

function loadEntries(): WatchlistEntry[] {
  if (typeof window === 'undefined') return [...DEFAULT_ENTRIES]
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === null) return [...DEFAULT_ENTRIES]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is WatchlistEntry => e && typeof e.symbol === 'string' && typeof e.name === 'string',
    )
  } catch {
    return []
  }
}

function saveEntries(entries: WatchlistEntry[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const useWatchlistStore = defineStore('watchlist', () => {
  /** Persisted list of followed symbols (source of truth for membership). */
  const entries = ref<WatchlistEntry[]>(loadEntries())
  /** Live quotes fetched on top of `entries`. */
  const items = ref<Quote[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** True once the first fetch has settled, so refreshes don't show skeletons. */
  const hasLoaded = ref(false)
  const initialLoading = computed(() => loading.value && !hasLoaded.value)

  /** Live connection status of the streaming feed. */
  const streamStatus = ref<StreamStatus>('idle')
  const isLive = computed(() => streamStatus.value === 'open')

  const isEmpty = computed(() => entries.value.length === 0)
  const symbols = computed(() => new Set(entries.value.map((e) => e.symbol)))

  function has(symbol: string): boolean {
    return symbols.value.has(symbol)
  }

  // ---- Streaming ------------------------------------------------------------

  /** Latest un-applied trade per symbol, flushed on an interval. */
  const tradeBuffer = new Map<string, Trade>()
  let flushTimer: ReturnType<typeof setInterval> | null = null
  let stopTrades: (() => void) | null = null
  let stopStatus: (() => void) | null = null

  function bufferTrades(trades: Trade[]) {
    for (const t of trades) {
      if (symbols.value.has(t.symbol)) tradeBuffer.set(t.symbol, t)
    }
  }

  /** Apply buffered prices to `items`, recomputing change vs. previous close. */
  function flushTrades() {
    if (tradeBuffer.size === 0) return
    items.value = items.value.map((q) => {
      const trade = tradeBuffer.get(q.symbol)
      if (!trade) return q
      // Fall back to deriving the prior close if a quote didn't carry one.
      const previousClose = q.previousClose ?? q.price - q.change
      const change = previousClose ? trade.price - previousClose : 0
      const changePercent = previousClose ? (change / previousClose) * 100 : 0
      return { ...q, price: trade.price, change, changePercent, previousClose }
    })
    tradeBuffer.clear()
  }

  /** Push the current watched symbols to the stream (no-op if not connected). */
  function syncStreamSymbols() {
    marketStream.setSymbols(entries.value.map((e) => e.symbol))
  }

  /** Open the live feed for the current watchlist. Safe to call repeatedly. */
  function connect() {
    if (stopStatus === null) {
      stopStatus = marketStream.onStatus((s) => {
        streamStatus.value = s
      })
    }
    if (stopTrades === null) {
      stopTrades = marketStream.onTrades(bufferTrades)
    }
    if (flushTimer === null) {
      flushTimer = setInterval(flushTrades, FLUSH_INTERVAL_MS)
    }
    syncStreamSymbols()
  }

  /** Close the live feed and detach listeners. */
  function disconnect() {
    stopTrades?.()
    stopStatus?.()
    stopTrades = null
    stopStatus = null
    if (flushTimer !== null) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    tradeBuffer.clear()
    marketStream.close()
  }

  /** Fetch quotes for the current entries. */
  async function load() {
    if (entries.value.length === 0) {
      items.value = []
      hasLoaded.value = true
      return
    }
    loading.value = true
    error.value = null
    try {
      items.value = await fetchQuotes(entries.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load watchlist'
    } finally {
      loading.value = false
      hasLoaded.value = true
    }
  }

  /** Add a symbol from a search result; persists and fetches its quote. */
  async function add(result: SymbolSearchResult): Promise<boolean> {
    if (has(result.symbol)) return false
    const entry: WatchlistEntry = { symbol: result.symbol, name: result.name }
    entries.value = [...entries.value, entry]
    saveEntries(entries.value)
    syncStreamSymbols()
    try {
      const [quote] = await fetchQuotes([entry])
      if (quote) items.value = [...items.value, quote]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch quote'
    }
    return true
  }

  /** Remove a symbol; persists and drops its quote. */
  function remove(symbol: string) {
    entries.value = entries.value.filter((e) => e.symbol !== symbol)
    items.value = items.value.filter((q) => q.symbol !== symbol)
    tradeBuffer.delete(symbol)
    saveEntries(entries.value)
    syncStreamSymbols()
  }

  return {
    entries,
    items,
    loading,
    initialLoading,
    error,
    streamStatus,
    isLive,
    isEmpty,
    has,
    load,
    add,
    remove,
    connect,
    disconnect,
  }
})
