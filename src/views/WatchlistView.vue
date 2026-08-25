<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Message from 'primevue/message'
import StatCard from '@/components/common/StatCard.vue'
import PriceTag from '@/components/common/PriceTag.vue'
import Sparkline from '@/components/common/Sparkline.vue'
import LivePrice from '@/components/common/LivePrice.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import { useWatchlistStore } from '@/stores/watchlist'
import { usePortfolioStore } from '@/stores/portfolio'
import { formatCurrency } from '@/utils/format'

const router = useRouter()
const watchlist = useWatchlistStore()
const portfolio = usePortfolioStore()

function openChart(symbol: string) {
  router.push({ name: 'chart', params: { symbol } })
}

/** Live-status pill copy + styling, keyed off the stream connection state. */
const liveStatus = computed(() => {
  switch (watchlist.streamStatus) {
    case 'open':
      return { label: 'Live', dot: 'bg-up', pulse: true }
    case 'connecting':
    case 'reconnecting':
      return { label: 'Connecting…', dot: 'bg-amber-500', pulse: true }
    case 'closed':
      return { label: 'Offline', dot: 'bg-down', pulse: false }
    default:
      return { label: 'Idle', dot: 'bg-surface-400', pulse: false }
  }
})

/** An error with nothing cached leaves the table with nothing to draw. */
const failedOutright = computed(() => Boolean(watchlist.error) && watchlist.items.length === 0)

onMounted(async () => {
  portfolio.load()
  // Fetch baseline quotes first so streamed ticks update rows already on screen.
  await watchlist.load()
  watchlist.connect()
})

onUnmounted(() => {
  watchlist.disconnect()
})
</script>

<template>
  <section class="flex flex-col gap-6">
    <!-- Page header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-color">Watchlist</h1>
        <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-color">
          <span>Live prices for the symbols you follow.</span>
          <span
            role="status"
            class="inline-flex items-center gap-1.5 rounded-full border border-surface-200 px-2 py-0.5 text-xs font-medium dark:border-surface-700"
          >
            <span class="relative flex h-2 w-2" aria-hidden="true">
              <span
                v-if="liveStatus.pulse"
                class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                :class="liveStatus.dot"
              />
              <span class="relative inline-flex h-2 w-2 rounded-full" :class="liveStatus.dot" />
            </span>
            {{ liveStatus.label }}
          </span>
        </p>
      </div>

      <Button
        icon="pi pi-refresh"
        label="Refresh"
        size="small"
        severity="secondary"
        outlined
        :loading="watchlist.loading"
        @click="watchlist.load()"
      />
    </div>

    <!-- Portfolio summary -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Portfolio Value"
        :value="portfolio.summary ? formatCurrency(portfolio.summary.totalValue) : '—'"
        icon="pi pi-wallet"
        :loading="portfolio.initialLoading"
      >
        <template v-if="portfolio.summary" #default>
          <PriceTag :value="portfolio.summary.dayChangePercent" format="percent" show-arrow />
          <span>today</span>
        </template>
      </StatCard>

      <StatCard
        label="Buying Power"
        :value="portfolio.summary ? formatCurrency(portfolio.summary.buyingPower) : '—'"
        icon="pi pi-dollar"
        :loading="portfolio.initialLoading"
      />

      <StatCard label="Day's P/L" icon="pi pi-chart-line" :loading="portfolio.initialLoading">
        <template #value>
          <PriceTag
            v-if="portfolio.summary"
            :value="portfolio.summary.dayChange"
            format="currency"
            show-arrow
          />
          <span v-else>—</span>
        </template>
        <template v-if="portfolio.summary" #default>
          <PriceTag :value="portfolio.summary.dayChangePercent" format="percent" />
        </template>
      </StatCard>
    </div>

    <Message v-if="portfolio.error" severity="error" :closable="false">
      {{ portfolio.error }}
    </Message>

    <!-- Watchlist table -->
    <div class="flex flex-col gap-3">
      <Message v-if="watchlist.error" severity="error" :closable="false">
        {{ watchlist.error }}
      </Message>

      <div
        class="overflow-hidden rounded-border border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
      >
        <TableSkeleton
          v-if="watchlist.initialLoading"
          :rows="5"
          :columns="4"
          avatar
          label="Loading watchlist quotes"
        />

        <EmptyState
          v-else-if="watchlist.isEmpty"
          icon="pi pi-search"
          title="Your watchlist is empty"
          message="Use the search bar above to find a stock or ETF and add it to your watchlist."
        />

        <EmptyState
          v-else-if="failedOutright"
          icon="pi pi-exclamation-triangle"
          title="Quotes are unavailable"
          message="We couldn’t reach the market-data feed. Try refreshing in a moment."
        />

        <DataTable
          v-else
          :value="watchlist.items"
          data-key="symbol"
          row-hover
          table-style="min-width: 25rem"
          :table-props="{ 'aria-label': 'Watchlist quotes' }"
        >
          <Column field="symbol" header="Symbol" sortable>
            <template #body="{ data }">
              <button
                type="button"
                class="group flex items-center gap-3 rounded-border text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                :aria-label="`Open ${data.symbol} chart`"
                @click="openChart(data.symbol)"
              >
                <!--
                  The avatar and the full company name are the two things this
                  column can give up on a phone; without that, Change % — the
                  reason to open the page — gets pushed off the right edge.
                -->
                <Avatar
                  :label="data.symbol.charAt(0)"
                  shape="circle"
                  class="hidden sm:inline-flex"
                />
                <div class="min-w-0">
                  <div class="font-semibold text-color group-hover:text-primary">
                    {{ data.symbol }}
                  </div>
                  <div class="max-w-[5.5rem] truncate text-xs text-muted-color sm:max-w-none">
                    {{ data.name }}
                  </div>
                </div>
              </button>
            </template>
          </Column>

          <Column field="price" header="Last Price" sortable>
            <template #body="{ data }">
              <LivePrice :price="data.price" />
            </template>
          </Column>

          <Column field="changePercent" header="Change %" sortable>
            <template #body="{ data }">
              <PriceTag :value="data.changePercent" format="percent" show-arrow />
            </template>
          </Column>

          <Column
            header="Trend"
            header-class="hidden sm:table-cell"
            body-class="hidden sm:table-cell"
          >
            <template #body="{ data }">
              <Sparkline v-if="data.sparkline?.length" :data="data.sparkline" />
              <span v-else class="text-xs text-muted-color">—</span>
            </template>
          </Column>

          <Column header="" body-class="w-12">
            <template #body="{ data }">
              <Button
                icon="pi pi-times"
                text
                rounded
                size="small"
                severity="secondary"
                :aria-label="`Remove ${data.symbol} from watchlist`"
                @click="watchlist.remove(data.symbol)"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </section>
</template>
