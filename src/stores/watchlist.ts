import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Quote, SymbolSearchResult, WatchlistEntry } from '@/types/market'
import { fetchQuotes } from '@/services/marketData'

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
      (e): e is WatchlistEntry =>
        e && typeof e.symbol === 'string' && typeof e.name === 'string',
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

  const isEmpty = computed(() => entries.value.length === 0)
  const symbols = computed(() => new Set(entries.value.map((e) => e.symbol)))

  function has(symbol: string): boolean {
    return symbols.value.has(symbol)
  }

  /** Fetch quotes for the current entries. */
  async function load() {
    if (entries.value.length === 0) {
      items.value = []
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
    }
  }

  /** Add a symbol from a search result; persists and fetches its quote. */
  async function add(result: SymbolSearchResult): Promise<boolean> {
    if (has(result.symbol)) return false
    const entry: WatchlistEntry = { symbol: result.symbol, name: result.name }
    entries.value = [...entries.value, entry]
    saveEntries(entries.value)
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
    saveEntries(entries.value)
  }

  return { entries, items, loading, error, isEmpty, has, load, add, remove }
})
