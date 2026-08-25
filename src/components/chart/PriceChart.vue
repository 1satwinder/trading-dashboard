<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { ref } from 'vue'
import {
  AreaSeries,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  type AreaData,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle } from '@/types/market'
import { useUiStore } from '@/stores/ui'

export type ChartType = 'candlestick' | 'line' | 'area'

const props = withDefaults(
  defineProps<{
    candles: Candle[]
    chartType?: ChartType
    /** Simple-moving-average periods to overlay, e.g. [20, 50]. */
    smas?: number[]
    /**
     * Sentence describing the series. `lightweight-charts` draws to a canvas, so
     * without this the chart is invisible to assistive tech.
     */
    ariaLabel?: string
  }>(),
  { chartType: 'candlestick', smas: () => [] },
)

const ui = useUiStore()
const container = ref<HTMLDivElement | null>(null)

let chart: IChartApi | null = null
let mainSeries: ISeriesApi<'Candlestick' | 'Line' | 'Area'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
const smaSeries = new Map<number, ISeriesApi<'Line'>>()

/** Distinct colors for SMA overlays, keyed by period. */
const SMA_COLORS: Record<number, string> = { 20: '#f59e0b', 50: '#a855f7', 200: '#38bdf8' }
function smaColor(period: number): string {
  return SMA_COLORS[period] ?? '#94a3b8'
}

function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/**
 * Chart palette. Trading colors come from the domain tokens (`--color-up` /
 * `--color-down`) so they stay single-source with the design system; neutral
 * chrome (text/grid) is chosen from the active theme.
 *
 * Those tokens are themselves per-theme, and `readToken` resolves the computed
 * value, so the re-tone comes along for free — but only because the `ui.isDark`
 * watcher below re-runs this after the class on <html> changes.
 */
function palette() {
  const dark = ui.isDark
  return {
    up: readToken('--color-up', '#16c784'),
    down: readToken('--color-down', '#ec4d56'),
    primary: readToken('--p-primary-color', '#4f8cff'),
    text: dark ? '#94a3b8' : '#64748b',
    grid: dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.14)',
    border: dark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)',
  }
}

function applyChartTheme() {
  if (!chart) return
  const p = palette()
  chart.applyOptions({
    layout: { background: { color: 'transparent' }, textColor: p.text },
    grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
    rightPriceScale: { borderColor: p.border },
    timeScale: { borderColor: p.border },
  })
  applyMainSeriesTheme()
}

function applyMainSeriesTheme() {
  if (!mainSeries) return
  const p = palette()
  if (props.chartType === 'candlestick') {
    mainSeries.applyOptions({
      upColor: p.up,
      downColor: p.down,
      borderUpColor: p.up,
      borderDownColor: p.down,
      wickUpColor: p.up,
      wickDownColor: p.down,
    })
  } else if (props.chartType === 'line') {
    mainSeries.applyOptions({ color: p.primary, lineWidth: 2 })
  } else {
    mainSeries.applyOptions({
      lineColor: p.primary,
      lineWidth: 2,
      topColor: `${p.primary}55`,
      bottomColor: `${p.primary}05`,
    })
  }
}

// ---- Data builders ---------------------------------------------------------

function candlestickData(): CandlestickData<UTCTimestamp>[] {
  return props.candles.map((c) => ({
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }))
}

function lineData(): LineData<UTCTimestamp>[] {
  return props.candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
}

function volumeData(): HistogramData<UTCTimestamp>[] {
  const p = palette()
  return props.candles.map((c) => ({
    time: c.time as UTCTimestamp,
    value: c.volume,
    color: c.close >= c.open ? `${p.up}66` : `${p.down}66`,
  }))
}

/** Simple moving average over close prices; points before the window are skipped. */
function smaData(period: number): LineData<UTCTimestamp>[] {
  const out: LineData<UTCTimestamp>[] = []
  let sum = 0
  for (let i = 0; i < props.candles.length; i++) {
    sum += props.candles[i]!.close
    if (i >= period) sum -= props.candles[i - period]!.close
    if (i >= period - 1) {
      out.push({ time: props.candles[i]!.time as UTCTimestamp, value: sum / period })
    }
  }
  return out
}

// ---- Series management -----------------------------------------------------

/** (Re)create the main price series to match the current chart type. */
function createMainSeries() {
  if (!chart) return
  if (mainSeries) {
    chart.removeSeries(mainSeries)
    mainSeries = null
  }
  if (props.chartType === 'line') {
    mainSeries = chart.addSeries(LineSeries, {})
    mainSeries.setData(lineData())
  } else if (props.chartType === 'area') {
    mainSeries = chart.addSeries(AreaSeries, {})
    mainSeries.setData(lineData() as AreaData<UTCTimestamp>[])
  } else {
    mainSeries = chart.addSeries(CandlestickSeries, {})
    mainSeries.setData(candlestickData())
  }
  applyMainSeriesTheme()
}

/** Add/remove/update SMA overlays to match `props.smas`. */
function syncSmas() {
  if (!chart) return
  const wanted = new Set(props.smas)

  for (const [period, series] of smaSeries) {
    if (!wanted.has(period)) {
      chart.removeSeries(series)
      smaSeries.delete(period)
    }
  }
  for (const period of wanted) {
    let series = smaSeries.get(period)
    if (!series) {
      series = chart.addSeries(LineSeries, {
        color: smaColor(period),
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      smaSeries.set(period, series)
    }
    series.setData(smaData(period))
  }
}

/** Push the latest candle data into every series. */
function renderData() {
  if (!mainSeries || !volumeSeries) return
  if (props.chartType === 'candlestick') {
    mainSeries.setData(candlestickData())
  } else {
    mainSeries.setData(lineData())
  }
  volumeSeries.setData(volumeData())
  syncSmas()
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

  createMainSeries()

  volumeSeries = chart.addSeries(HistogramSeries, {
    priceScaleId: 'volume',
    priceFormat: { type: 'volume' },
  })
  chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

  applyChartTheme()
  renderData()
})

onBeforeUnmount(() => {
  chart?.remove()
  chart = null
  mainSeries = null
  volumeSeries = null
  smaSeries.clear()
})

watch(() => props.candles, renderData)
watch(
  () => props.chartType,
  () => {
    createMainSeries()
    chart?.timeScale().fitContent()
  },
)
watch(() => props.smas.join(','), syncSmas)
watch(() => ui.isDark, applyChartTheme)
</script>

<template>
  <div ref="container" class="h-full w-full" role="img" :aria-label="ariaLabel ?? 'Price chart'" />
</template>
