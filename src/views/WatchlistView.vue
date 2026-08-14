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
  <section class="flex flex-col gap-8">
    <!-- Portfolio summary -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Portfolio Value"
        :value="portfolio.summary ? formatCurrency(portfolio.summary.totalValue) : '—'"
        icon="pi pi-wallet"
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
      />

      <StatCard label="Day's P/L" icon="pi pi-chart-line">
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

    <!-- Watchlist table -->
    <div
      class="overflow-hidden rounded-border border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <div
        class="flex items-center justify-between gap-2 border-b border-surface-200 px-4 py-3 dark:border-surface-800"
      >
        <div class="flex items-center gap-3">
          <h2 class="font-semibold text-color">Watchlist</h2>
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-surface-200 px-2 py-0.5 text-xs font-medium text-muted-color dark:border-surface-700"
            :title="`Streaming: ${watchlist.streamStatus}`"
          >
            <span class="relative flex h-2 w-2">
              <span
                v-if="liveStatus.pulse"
                class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                :class="liveStatus.dot"
              />
              <span class="relative inline-flex h-2 w-2 rounded-full" :class="liveStatus.dot" />
            </span>
            {{ liveStatus.label }}
          </span>
        </div>
        <Button
          icon="pi pi-refresh"
          text
          rounded
          size="small"
          severity="secondary"
          :loading="watchlist.loading"
          aria-label="Refresh quotes"
          title="Refresh quotes"
          @click="watchlist.load()"
        />
      </div>

      <Message v-if="watchlist.error" severity="error" :closable="false" class="m-4">
        {{ watchlist.error }}
      </Message>

      <!-- Empty state -->
      <div
        v-else-if="watchlist.isEmpty && !watchlist.loading"
        class="flex flex-col items-center gap-2 px-6 py-16 text-center"
      >
        <i class="pi pi-search text-3xl text-muted-color" />
        <p class="font-medium text-color">Your watchlist is empty</p>
        <p class="max-w-xs text-sm text-muted-color">
          Use the search bar above to find a stock or ETF and add it to your watchlist.
        </p>
      </div>

      <DataTable
        v-else
        :value="watchlist.items"
        :loading="watchlist.loading"
        data-key="symbol"
        row-hover
      >
        <Column field="symbol" header="Symbol" sortable>
          <template #body="{ data }">
            <button
              type="button"
              class="group flex items-center gap-3 text-left"
              :title="`Open ${data.symbol} chart`"
              @click="openChart(data.symbol)"
            >
              <Avatar :label="data.symbol.charAt(0)" shape="circle" />
              <div>
                <div class="font-semibold text-color group-hover:text-primary">
                  {{ data.symbol }}
                </div>
                <div class="text-xs text-muted-color">{{ data.name }}</div>
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
              :aria-label="`Remove ${data.symbol}`"
              :title="`Remove ${data.symbol}`"
              @click="watchlist.remove(data.symbol)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </section>
</template>
