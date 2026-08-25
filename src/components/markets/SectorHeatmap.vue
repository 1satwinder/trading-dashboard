<script setup lang="ts">
import type { SectorPerformance } from '@/types/market'
import { formatPercent } from '@/utils/format'

defineProps<{ sectors: SectorPerformance[] }>()

/**
 * Tile shading, strongest move darkest. Intensity comes from opacity modifiers
 * on the `up`/`down` domain tokens rather than raw green/red utilities, so the
 * heatmap follows the same source of truth as every other price colour
 * (docs/03-design-system.md). Thresholds are day-move sized — most sectors sit
 * under 1%.
 *
 * Spelled out as literals because Tailwind only detects complete class names in
 * source; a built-up `bg-${tone}/${step}` would never be generated.
 *
 * The top step is capped at 40% because the tile's own label sits on this tint:
 * at 55% the strongest light-theme tile dropped the label to 4.1:1, under the
 * 4.5:1 AA floor. 40% keeps four distinguishable steps at 5.4:1 worst case.
 */
const UP_SHADES = ['bg-up/10', 'bg-up/18', 'bg-up/28', 'bg-up/40'] as const
const DOWN_SHADES = ['bg-down/10', 'bg-down/18', 'bg-down/28', 'bg-down/40'] as const
const FLAT_SHADE = 'bg-surface-100 dark:bg-surface-800'

/** Percent thresholds separating the four shade steps. */
const SHADE_BREAKS = [0.5, 1, 2]

function tileClass(changePercent: number): string {
  const magnitude = Math.abs(changePercent)
  if (magnitude < 0.1) return FLAT_SHADE

  const step = SHADE_BREAKS.filter((breakpoint) => magnitude >= breakpoint).length
  return changePercent > 0 ? UP_SHADES[step]! : DOWN_SHADES[step]!
}

/** What the tile's figure represents, for the tooltip / screen readers. */
function describe(sector: SectorPerformance): string {
  const move = `${sector.name} ${formatPercent(sector.changePercent, { signed: true })}`
  return sector.symbol
    ? `${move} (via ${sector.symbol})`
    : `${move} (average of ${sector.memberCount} holdings)`
}
</script>

<template>
  <div
    v-if="sectors.length"
    class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
    role="list"
  >
    <div
      v-for="sector in sectors"
      :key="sector.name"
      role="listitem"
      :title="describe(sector)"
      :aria-label="describe(sector)"
      class="rounded-border border border-surface-200 p-3 dark:border-surface-800"
      :class="tileClass(sector.changePercent)"
    >
      <p class="truncate text-sm font-medium text-color">{{ sector.name }}</p>
      <p class="mt-1 text-base font-semibold tabular-nums text-color">
        {{ formatPercent(sector.changePercent, { signed: true }) }}
      </p>
      <!--
        Body text colour, not muted: muted-color is already 4.8:1 on a plain card,
        so any tint under it drops below AA. Hierarchy comes from size instead.
      -->
      <p class="mt-0.5 text-xs text-color">
        {{ sector.symbol || `${sector.memberCount} holdings` }}
      </p>
    </div>
  </div>

  <p v-else class="py-6 text-center text-sm text-muted-color">No sector data available.</p>
</template>
