import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Candle, ChartTimeframeId, StockStats } from '@/types/market'
import { fetchCandles, fetchStockStats } from '@/services/marketData'

const DEFAULT_TIMEFRAME: ChartTimeframeId = '1D'

/**
 * State for the Chart page: the active symbol + timeframe and its candle series.
 * The big price/change is derived from the loaded candles (so it always matches
 * what's drawn, and reflects the selected timeframe's move). The symbol-info
 * header's day stats + fundamentals (`stats`) are fetched separately per
 * symbol — see `SymbolStatsHeader.vue` + ADR-023 — since they're
 * timeframe-independent (today's open/high/low don't change when you switch
 * from 1D to 1Y).
 */
export const useChartStore = defineStore('chart', () => {
  const symbol = ref('')
  const name = ref('')
  const timeframe = ref<ChartTimeframeId>(DEFAULT_TIMEFRAME)
  const candles = ref<Candle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const stats = ref<StockStats | null>(null)
  const statsLoading = ref(false)

  const hasData = computed(() => candles.value.length > 0)
  const first = computed(() => candles.value[0])
  const last = computed(() => candles.value[candles.value.length - 1])

  const lastPrice = computed(() => last.value?.close ?? 0)
  /** Change across the visible range: last close vs first open. */
  const change = computed(() =>
    first.value && last.value ? last.value.close - first.value.open : 0,
  )
  const changePercent = computed(() =>
    first.value?.open ? (change.value / first.value.open) * 100 : 0,
  )

  /** Guards against out-of-order responses from rapid symbol/timeframe changes. */
  let seq = 0
  /** Same guard, kept separate since stats load on a different cadence than candles. */
  let statsSeq = 0

  async function load() {
    if (!symbol.value) return
    const current = ++seq
    loading.value = true
    error.value = null
    try {
      const data = await fetchCandles(symbol.value, timeframe.value)
      if (current !== seq) return
      candles.value = data
    } catch (e) {
      if (current !== seq) return
      error.value = e instanceof Error ? e.message : 'Failed to load chart data'
      candles.value = []
    } finally {
      if (current === seq) loading.value = false
    }
  }

  async function loadStats() {
    if (!symbol.value) return
    const current = ++statsSeq
    const requested = symbol.value
    statsLoading.value = true
    try {
      const data = await fetchStockStats(requested)
      if (current !== statsSeq) return
      stats.value = data
    } catch {
      if (current !== statsSeq) return
      stats.value = null
    } finally {
      if (current === statsSeq) statsLoading.value = false
    }
  }

  /** Point the chart at a symbol (with optional display name) and reload. */
  function setSymbol(next: string, displayName = '') {
    const normalized = next.trim().toUpperCase()
    if (!normalized || normalized === symbol.value) {
      if (displayName) name.value = displayName
      return
    }
    symbol.value = normalized
    name.value = displayName
    stats.value = null
    void load()
    void loadStats()
  }

  function setTimeframe(next: ChartTimeframeId) {
    if (next === timeframe.value) return
    timeframe.value = next
    void load()
  }

  return {
    symbol,
    name,
    timeframe,
    candles,
    loading,
    error,
    stats,
    statsLoading,
    hasData,
    lastPrice,
    change,
    changePercent,
    load,
    loadStats,
    setSymbol,
    setTimeframe,
  }
})
