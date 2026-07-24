<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SelectButton from 'primevue/selectbutton'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import PriceTag from '@/components/common/PriceTag.vue'
import PriceChart from '@/components/chart/PriceChart.vue'
import { useChartStore } from '@/stores/chart'
import { useWatchlistStore } from '@/stores/watchlist'
import { CHART_TIMEFRAMES } from '@/services/marketData'
import type { ChartTimeframeId } from '@/types/market'
import { formatCompact, formatCurrency } from '@/utils/format'

const route = useRoute()
const chart = useChartStore()
const watchlist = useWatchlistStore()

const DEFAULT_SYMBOL = 'NVDA'

/** Resolve the symbol to chart from the route, falling back sensibly. */
function resolveSymbol(): string {
  const param = route.params.symbol
  const fromRoute = Array.isArray(param) ? param[0] : param
  if (fromRoute) return fromRoute
  return watchlist.entries[0]?.symbol ?? DEFAULT_SYMBOL
}

/** Prefer the watchlist's display name when we have it. */
function displayName(symbol: string): string {
  return watchlist.entries.find((e) => e.symbol === symbol)?.name ?? ''
}

function syncSymbol() {
  const symbol = resolveSymbol()
  chart.setSymbol(symbol, displayName(symbol))
}

const timeframe = computed<ChartTimeframeId>({
  get: () => chart.timeframe,
  set: (value) => {
    // SelectButton can emit null when the active option is re-clicked.
    if (value) chart.setTimeframe(value)
  },
})

onMounted(syncSymbol)
watch(() => route.params.symbol, syncSymbol)
</script>

<template>
  <section class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
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

        <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span class="text-muted-color">
            Open <span class="tabular-nums text-color">{{ formatCurrency(chart.open) }}</span>
          </span>
          <span class="text-muted-color">
            High <span class="tabular-nums text-color">{{ formatCurrency(chart.high) }}</span>
          </span>
          <span class="text-muted-color">
            Low <span class="tabular-nums text-color">{{ formatCurrency(chart.low) }}</span>
          </span>
          <span class="text-muted-color">
            Vol <span class="tabular-nums text-color">{{ formatCompact(chart.volume) }}</span>
          </span>
        </div>
      </div>

      <SelectButton
        v-model="timeframe"
        :options="CHART_TIMEFRAMES"
        option-label="label"
        option-value="id"
        :allow-empty="false"
        aria-labelledby="chart timeframe"
        size="small"
      />
    </div>

    <!-- Chart card -->
    <div
      class="relative rounded-border border border-surface-200 bg-surface-0 p-2 dark:border-surface-800 dark:bg-surface-900"
    >
      <Message v-if="chart.error" severity="error" :closable="false" class="m-2">
        {{ chart.error }}
      </Message>

      <div v-else class="relative h-[420px] sm:h-[520px]">
        <PriceChart v-if="chart.hasData" :candles="chart.candles" />

        <!-- Loading / empty overlay -->
        <div
          v-if="chart.loading || !chart.hasData"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-color"
        >
          <ProgressSpinner v-if="chart.loading" style="width: 2.5rem; height: 2.5rem" />
          <template v-else>
            <i class="pi pi-chart-line text-3xl" />
            <p class="text-sm">No chart data available.</p>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
