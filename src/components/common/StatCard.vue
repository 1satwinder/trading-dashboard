<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

defineProps<{
  label: string
  /** Preformatted value. Omit to supply a custom `#value` slot instead. */
  value?: string
  /** Optional PrimeIcon class shown top-right (e.g. `pi pi-wallet`). */
  icon?: string
  /**
   * Swap the value (and sub-line) for placeholders. The card's own chrome stays
   * put, so the number fades in without shifting the grid.
   */
  loading?: boolean
}>()
</script>

<template>
  <div
    class="rounded-border border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
  >
    <div class="flex items-start justify-between gap-2">
      <span class="text-sm text-muted-color">{{ label }}</span>
      <i v-if="icon" :class="icon" class="text-muted-color" aria-hidden="true" />
    </div>

    <div class="mt-2 text-2xl font-semibold tabular-nums text-color">
      <Skeleton v-if="loading" height="1.75rem" width="7rem" />
      <slot v-else name="value">{{ value }}</slot>
    </div>

    <div
      v-if="loading || $slots.default"
      class="mt-1 flex items-center gap-1 text-sm text-muted-color"
    >
      <Skeleton v-if="loading" height="0.8rem" width="4.5rem" />
      <slot v-else />
    </div>
  </div>
</template>
