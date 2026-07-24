<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{ price: number }>()

/** Direction of the most recent tick, briefly set to drive a flash highlight. */
const flash = ref<'up' | 'down' | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.price,
  (next, prev) => {
    if (prev === undefined || next === prev) return
    flash.value = next > prev ? 'up' : 'down'
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => (flash.value = null), 700)
  },
)
</script>

<template>
  <span
    class="inline-block rounded px-1.5 py-0.5 tabular-nums text-color transition-colors duration-500"
    :class="{
      'bg-up/20': flash === 'up',
      'bg-down/20': flash === 'down',
    }"
  >
    {{ formatCurrency(price) }}
  </span>
</template>
