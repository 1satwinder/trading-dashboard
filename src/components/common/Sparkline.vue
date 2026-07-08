<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    data: number[]
    width?: number
    height?: number
    strokeWidth?: number
  }>(),
  { width: 96, height: 32, strokeWidth: 1.5 },
)

// Color by overall trend (last vs first), matching the row's change direction.
const trendUp = computed(() => {
  const d = props.data
  if (d.length < 2) return true
  return d[d.length - 1]! >= d[0]!
})

const points = computed(() => {
  const d = props.data
  if (d.length === 0) return ''

  const min = Math.min(...d)
  const max = Math.max(...d)
  const range = max - min || 1
  const pad = props.strokeWidth
  const w = props.width - pad * 2
  const h = props.height - pad * 2

  return d
    .map((value, i) => {
      const x = pad + (d.length === 1 ? 0 : (i / (d.length - 1)) * w)
      const y = pad + (1 - (value - min) / range) * h
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    :class="trendUp ? 'text-up' : 'text-down'"
    fill="none"
    aria-hidden="true"
  >
    <polyline
      :points="points"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
