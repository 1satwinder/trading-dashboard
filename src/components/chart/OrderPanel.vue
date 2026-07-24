<script setup lang="ts">
import { computed, ref } from 'vue'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{ symbol: string; price: number }>()

const toast = useToast()

type Side = 'buy' | 'sell'
type OrderType = 'market' | 'limit' | 'stop'

const side = ref<Side>('buy')
const orderType = ref<OrderType>('market')
const quantity = ref<number>(10)
const limitPrice = ref<number | null>(null)
const stopPrice = ref<number | null>(null)

const orderTypes = [
  { label: 'Market', value: 'market' },
  { label: 'Limit', value: 'limit' },
  { label: 'Stop', value: 'stop' },
]

/** Price used to estimate cost: last price for market, else the entered price. */
const effectivePrice = computed(() => {
  if (orderType.value === 'limit') return limitPrice.value ?? props.price
  if (orderType.value === 'stop') return stopPrice.value ?? props.price
  return props.price
})

const estimatedCost = computed(() => Math.max(0, (quantity.value || 0) * effectivePrice.value))

const submitLabel = computed(() => `Review ${side.value === 'buy' ? 'Buy' : 'Sell'} Order`)

const orderNote = computed(() =>
  orderType.value === 'market'
    ? 'Market orders are executed at the best available price.'
    : `${orderType.value === 'limit' ? 'Limit' : 'Stop'} orders execute only when your price is reached.`,
)

function reviewOrder() {
  // Non-functional until Phase 8 (Alpaca paper trading, server-side via the BFF).
  toast.add({
    severity: 'info',
    summary: 'Trading coming soon',
    detail: `Paper trading (Alpaca) is wired up in Phase 8. This ${side.value} ticket for ${quantity.value} ${props.symbol} is a UI preview.`,
    life: 4000,
  })
}
</script>

<template>
  <aside
    class="h-fit rounded-border border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
  >
    <!-- Buy / Sell -->
    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="rounded-border py-2 text-sm font-semibold transition-colors"
        :class="
          side === 'buy'
            ? 'bg-buy text-white'
            : 'bg-surface-100 text-muted-color hover:text-color dark:bg-surface-800'
        "
        @click="side = 'buy'"
      >
        Buy
      </button>
      <button
        type="button"
        class="rounded-border py-2 text-sm font-semibold transition-colors"
        :class="
          side === 'sell'
            ? 'bg-sell text-white'
            : 'bg-surface-100 text-muted-color hover:text-color dark:bg-surface-800'
        "
        @click="side = 'sell'"
      >
        Sell
      </button>
    </div>

    <!-- Order type -->
    <div class="mt-4">
      <label class="mb-1 block text-sm text-muted-color">Order Type</label>
      <Select
        v-model="orderType"
        :options="orderTypes"
        option-label="label"
        option-value="value"
        fluid
      />
    </div>

    <!-- Limit / Stop price -->
    <div v-if="orderType === 'limit'" class="mt-4">
      <label class="mb-1 block text-sm text-muted-color">Limit Price</label>
      <InputNumber
        v-model="limitPrice"
        mode="currency"
        currency="USD"
        :min="0"
        :placeholder="formatCurrency(price)"
        fluid
      />
    </div>
    <div v-else-if="orderType === 'stop'" class="mt-4">
      <label class="mb-1 block text-sm text-muted-color">Stop Price</label>
      <InputNumber
        v-model="stopPrice"
        mode="currency"
        currency="USD"
        :min="0"
        :placeholder="formatCurrency(price)"
        fluid
      />
    </div>

    <!-- Quantity -->
    <div class="mt-4">
      <label class="mb-1 block text-sm text-muted-color">Quantity</label>
      <InputNumber v-model="quantity" show-buttons :min="1" :step="1" fluid />
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
      :label="submitLabel"
      class="mt-4 w-full"
      :severity="side === 'buy' ? 'success' : 'danger'"
      @click="reviewOrder"
    />

    <p class="mt-3 flex items-start gap-1.5 text-xs text-muted-color">
      <i class="pi pi-info-circle mt-0.5" />
      <span>{{ orderNote }}</span>
    </p>
  </aside>
</template>
