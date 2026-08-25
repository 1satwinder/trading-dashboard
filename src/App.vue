<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import AppBottomNav from '@/components/layout/AppBottomNav.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const { isDesktop } = useBreakpoint()
const ui = useUiStore()
const route = useRoute()

// The session lives in an HttpOnly cookie, so ask the BFF whether it's still valid.
useAuthStore().checkSession()

// Collapse the sidebar to icons on tablet widths; expand on desktop.
// The manual toggle in the top bar overrides this until the next breakpoint change.
watch(isDesktop, (desktop) => ui.setSidebarCollapsed(!desktop), { immediate: true })

/**
 * An SPA route change doesn't move focus or reset the screen reader's cursor, so
 * nothing tells a non-visual user the page swapped under them. Mirroring the new
 * page name into a live region is the standard fix.
 */
const routeAnnouncement = ref('')
watch(
  () => route.fullPath,
  () => {
    const title = typeof route.meta.title === 'string' ? route.meta.title : 'xtrading'
    routeAnnouncement.value = `${title} page loaded`
  },
)
</script>

<template>
  <div class="flex min-h-screen bg-surface-50 text-color dark:bg-surface-950">
    <!-- First tab stop: jump the keyboard past the sidebar and top bar. -->
    <a
      href="#main-content"
      class="skip-link rounded-border bg-primary px-4 py-2 font-medium text-primary-contrast"
    >
      Skip to main content
    </a>

    <AppSidebar class="hidden md:flex" />

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />
      <!-- `tabindex="-1"` makes the skip link's target focusable without adding a tab stop. -->
      <main
        id="main-content"
        tabindex="-1"
        class="flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] focus:outline-none md:p-6 md:pb-6"
      >
        <RouterView />
      </main>
    </div>

    <AppBottomNav class="md:hidden" />

    <!-- Lifted clear of the mobile bottom nav; full width there so it stays readable. -->
    <Toast
      position="bottom-right"
      :breakpoints="{ '767px': { bottom: '5.5rem', right: '1rem', left: '1rem', width: 'auto' } }"
    />

    <p role="status" aria-live="polite" class="sr-only">{{ routeAnnouncement }}</p>
  </div>
</template>
