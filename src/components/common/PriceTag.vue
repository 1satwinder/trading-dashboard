<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency, formatNumber, formatPercent } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    value: number
    format?: 'currency' | 'percent' | 'number'
    showArrow?: boolean
    /** Prefix positive values with `+`. */
    showSign?: boolean
  }>(),
  { format: 'number', showArrow: false, showSign: true },
)

const isUp = computed(() => props.value > 0)
const isDown = computed(() => props.value < 0)

// Uses the trading-domain color tokens (see docs/03-design-system.md).
const colorClass = computed(() =>
  isUp.value ? 'text-up' : isDown.value ? 'text-down' : 'text-muted-color',
)

const arrowClass = computed(() =>
  isUp.value ? 'pi pi-arrow-up' : isDown.value ? 'pi pi-arrow-down' : '',
)

const formatted = computed(() => {
  switch (props.format) {
    case 'currency':
      return formatCurrency(props.value, { signed: props.showSign })
    case 'percent':
      return formatPercent(props.value, { signed: props.showSign })
    default:
      return formatNumber(props.value)
  }
})
</script>

<template>
  <span :class="colorClass" class="inline-flex items-center gap-1 font-medium tabular-nums">
    {{ formatted }}
    <i v-if="showArrow && arrowClass" :class="arrowClass" class="text-[0.7em]" />
  </span>
</template>
