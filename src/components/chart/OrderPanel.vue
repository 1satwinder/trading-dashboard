<script setup lang="ts">
import { computed, ref } from 'vue'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import type { OrderSide, TicketOrderType, TicketTimeInForce } from '@/types/market'
import { useOrdersStore } from '@/stores/orders'
import { useAuthStore } from '@/stores/auth'
import { AuthRequiredError } from '@/services/marketData'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{ symbol: string; price: number }>()

const toast = useToast()
const orders = useOrdersStore()
const auth = useAuthStore()

const side = ref<OrderSide>('buy')
const orderType = ref<TicketOrderType>('market')
const timeInForce = ref<TicketTimeInForce>('day')
const quantity = ref<number>(10)
const limitPrice = ref<number | null>(null)
const stopPrice = ref<number | null>(null)

const orderTypes = [
  { label: 'Market', value: 'market' },
  { label: 'Limit', value: 'limit' },
  { label: 'Stop', value: 'stop' },
]

const timeInForceOptions = [
  { label: 'Day', value: 'day' },
  { label: 'Good til canceled', value: 'gtc' },
]

/** Price used to estimate cost: last price for market, else the entered price. */
const effectivePrice = computed(() => {
  if (orderType.value === 'limit') return limitPrice.value ?? props.price
  if (orderType.value === 'stop') return stopPrice.value ?? props.price
  return props.price
})

const estimatedCost = computed(() => Math.max(0, (quantity.value || 0) * effectivePrice.value))

const submitLabel = computed(() => `Review ${side.value === 'buy' ? 'Buy' : 'Sell'} Order`)

const orderNote = computed(() => {
  if (!auth.isAuthenticated) return 'Read-only demo — sign in to place paper orders.'
  return orderType.value === 'market'
    ? 'Market orders are executed at the best available price.'
    : `${orderType.value === 'limit' ? 'Limit' : 'Stop'} orders execute only when your price is reached.`
})

const reviewVisible = ref(false)

/** Blocks submission when a limit/stop order is missing its trigger price. */
const missingPrice = computed(() => {
  if (orderType.value === 'limit') return !limitPrice.value
  if (orderType.value === 'stop') return !stopPrice.value
  return false
})

const priceLabel = computed(() =>
  orderType.value === 'market' ? 'Market' : formatCurrency(effectivePrice.value),
)

function reviewOrder() {
  if (missingPrice.value) {
    toast.add({
      severity: 'warn',
      summary: 'Price required',
      detail: `Enter a ${orderType.value} price before placing the order.`,
      life: 4000,
    })
    return
  }
  reviewVisible.value = true
}

/** Send the reviewed ticket to the BFF, which places it with Alpaca. */
async function submitOrder() {
  try {
    const order = await orders.place({
      symbol: props.symbol,
      side: side.value,
      type: orderType.value,
      timeInForce: timeInForce.value,
      qty: quantity.value,
      limitPrice: orderType.value === 'limit' ? (limitPrice.value ?? undefined) : undefined,
      stopPrice: orderType.value === 'stop' ? (stopPrice.value ?? undefined) : undefined,
    })
    reviewVisible.value = false
    toast.add({
      severity: 'success',
      summary: 'Order placed',
      detail: `${order.side === 'buy' ? 'Buy' : 'Sell'} ${order.qty} ${order.symbol} — ${order.status.replace(/_/g, ' ')}.`,
      life: 4000,
    })
  } catch (e) {
    // The cookie can expire between opening the ticket and confirming it.
    if (e instanceof AuthRequiredError) {
      auth.markSignedOut()
      reviewVisible.value = false
      auth.openPrompt()
      return
    }
    toast.add({
      severity: 'error',
      summary: 'Order rejected',
      detail: e instanceof Error ? e.message : 'Could not place the order.',
      life: 6000,
    })
  }
}
</script>

<template>
  <aside
    class="h-fit self-start rounded-border border border-surface-200 bg-surface-0 p-4 lg:sticky lg:top-20 dark:border-surface-800 dark:bg-surface-900"
    aria-label="Order ticket"
  >
    <!--
      Selected side is otherwise conveyed by fill colour alone, which neither a
      screen reader nor a colour-blind user gets — hence the group + aria-pressed.

      Resting label is surface-600, not text-muted-color: muted is 4.3:1 on the
      surface-100 track in the light theme. The `*-contrast` tokens are the label
      for the fills, which are themselves per-theme (see main.css).
    -->
    <div class="grid grid-cols-2 gap-2" role="group" aria-label="Order side">
      <button
        type="button"
        class="rounded-border py-2 text-sm font-semibold transition-colors"
        :class="
          side === 'buy'
            ? 'bg-buy text-buy-contrast'
            : 'bg-surface-100 text-surface-600 hover:text-color dark:bg-surface-800 dark:text-surface-400'
        "
        :aria-pressed="side === 'buy'"
        @click="side = 'buy'"
      >
        Buy
      </button>
      <button
        type="button"
        class="rounded-border py-2 text-sm font-semibold transition-colors"
        :class="
          side === 'sell'
            ? 'bg-sell text-sell-contrast'
            : 'bg-surface-100 text-surface-600 hover:text-color dark:bg-surface-800 dark:text-surface-400'
        "
        :aria-pressed="side === 'sell'"
        @click="side = 'sell'"
      >
        Sell
      </button>
    </div>

    <!-- Order type -->
    <div class="mt-4">
      <label for="order-type" class="mb-1 block text-sm text-muted-color">Order Type</label>
      <Select
        v-model="orderType"
        input-id="order-type"
        :options="orderTypes"
        option-label="label"
        option-value="value"
        fluid
      />
    </div>

    <!-- Limit / Stop price -->
    <div v-if="orderType === 'limit'" class="mt-4">
      <label for="order-limit-price" class="mb-1 block text-sm text-muted-color">Limit Price</label>
      <InputNumber
        v-model="limitPrice"
        input-id="order-limit-price"
        mode="currency"
        currency="USD"
        :min="0"
        :placeholder="formatCurrency(price)"
        fluid
      />
    </div>
    <div v-else-if="orderType === 'stop'" class="mt-4">
      <label for="order-stop-price" class="mb-1 block text-sm text-muted-color">Stop Price</label>
      <InputNumber
        v-model="stopPrice"
        input-id="order-stop-price"
        mode="currency"
        currency="USD"
        :min="0"
        :placeholder="formatCurrency(price)"
        fluid
      />
    </div>

    <!-- Quantity -->
    <div class="mt-4">
      <label for="order-quantity" class="mb-1 block text-sm text-muted-color">Quantity</label>
      <InputNumber
        v-model="quantity"
        input-id="order-quantity"
        show-buttons
        :min="1"
        :step="1"
        fluid
      />
    </div>

    <!-- Time in force -->
    <div class="mt-4">
      <label for="order-tif" class="mb-1 block text-sm text-muted-color">Time in Force</label>
      <Select
        v-model="timeInForce"
        input-id="order-tif"
        :options="timeInForceOptions"
        option-label="label"
        option-value="value"
        fluid
      />
    </div>

    <!-- Estimated cost -->
    <div class="mt-4">
      <div class="text-sm text-muted-color">Estimated Cost</div>
      <div class="text-2xl font-bold tabular-nums text-color">
        {{ formatCurrency(estimatedCost) }}
      </div>
      <div class="text-xs text-muted-color">≈ {{ quantity || 0 }} shares</div>
    </div>

    <Button
      v-if="auth.isAuthenticated"
      :label="submitLabel"
      class="mt-4 w-full"
      :severity="side === 'buy' ? 'success' : 'danger'"
      :loading="orders.submitting"
      @click="reviewOrder"
    />
    <Button
      v-else
      label="Sign in to trade"
      icon="pi pi-lock"
      class="mt-4 w-full"
      severity="secondary"
      outlined
      @click="auth.openPrompt()"
    />

    <p class="mt-3 flex items-start gap-1.5 text-xs text-muted-color">
      <i class="pi pi-info-circle mt-0.5" aria-hidden="true" />
      <span>{{ orderNote }}</span>
    </p>

    <!-- Review + confirm -->
    <Dialog
      v-model:visible="reviewVisible"
      modal
      header="Review order"
      :style="{ width: '22rem' }"
      :draggable="false"
    >
      <dl class="space-y-2 text-sm">
        <div class="flex items-center justify-between gap-4">
          <dt class="text-muted-color">Action</dt>
          <dd class="font-semibold" :class="side === 'buy' ? 'text-buy' : 'text-sell'">
            {{ side === 'buy' ? 'Buy' : 'Sell' }} {{ quantity }} {{ symbol }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-muted-color">Order type</dt>
          <dd class="text-color capitalize">{{ orderType }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-muted-color">Price</dt>
          <dd class="tabular-nums text-color">{{ priceLabel }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-muted-color">Time in force</dt>
          <dd class="text-color uppercase">{{ timeInForce }}</dd>
        </div>
        <div
          class="flex items-center justify-between gap-4 border-t border-surface-200 pt-2 dark:border-surface-700"
        >
          <dt class="text-muted-color">Estimated cost</dt>
          <dd class="font-semibold tabular-nums text-color">{{ formatCurrency(estimatedCost) }}</dd>
        </div>
      </dl>

      <p class="mt-3 flex items-start gap-1.5 text-xs text-muted-color">
        <i class="pi pi-info-circle mt-0.5" aria-hidden="true" />
        <span>Paper trading via Alpaca — no real money is involved.</span>
      </p>

      <template #footer>
        <Button
          label="Cancel"
          text
          severity="secondary"
          :disabled="orders.submitting"
          @click="reviewVisible = false"
        />
        <Button
          :label="`Place ${side === 'buy' ? 'Buy' : 'Sell'} Order`"
          :severity="side === 'buy' ? 'success' : 'danger'"
          :loading="orders.submitting"
          @click="submitOrder"
        />
      </template>
    </Dialog>
  </aside>
</template>
