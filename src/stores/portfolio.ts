import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PortfolioSummary } from '@/types/market'
import { fetchPortfolioSummary } from '@/services/marketData'

export const usePortfolioStore = defineStore('portfolio', () => {
  const summary = ref<PortfolioSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

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

  return { summary, loading, error, load }
})
