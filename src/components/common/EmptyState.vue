<script setup lang="ts">
/**
 * Shared "nothing here" panel for tables, cards and chart areas, so every
 * empty/error surface in the app reads the same: an icon, a one-line headline,
 * an optional sentence explaining what would fill it, and an optional action
 * in the default slot.
 */
withDefaults(
  defineProps<{
    title: string
    message?: string
    /** PrimeIcon class, e.g. `pi pi-inbox`. Purely decorative. */
    icon?: string
    /** Tighter padding for short cards (allocation, sectors, chart panes). */
    compact?: boolean
  }>(),
  { icon: 'pi pi-inbox', compact: false },
)
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 px-6 text-center"
    :class="compact ? 'py-10' : 'py-16'"
  >
    <i :class="icon" class="text-3xl text-muted-color" aria-hidden="true" />
    <p class="font-medium text-color">{{ title }}</p>
    <p v-if="message" class="max-w-xs text-sm text-muted-color">{{ message }}</p>
    <slot />
  </div>
</template>
