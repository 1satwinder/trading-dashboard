<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'
import OrdersTable from '@/components/orders/OrdersTable.vue'
import type { Order } from '@/types/market'
import { isOrderOpen } from '@/types/market'
import { useOrdersStore } from '@/stores/orders'

const orders = useOrdersStore()
const toast = useToast()

type FilterId = 'all' | 'open' | 'filled' | 'canceled'

const filter = ref<FilterId>('all')

/**
 * Buckets are mutually exclusive and exhaustive, so the tab counts add up to
 * "All": anything still working is Open, a complete fill is Filled, and every
 * other terminal state (canceled, expired, rejected, replaced) lands in the
 * last bucket.
 */
function matchesFilter(order: Order, id: FilterId): boolean {
  switch (id) {
    case 'open':
      return isOrderOpen(order.status)
    case 'filled':
      return order.status === 'filled'
    case 'canceled':
      return !isOrderOpen(order.status) && order.status !== 'filled'
    default:
      return true
  }
}

function countFor(id: FilterId): number {
  return orders.orders.filter((o) => matchesFilter(o, id)).length
}

const filterOptions = computed(() =>
  (
    [
      { id: 'all', label: 'All' },
      { id: 'open', label: 'Open' },
      { id: 'filled', label: 'Filled' },
      { id: 'canceled', label: 'Canceled' },
    ] as const
  ).map((option) => ({
    value: option.id,
    label: `${option.label} ${countFor(option.id)}`,
  })),
)

const visibleOrders = computed(() => orders.orders.filter((o) => matchesFilter(o, filter.value)))

/** Only the very first fetch blocks the table; refreshes use the button's spinner. */
const initialLoading = computed(() => orders.loading && orders.orders.length === 0)

const emptyMessage = computed(() => {
  if (orders.orders.length === 0) {
    return 'No orders yet — place a paper order from a symbol\u2019s chart and it will show up here.'
  }
  switch (filter.value) {
    case 'open':
      return 'No working orders right now.'
    case 'filled':
      return 'No filled orders yet.'
    case 'canceled':
      return 'No canceled or expired orders.'
    default:
      return 'No orders to show.'
  }
})

async function cancel(order: Order) {
  try {
    await orders.cancel(order.id)
    toast.add({
      severity: 'success',
      summary: 'Order canceled',
      detail: `${order.side === 'buy' ? 'Buy' : 'Sell'} ${order.qty} ${order.symbol} was canceled.`,
      life: 4000,
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Could not cancel',
      detail: e instanceof Error ? e.message : 'The order could not be canceled.',
      life: 6000,
    })
  }
}

onMounted(() => {
  orders.load()
  orders.startPolling()
})

onUnmounted(() => {
  orders.stopPolling()
})
</script>

<template>
  <section class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-color">Orders</h1>
        <p class="mt-1 text-sm text-muted-color">
          Paper orders placed through Alpaca.
          <template v-if="orders.hasOpenOrders">
            {{ orders.openOrders.length }} still working — updating live.
          </template>
        </p>
      </div>

      <Button
        icon="pi pi-refresh"
        label="Refresh"
        size="small"
        severity="secondary"
        outlined
        :loading="orders.loading"
        @click="orders.load()"
      />
    </div>

    <Message v-if="orders.error" severity="error" :closable="false">
      {{ orders.error }}
    </Message>

    <!-- Status filter -->
    <SelectButton
      v-model="filter"
      :options="filterOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      aria-label="Filter orders by status"
      size="small"
    />

    <div
      class="overflow-hidden rounded-border border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <div v-if="initialLoading" class="flex justify-center py-16">
        <ProgressSpinner style="width: 2.5rem; height: 2.5rem" />
      </div>

      <OrdersTable
        v-else
        :orders="visibleOrders"
        :canceling-id="orders.cancelingId"
        :empty-message="emptyMessage"
        @cancel="cancel"
      />
    </div>
  </section>
</template>
