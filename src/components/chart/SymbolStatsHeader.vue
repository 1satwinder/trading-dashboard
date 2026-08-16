<script setup lang="ts">
import { computed } from 'vue'
import PriceTag from '@/components/common/PriceTag.vue'
import { useChartStore } from '@/stores/chart'
import {
  formatCompact,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from '@/utils/format'

/**
 * Symbol-info header for the Chart page (ADR-023): symbol + live price, then
 * a packed row of stat chips — today's session (Alpaca) and fundamentals
 * (Finnhub, the only free provider here that carries them) — plus a 52-week
 * range strip. Chips size to their content instead of stretching across a
 * grid, so they stay close together rather than spreading out on wide
 * screens. Rendered full-width above the chart/order-panel grid so it
 * doesn't skew their alignment.
 */

const chart = useChartStore()
const stats = computed(() => chart.stats)

function money(value: number | undefined): string {
  return typeof value === 'number' && value > 0 ? formatCurrency(value) : '—'
}
function compact(value: number | undefined): string {
  return typeof value === 'number' && value > 0 ? formatCompact(value) : '—'
}
function compactMoney(value: number | undefined): string {
  return typeof value === 'number' && value > 0 ? formatCompactCurrency(value) : '—'
}
function ratio(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(1) : '—'
}
function percent(value: number | undefined): string {
  return typeof value === 'number' ? formatPercent(value) : '—'
}

/** Today's session (Alpaca) + fundamentals (Finnhub), as compact label/value chips. */
const keyStats = computed(() => [
  { label: 'Open', value: money(stats.value?.open) },
  { label: 'High', value: money(stats.value?.high) },
  { label: 'Low', value: money(stats.value?.low) },
  { label: 'Prev Close', value: money(stats.value?.previousClose) },
  { label: 'Volume', value: compact(stats.value?.volume) },
  { label: 'Avg Vol (3M)', value: compact(stats.value?.avgVolume3Month) },
  { label: 'Market Cap', value: compactMoney(stats.value?.marketCap) },
  { label: 'P/E Ratio', value: ratio(stats.value?.peRatio) },
  { label: 'Div Yield', value: percent(stats.value?.dividendYield) },
])

/** Where the current price sits between the 52-week low and high, 0–100. */
const rangePercent = computed(() => {
  const low = stats.value?.weekLow52
  const high = stats.value?.weekHigh52
  if (typeof low !== 'number' || typeof high !== 'number' || high <= low) return null
  const pct = ((chart.lastPrice - low) / (high - low)) * 100
  return Math.min(100, Math.max(0, pct))
})
</script>

<template>
  <div
    class="rounded-border border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
  >
    <!-- Symbol + price -->
    <div class="flex items-baseline gap-2">
      <h1 class="text-2xl font-bold text-color">{{ chart.symbol }}</h1>
      <span v-if="chart.name" class="text-sm text-muted-color">{{ chart.name }}</span>
    </div>

    <div class="mt-1 flex items-center gap-3">
      <span class="text-3xl font-bold tabular-nums text-color">
        {{ formatCurrency(chart.lastPrice) }}
      </span>
      <span class="flex items-center gap-1">
        <PriceTag :value="chart.change" format="currency" show-arrow />
        <PriceTag :value="chart.changePercent" format="percent" class="text-muted-color" />
      </span>
    </div>

    <!-- Key stats: today's session (Alpaca) + fundamentals (Finnhub), packed left -->
    <div
      class="mt-3 flex flex-wrap gap-x-6 gap-y-3 border-t border-surface-200 pt-3 text-sm dark:border-surface-800"
    >
      <div v-for="stat in keyStats" :key="stat.label" class="min-w-[5.5rem]">
        <div class="text-muted-color">{{ stat.label }}</div>
        <div class="tabular-nums text-color">{{ stat.value }}</div>
      </div>
    </div>

    <!-- 52-week range -->
    <div class="mt-3 border-t border-surface-200 pt-3 text-sm dark:border-surface-800">
      <div class="flex items-center justify-between text-muted-color">
        <span>52W Range</span>
        <span class="tabular-nums">
          {{ money(stats?.weekLow52) }} – {{ money(stats?.weekHigh52) }}
        </span>
      </div>
      <div class="relative mt-2 h-1.5 rounded-full bg-surface-100 dark:bg-surface-800">
        <div
          v-if="rangePercent !== null"
          class="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-0 bg-primary dark:border-surface-900"
          :style="{ left: `${rangePercent}%` }"
        />
      </div>
    </div>
  </div>
</template>
