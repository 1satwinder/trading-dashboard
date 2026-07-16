<script setup lang="ts">
defineProps<{
  label: string
  /** Preformatted value. Omit to supply a custom `#value` slot instead. */
  value?: string
  /** Optional PrimeIcon class shown top-right (e.g. `pi pi-wallet`). */
  icon?: string
}>()
</script>

<template>
  <div
    class="rounded-border border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
  >
    <div class="flex items-start justify-between gap-2">
      <span class="text-sm text-muted-color">{{ label }}</span>
      <i v-if="icon" :class="icon" class="text-muted-color" />
    </div>

    <div class="mt-2 text-2xl font-semibold tabular-nums text-color">
      <slot name="value">{{ value }}</slot>
    </div>

    <div v-if="$slots.default" class="mt-1 flex items-center gap-1 text-sm text-muted-color">
      <slot />
    </div>
  </div>
</template>
