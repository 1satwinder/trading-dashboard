<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

/**
 * Placeholder rows shown while a table's first page of data loads.
 *
 * We can't use `DataTable`'s own `:loading` overlay for this — cached BFF
 * responses can flip `true → false` fast enough to orphan PrimeVue's mask
 * transition and leave a click-blocking layer over the table (see
 * `OrdersTable.vue`). Rendering a skeleton *instead of* the table sidesteps the
 * overlay entirely and reserves roughly the right height, so the page doesn't
 * jump when the real rows arrive.
 */
withDefaults(
  defineProps<{
    rows?: number
    columns?: number
    /** Draw a circle in the leading cell, for tables that start with an avatar. */
    avatar?: boolean
    /** Announced to assistive tech in place of the (decorative) shapes. */
    label?: string
  }>(),
  { rows: 5, columns: 4, avatar: false, label: 'Loading…' },
)
</script>

<template>
  <div role="status" :aria-label="label">
    <div aria-hidden="true">
      <!-- Stand-in for the header row, so the table's chrome doesn't pop in. -->
      <div
        class="flex items-center gap-4 border-b border-surface-200 px-4 py-3 dark:border-surface-800"
      >
        <div class="flex-[2]"><Skeleton height="0.7rem" width="4rem" /></div>
        <div v-for="col in columns - 1" :key="col" class="flex-1">
          <Skeleton height="0.7rem" width="3.5rem" />
        </div>
      </div>

      <div
        v-for="row in rows"
        :key="row"
        class="flex items-center gap-4 border-b border-surface-200 px-4 py-4 last:border-b-0 dark:border-surface-800"
      >
        <div class="flex flex-[2] items-center gap-3">
          <Skeleton v-if="avatar" shape="circle" size="2rem" class="shrink-0" />
          <Skeleton height="0.85rem" width="5.5rem" />
        </div>
        <div v-for="col in columns - 1" :key="col" class="flex-1">
          <Skeleton height="0.85rem" width="70%" />
        </div>
      </div>
    </div>
  </div>
</template>
