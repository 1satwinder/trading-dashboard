import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SymbolSearchResult } from '@/types/market'
import { searchSymbols } from '@/services/marketData'

/**
 * Symbol-search state for the top-bar AutoComplete. Debouncing is handled by
 * AutoComplete's `delay` prop; this store just runs the request and holds
 * results/loading/error for the current query.
 */
export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref<SymbolSearchResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let seq = 0

  async function search(q: string) {
    query.value = q
    const current = ++seq
    if (!q.trim()) {
      results.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      const found = await searchSymbols(q)
      // Ignore out-of-order responses from earlier keystrokes.
      if (current === seq) results.value = found
    } catch (e) {
      if (current === seq) {
        error.value = e instanceof Error ? e.message : 'Search failed'
        results.value = []
      }
    } finally {
      if (current === seq) loading.value = false
    }
  }

  function clear() {
    query.value = ''
    results.value = []
    error.value = null
  }

  return { query, results, loading, error, search, clear }
})
