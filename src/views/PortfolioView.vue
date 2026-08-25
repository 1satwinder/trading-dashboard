<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'
import SelectButton from 'primevue/selectbutton'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Skeleton from 'primevue/skeleton'
import PriceTag from '@/components/common/PriceTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import AllocationDonut from '@/components/portfolio/AllocationDonut.vue'
import PortfolioChart from '@/components/portfolio/PortfolioChart.vue'
import { usePortfolioStore } from '@/stores/portfolio'
import type { PortfolioHistoryRange } from '@/types/market'
import { formatCurrency, formatPercent } from '@/utils/format'

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
const historyPoints = computed(() => portfolio.history?.points ?? [])

/** Spoken description of the equity curve, since the chart itself is a canvas. */
const historyLabel = computed(() => {
  const points = historyPoints.value
  const first = points[0]?.value
  const last = points[points.length - 1]?.value
  if (first === undefined || last === undefined) return 'Portfolio value over time'
  const change = first > 0 ? ((last - first) / first) * 100 : 0
  return `Portfolio value over the last ${range.value}: from ${formatCurrency(first)} to ${formatCurrency(last)}, ${formatPercent(change)}.`
})

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
  <section class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold text-color">Portfolio</h1>
      <p class="mt-1 text-sm text-muted-color">
        Holdings and performance of the shared Alpaca paper account.
      </p>
    </div>

    <!-- Summary header -->
    <div
      class="rounded-border border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
    >
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-10">
        <div>
          <p class="text-sm text-muted-color">Total Value</p>
          <template v-if="portfolio.initialLoading">
            <Skeleton height="2.25rem" width="10rem" class="mt-1" />
            <Skeleton height="0.9rem" width="7rem" class="mt-2" />
          </template>
          <template v-else>
            <p class="mt-1 text-3xl font-bold tabular-nums text-color">
              {{ portfolio.summary ? formatCurrency(portfolio.summary.totalValue) : '—' }}
            </p>
            <div v-if="portfolio.summary" class="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
              <PriceTag :value="portfolio.summary.dayChange" format="currency" show-arrow />
              <PriceTag
                :value="portfolio.summary.dayChangePercent"
                format="percent"
                class="text-muted-color"
              />
              <span class="text-muted-color">today</span>
            </div>
          </template>
        </div>

        <div class="hidden h-12 w-px bg-surface-200 dark:bg-surface-800 sm:block" />

        <div>
          <p class="text-sm text-muted-color">Total Return (open P/L)</p>
          <Skeleton
            v-if="portfolio.positionsInitialLoading"
            height="2rem"
            width="9rem"
            class="mt-1"
          />
          <div v-else class="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold">
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

        <div
          v-if="portfolio.positionsInitialLoading"
          role="status"
          aria-label="Loading allocation"
          class="flex flex-col items-center gap-4 py-4 sm:flex-row sm:gap-8"
        >
          <Skeleton shape="circle" size="9rem" class="shrink-0" />
          <div class="w-full space-y-2.5">
            <Skeleton v-for="row in 4" :key="row" height="0.8rem" />
          </div>
        </div>
        <AllocationDonut v-else-if="portfolio.allocation.length" :slices="portfolio.allocation" />
        <EmptyState
          v-else
          compact
          icon="pi pi-chart-pie"
          title="Nothing to allocate yet"
          message="Buy something in the paper account and its share of the portfolio shows up here."
        />
      </div>

      <!-- Performance -->
      <div
        class="flex flex-col rounded-border border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
      >
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
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

          <Skeleton
            v-else-if="portfolio.historyInitialLoading"
            height="100%"
            width="100%"
            role="status"
            aria-label="Loading performance history"
          />

          <template v-else-if="historyPoints.length">
            <PortfolioChart :points="historyPoints" :aria-label="historyLabel" />
            <!-- Range switches keep the old curve on screen; this marks it as stale. -->
            <div
              v-if="portfolio.historyLoading"
              class="absolute inset-0 flex items-center justify-center bg-surface-0/60 dark:bg-surface-900/60"
            >
              <ProgressSpinner style="width: 2.5rem; height: 2.5rem" />
            </div>
          </template>

          <EmptyState
            v-else
            compact
            icon="pi pi-chart-line"
            title="No performance history yet"
            message="Alpaca starts recording equity once the account has activity."
          />
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

      <TableSkeleton
        v-else-if="portfolio.positionsInitialLoading"
        :rows="4"
        :columns="5"
        avatar
        label="Loading holdings"
      />

      <EmptyState
        v-else-if="!hasPositions"
        icon="pi pi-briefcase"
        title="No open positions"
        message="Positions from your paper account will appear here once you hold something."
      />

      <DataTable
        v-else
        :value="portfolio.positions"
        data-key="symbol"
        row-hover
        table-style="min-width: 26rem"
        :table-props="{ 'aria-label': 'Open positions' }"
      >
        <Column field="symbol" header="Symbol" sortable>
          <template #body="{ data }">
            <button
              type="button"
              class="group flex items-center gap-3 rounded-border text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              :aria-label="`Open ${data.symbol} chart`"
              @click="openChart(data.symbol)"
            >
              <Avatar :label="data.symbol.charAt(0)" shape="circle" class="hidden sm:inline-flex" />
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

        <!-- Cost basis is reference data; on a phone the P/L columns matter more. -->
        <Column
          field="avgEntryPrice"
          header="Avg Cost"
          sortable
          header-class="hidden sm:table-cell"
          body-class="hidden sm:table-cell"
        >
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
