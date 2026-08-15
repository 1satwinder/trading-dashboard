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
 * two rows of stats — today's session (Alpaca) and fundamentals (Finnhub,
 * which is the only free provider here that carries them). Rendered full-width
 * above the chart/order-panel grid so it doesn't skew their alignment.
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

    <!-- Today's session (Alpaca) -->
    <div
      class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-surface-200 pt-3 text-sm sm:grid-cols-3 lg:grid-cols-6 dark:border-surface-800"
    >
      <div>
        <div class="text-muted-color">Open</div>
        <div class="tabular-nums text-color">{{ money(stats?.open) }}</div>
      </div>
      <div>
        <div class="text-muted-color">High</div>
        <div class="tabular-nums text-color">{{ money(stats?.high) }}</div>
      </div>
      <div>
        <div class="text-muted-color">Low</div>
        <div class="tabular-nums text-color">{{ money(stats?.low) }}</div>
      </div>
      <div>
        <div class="text-muted-color">Prev Close</div>
        <div class="tabular-nums text-color">{{ money(stats?.previousClose) }}</div>
      </div>
      <div>
        <div class="text-muted-color">Volume</div>
        <div class="tabular-nums text-color">{{ compact(stats?.volume) }}</div>
      </div>
      <div>
        <div class="text-muted-color">Avg Vol (3M)</div>
        <div class="tabular-nums text-color">{{ compact(stats?.avgVolume3Month) }}</div>
      </div>
    </div>

    <!-- Fundamentals (Finnhub) -->
    <div
      class="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-surface-200 pt-3 text-sm dark:border-surface-800"
    >
      <div>
        <div class="text-muted-color">Market Cap</div>
        <div class="tabular-nums text-color">{{ compactMoney(stats?.marketCap) }}</div>
      </div>
      <div>
        <div class="text-muted-color">P/E Ratio</div>
        <div class="tabular-nums text-color">{{ ratio(stats?.peRatio) }}</div>
      </div>
      <div>
        <div class="text-muted-color">Div Yield</div>
        <div class="tabular-nums text-color">{{ percent(stats?.dividendYield) }}</div>
      </div>

      <div class="min-w-48 flex-1">
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
  </div>
</template>
