<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import PriceChart, { type ChartType } from '@/components/chart/PriceChart.vue'
import OrderPanel from '@/components/chart/OrderPanel.vue'
import SymbolStatsHeader from '@/components/chart/SymbolStatsHeader.vue'
import { useChartStore } from '@/stores/chart'
import { useWatchlistStore } from '@/stores/watchlist'
import { CHART_TIMEFRAMES } from '@/services/marketData'
import type { ChartTimeframeId } from '@/types/market'

const route = useRoute()
const chart = useChartStore()
const watchlist = useWatchlistStore()

const DEFAULT_SYMBOL = 'NVDA'

function resolveSymbol(): string {
  const param = route.params.symbol
  const fromRoute = Array.isArray(param) ? param[0] : param
  if (fromRoute) return fromRoute
  return watchlist.entries[0]?.symbol ?? DEFAULT_SYMBOL
}

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
    if (value) chart.setTimeframe(value)
  },
})

// ---- Toolbar: chart type, indicators, fullscreen --------------------------

const chartType = ref<ChartType>('candlestick')
const chartTypeOptions: { value: ChartType; icon: string; label: string }[] = [
  { value: 'candlestick', icon: 'pi pi-chart-bar', label: 'Candlestick' },
  { value: 'line', icon: 'pi pi-chart-line', label: 'Line' },
  { value: 'area', icon: 'pi pi-chart-scatter', label: 'Area' },
]

const sma20 = ref(false)
const sma50 = ref(false)
const activeSmas = computed(() => {
  const list: number[] = []
  if (sma20.value) list.push(20)
  if (sma50.value) list.push(50)
  return list
})
const indicatorCount = computed(() => activeSmas.value.length)

const indicatorsPopover = ref<InstanceType<typeof Popover> | null>(null)
function toggleIndicators(event: Event) {
  indicatorsPopover.value?.toggle(event)
}

const cardEl = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void cardEl.value?.requestFullscreen()
  }
}

function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === cardEl.value
}

onMounted(() => {
  syncSymbol()
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
watch(() => route.params.symbol, syncSymbol)
</script>

<template>
  <section class="space-y-4">
    <!-- Header: symbol, price, day stats + fundamentals -->
    <SymbolStatsHeader />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <!-- Left: chart -->
      <div class="min-w-0">
        <!-- Chart card -->
        <div
          ref="cardEl"
          class="flex flex-col rounded-border border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
          :class="isFullscreen ? 'h-screen' : ''"
        >
          <!-- Toolbar -->
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-b border-surface-200 px-2 py-2 dark:border-surface-800"
          >
            <SelectButton
              v-model="timeframe"
              :options="CHART_TIMEFRAMES"
              option-label="label"
              option-value="id"
              :allow-empty="false"
              aria-label="Timeframe"
              size="small"
            />

            <div class="flex items-center gap-1">
              <SelectButton
                v-model="chartType"
                :options="chartTypeOptions"
                option-value="value"
                data-key="value"
                :allow-empty="false"
                aria-label="Chart type"
                size="small"
              >
                <template #option="{ option }">
                  <i :class="option.icon" :title="option.label" />
                </template>
              </SelectButton>

              <Button
                type="button"
                icon="pi pi-sliders-h"
                text
                rounded
                severity="secondary"
                size="small"
                :badge="indicatorCount ? String(indicatorCount) : undefined"
                aria-label="Indicators"
                title="Indicators"
                @click="toggleIndicators"
              />

              <Button
                type="button"
                :icon="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
                text
                rounded
                severity="secondary"
                size="small"
                :aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
                :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
                @click="toggleFullscreen"
              />
            </div>
          </div>

          <Popover ref="indicatorsPopover">
            <div class="flex flex-col gap-3 p-1">
              <span class="text-sm font-semibold text-color">Indicators</span>
              <label class="flex items-center gap-2 text-sm text-color">
                <Checkbox v-model="sma20" binary />
                <span class="inline-flex items-center gap-2">
                  <span class="inline-block h-0.5 w-4" style="background-color: #f59e0b" />
                  SMA 20
                </span>
              </label>
              <label class="flex items-center gap-2 text-sm text-color">
                <Checkbox v-model="sma50" binary />
                <span class="inline-flex items-center gap-2">
                  <span class="inline-block h-0.5 w-4" style="background-color: #a855f7" />
                  SMA 50
                </span>
              </label>
            </div>
          </Popover>

          <!-- Chart area -->
          <div
            class="relative p-2"
            :class="isFullscreen ? 'min-h-0 flex-1' : 'h-[420px] sm:h-[520px]'"
          >
            <Message v-if="chart.error" severity="error" :closable="false" class="m-2">
              {{ chart.error }}
            </Message>

            <template v-else>
              <PriceChart
                v-if="chart.hasData"
                :candles="chart.candles"
                :chart-type="chartType"
                :smas="activeSmas"
              />

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
            </template>
          </div>
        </div>
      </div>

      <!-- Right: order panel -->
      <OrderPanel :symbol="chart.symbol" :price="chart.lastPrice" />
    </div>
  </section>
</template>
