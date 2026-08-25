<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AreaSeries,
  createChart,
  type AreaData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { PortfolioHistoryPoint } from '@/types/market'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{
  points: PortfolioHistoryPoint[]
  /**
   * Sentence describing the series. `lightweight-charts` draws to a canvas, so
   * without this the chart is invisible to assistive tech.
   */
  ariaLabel?: string
}>()

const ui = useUiStore()
const container = ref<HTMLDivElement | null>(null)

let chart: IChartApi | null = null
let series: ISeriesApi<'Area'> | null = null

function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/**
 * Colour the equity curve by performance: green when the range is up overall,
 * red when down — using the shared trading-domain tokens.
 */
function palette() {
  const dark = ui.isDark
  const first = props.points[0]?.value ?? 0
  const last = props.points[props.points.length - 1]?.value ?? 0
  const up = last >= first
  const line = up ? readToken('--color-up', '#16c784') : readToken('--color-down', '#ec4d56')
  return {
    line,
    top: `${line}55`,
    bottom: `${line}05`,
    text: dark ? '#94a3b8' : '#64748b',
    grid: dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.14)',
    border: dark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)',
  }
}

function areaData(): AreaData<UTCTimestamp>[] {
  return props.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
}

function applyTheme() {
  if (!chart || !series) return
  const p = palette()
  chart.applyOptions({
    layout: { background: { color: 'transparent' }, textColor: p.text },
    grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
    rightPriceScale: { borderColor: p.border },
    timeScale: { borderColor: p.border },
  })
  series.applyOptions({
    lineColor: p.line,
    lineWidth: 2,
    topColor: p.top,
    bottomColor: p.bottom,
  })
}

function render() {
  if (!series) return
  series.setData(areaData())
  applyTheme()
  chart?.timeScale().fitContent()
}

onMounted(() => {
  if (!container.value) return
  chart = createChart(container.value, {
    autoSize: true,
    layout: { background: { color: 'transparent' }, textColor: palette().text },
    timeScale: { timeVisible: false, secondsVisible: false },
    rightPriceScale: { scaleMargins: { top: 0.15, bottom: 0.1 } },
    crosshair: { mode: 0 },
    handleScroll: false,
    handleScale: false,
  })
  series = chart.addSeries(AreaSeries, {})
  render()
})

onBeforeUnmount(() => {
  chart?.remove()
  chart = null
  series = null
})

watch(() => props.points, render)
watch(() => ui.isDark, applyTheme)
</script>

<template>
  <div
    ref="container"
    class="h-full w-full"
    role="img"
    :aria-label="ariaLabel ?? 'Portfolio value over time'"
  />
</template>
