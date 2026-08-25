import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  MarketClock,
  MarketIndex,
  MarketMovers,
  MarketRegion,
  SectorPerformance,
} from '@/types/market'
import {
  fetchMarketClock,
  fetchMarketIndices,
  fetchMovers,
  fetchSectors,
} from '@/services/marketData'

/** How often to refresh while the market is open. */
const POLL_INTERVAL_MS = 60_000

/**
 * Markets page state (Phase 10 — ADR-020).
 *
 * Three independent concerns — benchmarks, movers and sectors — each with their
 * own loading/error flags so one failing section doesn't blank the page. Movers
 * and sectors are region-scoped; the index cards span both.
 */
export const useMarketsStore = defineStore('markets', () => {
  const region = ref<MarketRegion>('us')

  const clock = ref<MarketClock | null>(null)

  const indices = ref<MarketIndex[]>([])
  const indicesLoading = ref(false)
  const indicesError = ref<string | null>(null)

  const movers = ref<MarketMovers | null>(null)
  const moversLoading = ref(false)
  const moversError = ref<string | null>(null)

  const sectors = ref<SectorPerformance[]>([])
  const sectorsLoading = ref(false)
  const sectorsError = ref<string | null>(null)

  const isMarketOpen = computed(() => clock.value?.isOpen ?? false)

  /**
   * Skeletons only while a section has nothing to show — the 60s poll refreshes
   * in place, and a region switch clears its two sections so they fall back here
   * instead of captioning US rows as Canadian ones.
   */
  const indicesInitialLoading = computed(() => indicesLoading.value && indices.value.length === 0)
  const moversInitialLoading = computed(() => moversLoading.value && !movers.value)
  const sectorsInitialLoading = computed(() => sectorsLoading.value && sectors.value.length === 0)

  /**
   * Background refreshes pass `silent` so the page doesn't flash spinners every
   * minute; only the first load and the Refresh button show progress.
   */
  interface LoadOptions {
    silent?: boolean
  }

  /** Session state. Failures are non-fatal — the pill just stays hidden. */
  async function loadClock() {
    try {
      clock.value = await fetchMarketClock()
    } catch {
      clock.value = null
    }
  }

  async function loadIndices(options: LoadOptions = {}) {
    if (!options.silent) indicesLoading.value = true
    indicesError.value = null
    try {
      indices.value = await fetchMarketIndices()
    } catch (e) {
      indicesError.value = e instanceof Error ? e.message : 'Failed to load indices'
    } finally {
      indicesLoading.value = false
    }
  }

  async function loadMovers(options: LoadOptions = {}) {
    if (!options.silent) moversLoading.value = true
    moversError.value = null
    const requested = region.value
    try {
      const result = await fetchMovers(requested)
      // Ignore a slow response for a region the user already switched away from.
      if (region.value === requested) movers.value = result
    } catch (e) {
      moversError.value = e instanceof Error ? e.message : 'Failed to load movers'
    } finally {
      moversLoading.value = false
    }
  }

  async function loadSectors(options: LoadOptions = {}) {
    if (!options.silent) sectorsLoading.value = true
    sectorsError.value = null
    const requested = region.value
    try {
      const result = await fetchSectors(requested)
      if (region.value === requested) sectors.value = result
    } catch (e) {
      sectorsError.value = e instanceof Error ? e.message : 'Failed to load sectors'
    } finally {
      sectorsLoading.value = false
    }
  }

  /** Load everything in parallel — the four endpoints are independent. */
  async function load(options: LoadOptions = {}) {
    await Promise.all([
      loadClock(),
      loadIndices(options),
      loadMovers(options),
      loadSectors(options),
    ])
  }

  /** Switch region; only the region-scoped sections need refetching. */
  function setRegion(next: MarketRegion) {
    if (next === region.value) return
    region.value = next
    // Drop the outgoing region's rows: the headings above them already say
    // "Canadian large caps" / "the whole US market", so leaving them up would
    // label one region's movers with the other's scope.
    movers.value = null
    sectors.value = []
    void Promise.all([loadMovers(), loadSectors()])
  }

  // ---- Polling --------------------------------------------------------------

  let timer: ReturnType<typeof setInterval> | null = null

  /**
   * Refresh on a timer, but only while the market is actually open — prices
   * don't move overnight or at weekends, so polling then just burns quota.
   */
  function startPolling() {
    if (timer) return
    timer = setInterval(() => {
      void loadClock()
      if (isMarketOpen.value) void load({ silent: true })
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  return {
    region,
    clock,
    isMarketOpen,
    indices,
    indicesLoading,
    indicesInitialLoading,
    indicesError,
    movers,
    moversLoading,
    moversInitialLoading,
    moversError,
    sectors,
    sectorsLoading,
    sectorsInitialLoading,
    sectorsError,
    load,
    loadIndices,
    loadMovers,
    loadSectors,
    setRegion,
    startPolling,
    stopPolling,
  }
})
