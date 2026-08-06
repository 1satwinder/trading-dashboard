import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Order, OrderRequest, OrderStatusFilter } from '@/types/market'
import { isOrderOpen } from '@/types/market'
import { cancelOrder, fetchOrders, placeOrder } from '@/services/marketData'
import { usePortfolioStore } from '@/stores/portfolio'

/** How often to re-poll while at least one order is still working. */
const POLL_INTERVAL_MS = 5_000

/**
 * Paper-trading orders (Phase 9). Placement and cancellation go through the BFF,
 * which owns the Alpaca keys — the browser never talks to Alpaca directly.
 *
 * Order state is refreshed by polling while there are open orders; we don't
 * subscribe to Alpaca's trade-updates stream (it needs server-side auth, and the
 * WebSocket-behind-BFF work is still open from Phase 6). See ADR-018.
 */
export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const submitting = ref(false)
  const cancelingId = ref<string | null>(null)

  const openOrders = computed(() => orders.value.filter((o) => isOrderOpen(o.status)))
  const hasOpenOrders = computed(() => openOrders.value.length > 0)

  /**
   * Fetch orders. Background polling passes `silent` so the table doesn't flash a
   * loading overlay every few seconds; only user-initiated loads show progress.
   */
  async function load(status: OrderStatusFilter = 'all', options: { silent?: boolean } = {}) {
    if (!options.silent) loading.value = true
    error.value = null
    try {
      orders.value = await fetchOrders(status)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load orders'
    } finally {
      loading.value = false
    }
  }

  /** Refresh the account + holdings so a fill shows up in the portfolio. */
  async function refreshPortfolio() {
    const portfolio = usePortfolioStore()
    await Promise.all([portfolio.load(), portfolio.loadPositions()])
  }

  /**
   * Place an order. Resolves with the accepted order; throws with the upstream
   * reason (e.g. "insufficient buying power") so the caller can toast it.
   */
  async function place(input: OrderRequest): Promise<Order> {
    submitting.value = true
    try {
      const order = await placeOrder(input)
      await Promise.all([load(), refreshPortfolio()])
      return order
    } finally {
      submitting.value = false
    }
  }

  /** Cancel an open order. Throws with the upstream reason on failure. */
  async function cancel(id: string): Promise<void> {
    cancelingId.value = id
    try {
      await cancelOrder(id)
      await Promise.all([load(), refreshPortfolio()])
    } finally {
      cancelingId.value = null
    }
  }

  // ---- Polling --------------------------------------------------------------

  let timer: ReturnType<typeof setInterval> | null = null

  /** Poll for order updates, but only while something is still working. */
  function startPolling() {
    if (timer) return
    timer = setInterval(() => {
      if (hasOpenOrders.value && !loading.value) void load('all', { silent: true })
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  return {
    orders,
    loading,
    error,
    submitting,
    cancelingId,
    openOrders,
    hasOpenOrders,
    load,
    place,
    cancel,
    startPolling,
    stopPolling,
  }
})
