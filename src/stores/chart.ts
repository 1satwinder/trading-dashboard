import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Candle, ChartTimeframeId } from '@/types/market'
import { fetchCandles } from '@/services/marketData'

const DEFAULT_TIMEFRAME: ChartTimeframeId = '1D'

/**
 * State for the Chart page: the active symbol + timeframe and its candle series.
 * Header stats (last price, change, OHLC, volume) are derived from the loaded
 * candles so the numbers always match what's drawn.
 */
export const useChartStore = defineStore('chart', () => {
  const symbol = ref('')
  const name = ref('')
  const timeframe = ref<ChartTimeframeId>(DEFAULT_TIMEFRAME)
  const candles = ref<Candle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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
  const open = computed(() => first.value?.open ?? 0)
  const high = computed(() =>
    candles.value.length ? Math.max(...candles.value.map((c) => c.high)) : 0,
  )
  const low = computed(() =>
    candles.value.length ? Math.min(...candles.value.map((c) => c.low)) : 0,
  )
  const volume = computed(() => candles.value.reduce((sum, c) => sum + c.volume, 0))

  /** Guards against out-of-order responses from rapid symbol/timeframe changes. */
  let seq = 0

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

  /** Point the chart at a symbol (with optional display name) and reload. */
  function setSymbol(next: string, displayName = '') {
    const normalized = next.trim().toUpperCase()
    if (!normalized || normalized === symbol.value) {
      if (displayName) name.value = displayName
      return
    }
    symbol.value = normalized
    name.value = displayName
    void load()
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
    hasData,
    lastPrice,
    change,
    changePercent,
    open,
    high,
    low,
    volume,
    load,
    setSymbol,
    setTimeframe,
  }
})
