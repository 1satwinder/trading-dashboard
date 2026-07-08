import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Quote } from '@/types/market'
import { fetchWatchlist } from '@/services/marketData'

export const useWatchlistStore = defineStore('watchlist', () => {
  const items = ref<Quote[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      items.value = await fetchWatchlist()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load watchlist'
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, load }
})
