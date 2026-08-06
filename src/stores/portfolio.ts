import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  PortfolioHistory,
  PortfolioHistoryRange,
  PortfolioSummary,
  Position,
} from '@/types/market'
import { fetchPortfolioHistory, fetchPortfolioSummary, fetchPositions } from '@/services/marketData'

/** A single allocation slice for the donut chart. */
export interface AllocationSlice {
  label: string
  value: number
  /** Share of the total portfolio value, 0–100. */
  percent: number
  color: string
}

/** Neutral/brand hues for allocation slices (green/red stay reserved for P/L). */
const ALLOCATION_COLORS = ['#4f8cff', '#22d3ee', '#f59e0b', '#a855f7', '#38bdf8', '#ec4899']
const CASH_COLOR = '#64748b'

export const usePortfolioStore = defineStore('portfolio', () => {
  const summary = ref<PortfolioSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const positions = ref<Position[]>([])
  const positionsLoading = ref(false)
  const positionsError = ref<string | null>(null)

  const history = ref<PortfolioHistory | null>(null)
  const historyRange = ref<PortfolioHistoryRange>('1M')
  const historyLoading = ref(false)
  const historyError = ref<string | null>(null)

  /** Load account-level metrics (drives the dashboard stat cards). */
  async function load() {
    loading.value = true
    error.value = null
    try {
      summary.value = await fetchPortfolioSummary()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load portfolio'
    } finally {
      loading.value = false
    }
  }

  /** Load open holdings (drives the Portfolio page holdings table + allocation). */
  async function loadPositions() {
    positionsLoading.value = true
    positionsError.value = null
    try {
      positions.value = await fetchPositions()
    } catch (e) {
      positionsError.value = e instanceof Error ? e.message : 'Failed to load positions'
    } finally {
      positionsLoading.value = false
    }
  }

  /** Load equity-over-time for the performance chart (defaults to the active range). */
  async function loadHistory(range: PortfolioHistoryRange = historyRange.value) {
    historyRange.value = range
    historyLoading.value = true
    historyError.value = null
    try {
      history.value = await fetchPortfolioHistory(range)
    } catch (e) {
      historyError.value = e instanceof Error ? e.message : 'Failed to load performance'
    } finally {
      historyLoading.value = false
    }
  }

  function setHistoryRange(range: PortfolioHistoryRange) {
    if (range === historyRange.value) return
    void loadHistory(range)
  }

  // ---- Derived metrics ------------------------------------------------------

  const holdingsValue = computed(() => positions.value.reduce((sum, p) => sum + p.marketValue, 0))
  const totalCostBasis = computed(() => positions.value.reduce((sum, p) => sum + p.costBasis, 0))
  const totalUnrealizedPl = computed(() =>
    positions.value.reduce((sum, p) => sum + p.unrealizedPl, 0),
  )
  const totalUnrealizedPlPercent = computed(() =>
    totalCostBasis.value > 0 ? (totalUnrealizedPl.value / totalCostBasis.value) * 100 : 0,
  )

  /** Cash = equity not tied up in positions (falls back to 0 if unknown). */
  const cashValue = computed(() =>
    Math.max(0, (summary.value?.totalValue ?? holdingsValue.value) - holdingsValue.value),
  )

  /** Allocation slices (holdings by market value, largest first, plus cash). */
  const allocation = computed<AllocationSlice[]>(() => {
    const total = holdingsValue.value + cashValue.value
    if (total <= 0) return []

    const holdings = [...positions.value]
      .sort((a, b) => b.marketValue - a.marketValue)
      .map((p, i) => ({
        label: p.symbol,
        value: p.marketValue,
        percent: (p.marketValue / total) * 100,
        color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]!,
      }))

    if (cashValue.value > 0) {
      holdings.push({
        label: 'Cash',
        value: cashValue.value,
        percent: (cashValue.value / total) * 100,
        color: CASH_COLOR,
      })
    }
    return holdings
  })

  return {
    summary,
    loading,
    error,
    load,
    positions,
    positionsLoading,
    positionsError,
    loadPositions,
    history,
    historyRange,
    historyLoading,
    historyError,
    loadHistory,
    setHistoryRange,
    holdingsValue,
    totalCostBasis,
    totalUnrealizedPl,
    totalUnrealizedPlPercent,
    cashValue,
    allocation,
  }
})
