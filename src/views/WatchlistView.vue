<script setup lang="ts">
import { onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Message from 'primevue/message'
import StatCard from '@/components/common/StatCard.vue'
import PriceTag from '@/components/common/PriceTag.vue'
import Sparkline from '@/components/common/Sparkline.vue'
import { useWatchlistStore } from '@/stores/watchlist'
import { usePortfolioStore } from '@/stores/portfolio'
import { formatCurrency } from '@/utils/format'

const watchlist = useWatchlistStore()
const portfolio = usePortfolioStore()

onMounted(() => {
  watchlist.load()
  portfolio.load()
})
</script>

<template>
  <section class="space-y-6">
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
      <div class="flex items-center justify-between gap-2 border-b border-surface-200 px-4 py-3 dark:border-surface-800">
        <h2 class="font-semibold text-color">Watchlist</h2>
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

      <Message
        v-if="watchlist.error"
        severity="error"
        :closable="false"
        class="m-4"
      >
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
            <div class="flex items-center gap-3">
              <Avatar :label="data.symbol.charAt(0)" shape="circle" />
              <div>
                <div class="font-semibold text-color">{{ data.symbol }}</div>
                <div class="text-xs text-muted-color">{{ data.name }}</div>
              </div>
            </div>
          </template>
        </Column>

        <Column field="price" header="Last Price" sortable>
          <template #body="{ data }">
            <span class="tabular-nums text-color">{{ formatCurrency(data.price) }}</span>
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
