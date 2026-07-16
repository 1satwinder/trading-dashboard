<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import AppBottomNav from '@/components/layout/AppBottomNav.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useUiStore } from '@/stores/ui'

const { isDesktop } = useBreakpoint()
const ui = useUiStore()

// Collapse the sidebar to icons on tablet widths; expand on desktop.
// The manual toggle in the top bar overrides this until the next breakpoint change.
watch(isDesktop, (desktop) => ui.setSidebarCollapsed(!desktop), { immediate: true })
</script>

<template>
  <div class="flex min-h-screen bg-surface-50 text-color dark:bg-surface-950">
    <AppSidebar class="hidden md:flex" />

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />
      <main class="flex-1 p-4 pb-24 md:p-6 md:pb-6">
        <RouterView />
      </main>
    </div>

    <AppBottomNav class="md:hidden" />
    <Toast position="bottom-right" />
  </div>
</template>
