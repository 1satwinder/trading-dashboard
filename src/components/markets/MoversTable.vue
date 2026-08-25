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
    /** Names the table for assistive tech, e.g. "Top gainers". */
    label?: string
  }>(),
  { showVolume: false, emptyMessage: 'Nothing to show right now.', label: 'Movers' },
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
    table-style="min-width: 17rem"
    :table-props="{ 'aria-label': label }"
    @row-click="openChart(($event.data as Mover).symbol)"
  >
    <template #empty>
      <p class="py-6 text-center text-sm text-muted-color">{{ emptyMessage }}</p>
    </template>

    <Column header="Symbol">
      <template #body="{ data }">
        <!--
          The whole row is clickable for pointers, but a row isn't focusable, so
          the symbol is also a real button — that's the keyboard's way in. The
          `.stop` keeps the row handler from firing a second navigation.
        -->
        <button
          type="button"
          class="group rounded-border text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :aria-label="`Open ${data.symbol} chart`"
          @click.stop="openChart(data.symbol)"
        >
          <span class="font-semibold text-color group-hover:text-primary">{{ data.symbol }}</span>
          <!-- Clamped hard on phones: at 11rem the name alone pushes Change off-screen. -->
          <span class="block max-w-[7rem] truncate text-xs text-muted-color sm:max-w-[11rem]">
            {{ data.name }}
          </span>
        </button>
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
