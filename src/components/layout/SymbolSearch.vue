<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import type {
  AutoCompleteCompleteEvent,
  AutoCompleteOptionSelectEvent,
} from 'primevue/autocomplete'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useSearchStore } from '@/stores/search'
import { useWatchlistStore } from '@/stores/watchlist'
import type { SymbolSearchResult } from '@/types/market'

const props = withDefaults(defineProps<{ autofocus?: boolean }>(), { autofocus: false })
const emit = defineEmits<{ select: [result: SymbolSearchResult] }>()

const search = useSearchStore()
const watchlist = useWatchlistStore()
const toast = useToast()

/** AutoComplete's v-model: a string while typing, a result object on select. */
const selected = ref<string | SymbolSearchResult>('')
const autocomplete = useTemplateRef('autocomplete')

onMounted(() => {
  if (!props.autofocus) return
  nextTick(() => {
    const el = (autocomplete.value as { $el?: HTMLElement } | null)?.$el
    el?.querySelector('input')?.focus()
  })
})

function onComplete(event: AutoCompleteCompleteEvent) {
  void search.search(event.query)
}

async function onSelect(event: AutoCompleteOptionSelectEvent) {
  const result = event.value as SymbolSearchResult
  const added = await watchlist.add(result)
  toast.add(
    added
      ? {
          severity: 'success',
          summary: 'Added to watchlist',
          detail: `${result.symbol} — ${result.name}`,
          life: 2500,
        }
      : {
          severity: 'info',
          summary: 'Already in watchlist',
          detail: result.symbol,
          life: 2000,
        },
  )
  // Reset the input so it's ready for the next search.
  selected.value = ''
  search.clear()
  emit('select', result)
}
</script>

<template>
  <AutoComplete
    ref="autocomplete"
    v-model="selected"
    :suggestions="search.results"
    :loading="search.loading"
    option-label="symbol"
    placeholder="Search stocks, ETFs by name or ticker..."
    complete-on-focus
    :delay="300"
    :min-length="1"
    input-class="w-full"
    class="w-full"
    fluid
    @complete="onComplete"
    @option-select="onSelect"
  >
    <template #option="{ option }">
      <div class="flex w-full items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="font-semibold text-color">{{ option.symbol }}</div>
          <div class="truncate text-xs text-muted-color">{{ option.name }}</div>
        </div>
        <Tag
          v-if="watchlist.has(option.symbol)"
          value="Added"
          severity="secondary"
          class="shrink-0"
        />
        <span v-else class="shrink-0 text-xs text-muted-color">{{ option.type }}</span>
      </div>
    </template>
    <template #empty>
      <div class="px-3 py-2 text-sm text-muted-color">
        <span v-if="search.error" class="text-down">{{ search.error }}</span>
        <span v-else-if="search.query">No matches for “{{ search.query }}”.</span>
        <span v-else>Type a company name or ticker.</span>
      </div>
    </template>
  </AutoComplete>
</template>
