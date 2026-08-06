<script setup lang="ts">
import { useRouter } from 'vue-router'
import PriceTag from '@/components/common/PriceTag.vue'
import Sparkline from '@/components/common/Sparkline.vue'
import type { MarketIndex } from '@/types/market'
import { formatNumber } from '@/utils/format'

const props = defineProps<{ index: MarketIndex }>()

const router = useRouter()

function openChart() {
  void router.push({ name: 'chart', params: { symbol: props.index.symbol } })
}
</script>

<template>
  <button
    type="button"
    class="min-w-[10.5rem] shrink-0 snap-start rounded-border border border-surface-200 bg-surface-0 p-4 text-left transition-colors hover:border-surface-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:min-w-0 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
    :aria-label="`${index.name}, tracked by ${index.symbol}. Open chart.`"
    @click="openChart"
  >
    <div class="flex items-baseline justify-between gap-2">
      <span class="truncate text-sm font-medium text-color">{{ index.name }}</span>
      <!-- The benchmark itself isn't quotable on a free feed, so name the proxy. -->
      <span class="text-xs font-medium text-muted-color">{{ index.symbol }}</span>
    </div>

    <p class="mt-2 text-lg font-semibold tabular-nums text-color">
      {{ formatNumber(index.price) }}
    </p>

    <div class="mt-1 flex items-end justify-between gap-2">
      <PriceTag :value="index.changePercent" format="percent" class="text-sm" />
      <Sparkline
        v-if="index.sparkline.length > 1"
        :data="index.sparkline"
        :width="64"
        :height="24"
      />
    </div>
  </button>
</template>
