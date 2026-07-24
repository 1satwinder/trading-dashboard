<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle } from '@/types/market'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ candles: Candle[] }>()

const ui = useUiStore()
const container = ref<HTMLDivElement | null>(null)

let chart: IChartApi | null = null
let candleSeries: ISeriesApi<'Candlestick'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null

/**
 * Chart chrome palette. Trading colors come from the domain tokens
 * (`--color-up` / `--color-down`) so they stay single-source with the design
 * system; neutral chrome (text/grid) is chosen from the active theme.
 */
function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function palette() {
  const up = readToken('--color-up', '#16c784')
  const down = readToken('--color-down', '#ea3943')
  const dark = ui.isDark
  return {
    up,
    down,
    text: dark ? '#94a3b8' : '#64748b',
    grid: dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.14)',
    border: dark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)',
  }
}

function applyTheme() {
  if (!chart) return
  const p = palette()
  chart.applyOptions({
    layout: { background: { color: 'transparent' }, textColor: p.text },
    grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
    rightPriceScale: { borderColor: p.border },
    timeScale: { borderColor: p.border },
  })
  candleSeries?.applyOptions({
    upColor: p.up,
    downColor: p.down,
    borderUpColor: p.up,
    borderDownColor: p.down,
    wickUpColor: p.up,
    wickDownColor: p.down,
  })
}

/** Split candles into the two series' data shapes, coloring volume by direction. */
function setData() {
  if (!candleSeries || !volumeSeries) return
  const p = palette()

  const candleData: CandlestickData<UTCTimestamp>[] = props.candles.map((c) => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }))

  const volumeData: HistogramData<UTCTimestamp>[] = props.candles.map((c) => ({
    time: c.time as UTCTimestamp,
    value: c.volume,
    color: c.close >= c.open ? `${p.up}66` : `${p.down}66`,
  }))

  candleSeries.setData(candleData)
  volumeSeries.setData(volumeData)
  chart?.timeScale().fitContent()
}

onMounted(() => {
  if (!container.value) return

  chart = createChart(container.value, {
    autoSize: true,
    layout: { background: { color: 'transparent' }, textColor: palette().text },
    timeScale: { timeVisible: true, secondsVisible: false },
    rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.25 } },
    crosshair: { mode: 0 },
  })

  candleSeries = chart.addSeries(CandlestickSeries, {})

  // Volume as an overlay histogram pinned to the bottom quarter of the pane.
  volumeSeries = chart.addSeries(HistogramSeries, {
    priceScaleId: 'volume',
    priceFormat: { type: 'volume' },
  })
  chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

  applyTheme()
  setData()
})

onBeforeUnmount(() => {
  chart?.remove()
  chart = null
  candleSeries = null
  volumeSeries = null
})

watch(() => props.candles, setData)
watch(() => ui.isDark, applyTheme)
</script>

<template>
  <div ref="container" class="h-full w-full" />
</template>
