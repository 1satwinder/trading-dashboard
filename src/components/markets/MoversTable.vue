<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useRouter } from 'vue-router'
import PriceTag from '@/components/common/PriceTag.vue'
import type { Mover } from '@/types/market'
import { formatCompact, formatCurrency } from '@/utils/format'

withDefaults(
  defineProps<{
    movers: Mover[]
    /** Show the volume column (only meaningful for the most-active list). */
    showVolume?: boolean
    emptyMessage?: string
  }>(),
  { showVolume: false, emptyMessage: 'Nothing to show right now.' },
)

const router = useRouter()

function openChart(symbol: string) {
  void router.push({ name: 'chart', params: { symbol } })
}
</script>

<template>
  <!--
    Deliberately not using DataTable's `loading` overlay — see OrdersTable.vue:
    cached BFF responses can flip true→false fast enough to orphan PrimeVue's
    leave-transition and leave a click-blocking mask. The page owns the spinner.
  -->
  <DataTable
    :value="movers"
    data-key="symbol"
    row-hover
    class="cursor-pointer"
    @row-click="openChart(($event.data as Mover).symbol)"
  >
    <template #empty>
      <p class="py-6 text-center text-sm text-muted-color">{{ emptyMessage }}</p>
    </template>

    <Column header="Symbol">
      <template #body="{ data }">
        <span class="font-semibold text-color">{{ data.symbol }}</span>
        <span class="block max-w-[11rem] truncate text-xs text-muted-color">{{ data.name }}</span>
      </template>
    </Column>

    <Column header="Price" body-class="text-right" header-class="justify-end">
      <template #body="{ data }">
        <span class="tabular-nums text-color">{{ formatCurrency(data.price) }}</span>
      </template>
    </Column>

    <Column header="Change" body-class="text-right" header-class="justify-end">
      <template #body="{ data }">
        <PriceTag :value="data.changePercent" format="percent" />
      </template>
    </Column>

    <Column
      v-if="showVolume"
      header="Volume"
      body-class="hidden text-right sm:table-cell"
      header-class="hidden justify-end sm:table-cell"
    >
      <template #body="{ data }">
        <span class="tabular-nums text-muted-color">{{ formatCompact(data.volume) }}</span>
      </template>
    </Column>
  </DataTable>
</template>
