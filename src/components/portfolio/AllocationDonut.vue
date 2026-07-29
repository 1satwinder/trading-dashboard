<script setup lang="ts">
import { computed } from 'vue'
import type { AllocationSlice } from '@/stores/portfolio'

const props = defineProps<{ slices: AllocationSlice[] }>()

// Geometry for the SVG ring.
const SIZE = 168
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Turn slices into stroke-dasharray arcs laid out head-to-tail around the ring. */
const arcs = computed(() => {
  let offset = 0
  return props.slices.map((slice) => {
    const length = (slice.percent / 100) * CIRCUMFERENCE
    const arc = {
      color: slice.color,
      // Small gap between arcs for a segmented look.
      dash: `${Math.max(0, length - 2)} ${CIRCUMFERENCE - Math.max(0, length - 2)}`,
      offset: -offset,
    }
    offset += length
    return arc
  })
})
</script>

<template>
  <div class="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
    <svg
      :width="SIZE"
      :height="SIZE"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      class="shrink-0 -rotate-90"
      role="img"
      aria-label="Portfolio allocation"
    >
      <circle
        :cx="CENTER"
        :cy="CENTER"
        :r="RADIUS"
        fill="none"
        :stroke-width="STROKE"
        class="stroke-surface-200 dark:stroke-surface-800"
      />
      <circle
        v-for="(arc, i) in arcs"
        :key="i"
        :cx="CENTER"
        :cy="CENTER"
        :r="RADIUS"
        fill="none"
        :stroke="arc.color"
        :stroke-width="STROKE"
        :stroke-dasharray="arc.dash"
        :stroke-dashoffset="arc.offset"
        stroke-linecap="butt"
      />
    </svg>

    <ul class="w-full space-y-2">
      <li
        v-for="slice in slices"
        :key="slice.label"
        class="flex items-center gap-2 text-sm"
      >
        <span
          class="h-2.5 w-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: slice.color }"
        />
        <span class="text-color">{{ slice.label }}</span>
        <span class="ml-auto font-medium tabular-nums text-muted-color">
          {{ slice.percent.toFixed(0) }}%
        </span>
      </li>
    </ul>
  </div>
</template>
