<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Button from 'primevue/button'
</script>

<template>
  <!-- Temporary verification shell. Replaced by the real layout in Phase 2. -->
  <div class="min-h-screen">
    <header class="flex items-center gap-6 border-b border-surface-700 px-6 py-4">
      <span class="text-xl font-semibold text-primary">xtrading</span>
      <nav class="flex gap-4 text-surface-300">
        <RouterLink to="/" class="hover:text-surface-0">Watchlist</RouterLink>
        <RouterLink to="/chart" class="hover:text-surface-0">Chart</RouterLink>
      </nav>
      <div class="ml-auto flex items-center gap-2">
        <Button label="Buy" icon="pi pi-arrow-up" severity="success" size="small" />
        <Button label="Sell" icon="pi pi-arrow-down" severity="danger" size="small" />
      </div>
    </header>

    <main class="p-6">
      <div class="rounded-border border border-surface-700 bg-surface-900 p-6">
        <p class="text-muted-color">
          PrimeVue + Tailwind are wired up. This placeholder confirms the dark theme,
          semantic colors, and utilities work. The real layout shell comes next.
        </p>
        <p class="mt-3 flex gap-4 font-semibold tabular-nums">
          <span class="text-profit">+2.4% profit</span>
          <span class="text-loss">-0.8% loss</span>
          <span class="text-buy">BUY</span>
          <span class="text-sell">SELL</span>
        </p>
        <RouterView />
      </div>
    </main>
  </div>
</template>
