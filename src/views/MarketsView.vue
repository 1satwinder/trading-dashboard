<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import SelectButton from 'primevue/selectbutton'
import EmptyState from '@/components/common/EmptyState.vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import IndexCard from '@/components/markets/IndexCard.vue'
import MoversTable from '@/components/markets/MoversTable.vue'
import SectorHeatmap from '@/components/markets/SectorHeatmap.vue'
import type { MarketRegion } from '@/types/market'
import { useMarketsStore } from '@/stores/markets'
import { formatTimeOfDay } from '@/utils/format'

const markets = useMarketsStore()

const REGIONS: { label: string; value: MarketRegion }[] = [
  { label: 'US', value: 'us' },
  { label: 'Canada', value: 'ca' },
]

const region = computed({
  get: () => markets.region,
  set: (value: MarketRegion) => markets.setRegion(value),
})

const anyLoading = computed(
  () => markets.indicesLoading || markets.moversLoading || markets.sectorsLoading,
)

/** Session state, e.g. "Market open · closes 4:00 PM". */
const marketStatus = computed(() => {
  const clock = markets.clock
  if (!clock) return null
  return clock.isOpen
    ? { label: 'Market open', detail: `closes ${formatTimeOfDay(clock.nextClose)}` }
    : { label: 'Market closed', detail: `opens ${formatTimeOfDay(clock.nextOpen)}` }
})

/**
 * Canadian rows are a curated list of US listings rather than a market-wide
 * scan, so say so instead of implying we swept the TSX.
 */
const moversScope = computed(() =>
  markets.movers?.source === 'universe'
    ? 'Ranked across Canadian large caps listed in the US.'
    : 'Ranked across the whole US market.',
)

const sectorsScope = computed(() =>
  markets.region === 'ca'
    ? 'Average move of the Canadian large caps we track, by sector.'
    : 'Today’s move in each of the 11 SPDR sector ETFs.',
)

onMounted(() => {
  void markets.load()
  markets.startPolling()
})

onUnmounted(() => {
  markets.stopPolling()
})
</script>

<template>
  <section class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-color">Markets</h1>
        <p
          role="status"
          class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-color"
        >
          <template v-if="marketStatus">
            <span class="inline-flex items-center gap-1.5">
              <span
                class="size-2 rounded-full"
                :class="markets.isMarketOpen ? 'bg-up' : 'bg-surface-400 dark:bg-surface-600'"
                aria-hidden="true"
              />
              {{ marketStatus.label }}
            </span>
            <span aria-hidden="true">·</span>
            <span>{{ marketStatus.detail }}</span>
          </template>
          <span v-else>Indices, movers and sectors.</span>
        </p>
      </div>

      <Button
        icon="pi pi-refresh"
        label="Refresh"
        size="small"
        severity="secondary"
        outlined
        :loading="anyLoading"
        @click="markets.load()"
      />
    </div>

    <!-- Benchmarks -->
    <div>
      <Message v-if="markets.indicesError" severity="error" :closable="false">
        {{ markets.indicesError }}
      </Message>

      <!-- Scroll strip on mobile, even grid once there's room for all five. -->
      <div
        v-else-if="markets.indicesInitialLoading"
        role="status"
        aria-label="Loading benchmarks"
        class="-mx-4 flex gap-3 px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:px-0"
      >
        <div
          v-for="card in 5"
          :key="card"
          class="min-w-[10.5rem] shrink-0 rounded-border border border-surface-200 p-4 md:min-w-0 dark:border-surface-800"
          aria-hidden="true"
        >
          <Skeleton height="0.8rem" width="70%" />
          <Skeleton height="1.4rem" width="60%" class="mt-3" />
          <Skeleton height="0.75rem" width="40%" class="mt-2" />
        </div>
      </div>

      <EmptyState
        v-else-if="!markets.indices.length"
        compact
        icon="pi pi-chart-bar"
        title="No benchmarks available"
        message="The index proxies couldn’t be quoted. They’ll reappear on the next refresh."
      />

      <div
        v-else
        class="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0"
      >
        <IndexCard v-for="index in markets.indices" :key="index.symbol" :index="index" />
      </div>
    </div>

    <SelectButton
      v-model="region"
      :options="REGIONS"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      aria-label="Market region"
      size="small"
    />

    <Message v-if="markets.moversError" severity="error" :closable="false">
      {{ markets.moversError }}
    </Message>

    <div v-else-if="markets.moversInitialLoading" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div
        v-for="table in 2"
        :key="table"
        class="overflow-hidden rounded-border border border-surface-200 dark:border-surface-800"
      >
        <TableSkeleton :rows="5" :columns="3" label="Loading movers" />
      </div>
    </div>

    <template v-else>
      <!-- Gainers + losers -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          class="overflow-hidden rounded-border border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
        >
          <div class="border-b border-surface-200 p-4 dark:border-surface-800">
            <h2 class="font-semibold text-color">Top Gainers</h2>
            <p class="mt-0.5 text-xs text-muted-color">{{ moversScope }}</p>
          </div>
          <MoversTable
            :movers="markets.movers?.gainers ?? []"
            label="Top gainers"
            empty-message="No gainers to show right now."
          />
        </div>

        <div
          class="overflow-hidden rounded-border border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
        >
          <div class="border-b border-surface-200 p-4 dark:border-surface-800">
            <h2 class="font-semibold text-color">Top Losers</h2>
            <p class="mt-0.5 text-xs text-muted-color">{{ moversScope }}</p>
          </div>
          <MoversTable
            :movers="markets.movers?.losers ?? []"
            label="Top losers"
            empty-message="No losers to show right now."
          />
        </div>
      </div>

      <!-- Most active -->
      <div
        class="overflow-hidden rounded-border border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
      >
        <div class="border-b border-surface-200 p-4 dark:border-surface-800">
          <h2 class="font-semibold text-color">Most Active</h2>
          <p class="mt-0.5 text-xs text-muted-color">By shares traded today.</p>
        </div>
        <MoversTable
          :movers="markets.movers?.mostActive ?? []"
          show-volume
          label="Most active by volume"
          empty-message="No volume leaders to show right now."
        />
      </div>
    </template>

    <!-- Sectors -->
    <div
      class="rounded-border border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
    >
      <h2 class="font-semibold text-color">Sectors</h2>
      <p class="mt-0.5 mb-4 text-xs text-muted-color">{{ sectorsScope }}</p>

      <Message v-if="markets.sectorsError" severity="error" :closable="false">
        {{ markets.sectorsError }}
      </Message>
      <div
        v-else-if="markets.sectorsInitialLoading"
        role="status"
        aria-label="Loading sectors"
        class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        <Skeleton v-for="tile in 8" :key="tile" height="5.25rem" />
      </div>
      <SectorHeatmap v-else :sectors="markets.sectors" />
    </div>
  </section>
</template>
