import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PortfolioSummary, Position } from '@/types/market'
import { fetchPortfolioSummary, fetchPositions } from '@/services/marketData'

export const usePortfolioStore = defineStore('portfolio', () => {
  const summary = ref<PortfolioSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const positions = ref<Position[]>([])
  const positionsLoading = ref(false)
  const positionsError = ref<string | null>(null)

  /** Load account-level metrics (drives the dashboard stat cards). */
  async function load() {
    loading.value = true
    error.value = null
    try {
      summary.value = await fetchPortfolioSummary()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load portfolio'
    } finally {
      loading.value = false
    }
  }

  /** Load open holdings (for the Portfolio page — Phase 8). */
  async function loadPositions() {
    positionsLoading.value = true
    positionsError.value = null
    try {
      positions.value = await fetchPositions()
    } catch (e) {
      positionsError.value = e instanceof Error ? e.message : 'Failed to load positions'
    } finally {
      positionsLoading.value = false
    }
  }

  return {
    summary,
    loading,
    error,
    load,
    positions,
    positionsLoading,
    positionsError,
    loadPositions,
  }
})
