<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'
import SelectButton from 'primevue/selectbutton'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import PriceTag from '@/components/common/PriceTag.vue'
import AllocationDonut from '@/components/portfolio/AllocationDonut.vue'
import PortfolioChart from '@/components/portfolio/PortfolioChart.vue'
import { usePortfolioStore } from '@/stores/portfolio'
import type { PortfolioHistoryRange } from '@/types/market'
import { formatCurrency } from '@/utils/format'

const router = useRouter()
const portfolio = usePortfolioStore()

const RANGES: { label: string; value: PortfolioHistoryRange }[] = [
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
]

const range = computed<PortfolioHistoryRange>({
  get: () => portfolio.historyRange,
  set: (value) => {
    if (value) portfolio.setHistoryRange(value)
  },
})

const hasPositions = computed(() => portfolio.positions.length > 0)
const isLoading = computed(() => portfolio.loading || portfolio.positionsLoading)

function openChart(symbol: string) {
  router.push({ name: 'chart', params: { symbol } })
}

onMounted(() => {
  portfolio.load()
  portfolio.loadPositions()
  portfolio.loadHistory()
})
</script>

<template>
  <section class="flex flex-col gap-8">
    <!-- Summary header -->
    <div
      class="rounded-border border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
    >
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-10">
        <div>
          <p class="text-sm text-muted-color">Total Value</p>
          <p class="mt-1 text-3xl font-bold tabular-nums text-color">
            {{ portfolio.summary ? formatCurrency(portfolio.summary.totalValue) : '—' }}
          </p>
          <div v-if="portfolio.summary" class="mt-1 flex items-center gap-1.5 text-sm">
            <PriceTag :value="portfolio.summary.dayChange" format="currency" show-arrow />
            <PriceTag
              :value="portfolio.summary.dayChangePercent"
              format="percent"
              class="text-muted-color"
            />
            <span class="text-muted-color">today</span>
          </div>
        </div>

        <div class="hidden h-12 w-px bg-surface-200 dark:bg-surface-800 sm:block" />

        <div>
          <p class="text-sm text-muted-color">Total Return (open P/L)</p>
          <div class="mt-1 flex items-center gap-2 text-2xl font-bold">
            <PriceTag :value="portfolio.totalUnrealizedPl" format="currency" show-arrow />
            <PriceTag
              :value="portfolio.totalUnrealizedPlPercent"
              format="percent"
              class="text-lg"
            />
          </div>
        </div>
      </div>
    </div>

    <Message v-if="portfolio.error" severity="error" :closable="false">
      {{ portfolio.error }}
    </Message>

    <!-- Allocation + performance -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Allocation -->
      <div
        class="rounded-border border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
      >
        <h2 class="mb-4 font-semibold text-color">Allocation</h2>
        <AllocationDonut v-if="portfolio.allocation.length" :slices="portfolio.allocation" />
        <p v-else class="py-10 text-center text-sm text-muted-color">No allocation to show.</p>
      </div>

      <!-- Performance -->
      <div
        class="flex flex-col rounded-border border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
      >
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2 class="font-semibold text-color">Performance</h2>
          <SelectButton
            v-model="range"
            :options="RANGES"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            aria-label="Performance range"
            size="small"
          />
        </div>

        <div class="relative h-[240px]">
          <Message v-if="portfolio.historyError" severity="error" :closable="false" class="m-1">
            {{ portfolio.historyError }}
          </Message>
          <template v-else>
            <PortfolioChart
              v-if="portfolio.history?.points.length"
              :points="portfolio.history.points"
            />
            <div
              v-if="portfolio.historyLoading || !portfolio.history?.points.length"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-color"
            >
              <ProgressSpinner
                v-if="portfolio.historyLoading"
                style="width: 2.5rem; height: 2.5rem"
              />
              <template v-else>
                <i class="pi pi-chart-line text-3xl" />
                <p class="text-sm">No performance history yet.</p>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Holdings -->
    <div
      class="overflow-hidden rounded-border border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <div class="border-b border-surface-200 px-4 py-3 dark:border-surface-800">
        <h2 class="font-semibold text-color">Holdings</h2>
      </div>

      <Message v-if="portfolio.positionsError" severity="error" :closable="false" class="m-4">
        {{ portfolio.positionsError }}
      </Message>

      <div
        v-else-if="!hasPositions && !isLoading"
        class="flex flex-col items-center gap-2 px-6 py-16 text-center"
      >
        <i class="pi pi-briefcase text-3xl text-muted-color" />
        <p class="font-medium text-color">No open positions</p>
        <p class="max-w-xs text-sm text-muted-color">
          Positions from your paper account will appear here once you hold something.
        </p>
      </div>

      <DataTable
        v-else
        :value="portfolio.positions"
        :loading="portfolio.positionsLoading"
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
              <span class="font-semibold text-color group-hover:text-primary">
                {{ data.symbol }}
              </span>
            </button>
          </template>
        </Column>

        <Column field="qty" header="Shares" sortable>
          <template #body="{ data }">
            <span class="tabular-nums text-color">{{ data.qty }}</span>
          </template>
        </Column>

        <Column field="avgEntryPrice" header="Avg Cost" sortable>
          <template #body="{ data }">
            <span class="tabular-nums text-color">{{ formatCurrency(data.avgEntryPrice) }}</span>
          </template>
        </Column>

        <Column
          field="currentPrice"
          header="Market Price"
          sortable
          header-class="hidden sm:table-cell"
          body-class="hidden sm:table-cell"
        >
          <template #body="{ data }">
            <span class="tabular-nums text-color">{{ formatCurrency(data.currentPrice) }}</span>
          </template>
        </Column>

        <Column field="marketValue" header="Market Value" sortable>
          <template #body="{ data }">
            <span class="tabular-nums text-color">{{ formatCurrency(data.marketValue) }}</span>
          </template>
        </Column>

        <Column field="unrealizedPl" header="Total P/L (%)" sortable>
          <template #body="{ data }">
            <div class="flex flex-col">
              <PriceTag :value="data.unrealizedPl" format="currency" show-arrow />
              <PriceTag
                :value="data.unrealizedPlPercent"
                format="percent"
                class="text-xs text-muted-color"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </section>
</template>
