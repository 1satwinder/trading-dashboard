<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { Order, OrderStatus } from '@/types/market'
import { isOrderOpen } from '@/types/market'
import { formatCurrency } from '@/utils/format'

defineProps<{
  orders: Order[]
  /** Id of the order currently being canceled, to show a spinner on its button. */
  cancelingId?: string | null
  /** Cancelling is a write, so it needs a session (ADR-024). Hidden when absent. */
  canCancel?: boolean
  emptyMessage?: string
}>()

const emit = defineEmits<{ cancel: [order: Order] }>()

type Severity = 'success' | 'danger' | 'warn' | 'info' | 'secondary'

/** Map Alpaca's order lifecycle onto PrimeVue tag severities. */
function statusSeverity(status: OrderStatus): Severity {
  switch (status) {
    case 'filled':
      return 'success'
    case 'rejected':
    case 'suspended':
      return 'danger'
    case 'partially_filled':
    case 'pending_cancel':
    case 'pending_replace':
    case 'held':
      return 'warn'
    case 'canceled':
    case 'expired':
    case 'replaced':
    case 'done_for_day':
      return 'secondary'
    default:
      return 'info'
  }
}

function statusLabel(status: OrderStatus): string {
  return status.replace(/_/g, ' ')
}

/** The price that matters for this order: its trigger, or what it filled at. */
function priceLabel(order: Order): string {
  if (order.filledAvgPrice !== undefined) return formatCurrency(order.filledAvgPrice)
  if (order.limitPrice !== undefined) return formatCurrency(order.limitPrice)
  if (order.stopPrice !== undefined) return formatCurrency(order.stopPrice)
  return 'Market'
}

function submittedLabel(submittedAt: string): string {
  if (!submittedAt) return '—'
  const date = new Date(submittedAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>

<template>
  <!--
    Deliberately not using DataTable's `loading` overlay: our BFF responses are
    cached and near-instant, and a true→false flip within a few ms can orphan
    PrimeVue's overlay leave-transition, leaving a click-blocking mask over the
    table. The page shows a spinner for the initial load instead.
  -->
  <DataTable
    :value="orders"
    data-key="id"
    row-hover
    paginator
    :rows="15"
    :always-show-paginator="false"
  >
    <template #empty>
      <p class="py-6 text-center text-sm text-muted-color">
        {{ emptyMessage ?? 'No orders to show.' }}
      </p>
    </template>

    <Column field="symbol" header="Symbol" sortable>
      <template #body="{ data }">
        <span class="font-semibold text-color">{{ data.symbol }}</span>
      </template>
    </Column>

    <Column field="side" header="Side" sortable>
      <template #body="{ data }">
        <span
          class="font-semibold capitalize"
          :class="data.side === 'buy' ? 'text-buy' : 'text-sell'"
        >
          {{ data.side }}
        </span>
      </template>
    </Column>

    <Column
      field="type"
      header="Type"
      sortable
      header-class="hidden sm:table-cell"
      body-class="hidden sm:table-cell"
    >
      <template #body="{ data }">
        <span class="capitalize text-color">{{ data.type.replace('_', ' ') }}</span>
        <span class="ml-1 text-xs uppercase text-muted-color">{{ data.timeInForce }}</span>
      </template>
    </Column>

    <Column field="qty" header="Qty" sortable>
      <template #body="{ data }">
        <span class="tabular-nums text-color">{{ data.filledQty }}/{{ data.qty }}</span>
      </template>
    </Column>

    <Column header="Price">
      <template #body="{ data }">
        <span class="tabular-nums text-color">{{ priceLabel(data) }}</span>
      </template>
    </Column>

    <Column field="status" header="Status" sortable>
      <template #body="{ data }">
        <Tag
          :value="statusLabel(data.status)"
          :severity="statusSeverity(data.status)"
          class="capitalize"
        />
      </template>
    </Column>

    <Column
      field="submittedAt"
      header="Submitted"
      sortable
      header-class="hidden lg:table-cell"
      body-class="hidden lg:table-cell"
    >
      <template #body="{ data }">
        <span class="text-sm text-muted-color">{{ submittedLabel(data.submittedAt) }}</span>
      </template>
    </Column>

    <Column header="" body-class="w-12">
      <template #body="{ data }">
        <Button
          v-if="canCancel && isOrderOpen(data.status)"
          icon="pi pi-times"
          text
          rounded
          size="small"
          severity="secondary"
          :loading="cancelingId === data.id"
          :aria-label="`Cancel ${data.symbol} order`"
          :title="`Cancel ${data.symbol} order`"
          @click="emit('cancel', data)"
        />
      </template>
    </Column>
  </DataTable>
</template>
