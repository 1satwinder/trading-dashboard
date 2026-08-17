<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import type { MenuMethods } from 'primevue/menu'
import SymbolSearch from '@/components/layout/SymbolSearch.vue'
import SignInDialog from '@/components/layout/SignInDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()

/** Full-screen search overlay for mobile (`<sm`), where the inline bar is hidden. */
const mobileSearchOpen = ref(false)

const userMenu = useTemplateRef<MenuMethods>('userMenu')

/**
 * There are no user accounts — a single passcode unlocks trading (ADR-024) — so
 * the menu offers sign in/out and Settings, and no Profile.
 */
const userMenuItems = computed(() => {
  const settings = {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: () => router.push({ name: 'settings' }),
  }

  if (!auth.isAuthenticated) {
    return [{ label: 'Sign in', icon: 'pi pi-sign-in', command: () => auth.openPrompt() }, settings]
  }

  return [
    settings,
    { separator: true },
    { label: 'Sign out', icon: 'pi pi-sign-out', command: () => auth.logOut() },
  ]
})

function toggleUserMenu(event: Event) {
  userMenu.value?.toggle(event)
}
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-200 bg-surface-0/95 px-4 backdrop-blur dark:border-surface-800 dark:bg-surface-950/95"
  >
    <!-- Sidebar toggle (desktop/tablet) -->
    <Button
      icon="pi pi-bars"
      text
      rounded
      severity="secondary"
      class="hidden md:inline-flex"
      aria-label="Toggle sidebar"
      @click="ui.toggleSidebar()"
    />

    <!-- Brand (mobile only; on desktop the brand lives in the sidebar) -->
    <span class="text-lg font-bold text-color md:hidden">xtrading</span>

    <!-- Symbol search (inline, tablet/desktop) -->
    <div class="mx-auto hidden w-full max-w-md sm:block">
      <SymbolSearch />
    </div>

    <!-- Right actions -->
    <div class="ml-auto flex items-center gap-1">
      <Button
        icon="pi pi-search"
        text
        rounded
        severity="secondary"
        class="sm:hidden"
        aria-label="Search"
        @click="mobileSearchOpen = true"
      />
      <Button
        :icon="ui.isDark ? 'pi pi-sun' : 'pi pi-moon'"
        text
        rounded
        severity="secondary"
        :aria-label="ui.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        :aria-pressed="ui.isDark"
        :title="ui.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="ui.toggleTheme()"
      />
      <button class="ml-1 rounded-full" aria-label="User menu" @click="toggleUserMenu">
        <Avatar :icon="auth.isAuthenticated ? 'pi pi-user' : 'pi pi-lock'" shape="circle" />
      </button>
      <Menu ref="userMenu" :model="userMenuItems" popup />
    </div>

    <SignInDialog />

    <!-- Mobile search overlay (covers the bar; closes on select or back) -->
    <div
      v-if="mobileSearchOpen"
      class="absolute inset-0 z-40 flex items-center gap-2 bg-surface-0 px-4 dark:bg-surface-950 sm:hidden"
    >
      <Button
        icon="pi pi-arrow-left"
        text
        rounded
        severity="secondary"
        aria-label="Close search"
        @click="mobileSearchOpen = false"
      />
      <div class="min-w-0 flex-1">
        <SymbolSearch autofocus @select="mobileSearchOpen = false" />
      </div>
    </div>
  </header>
</template>
