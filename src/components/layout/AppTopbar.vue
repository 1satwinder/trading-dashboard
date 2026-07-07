<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import type { MenuMethods } from 'primevue/menu'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const searchQuery = ref('')

const userMenu = useTemplateRef<MenuMethods>('userMenu')
const userMenuItems = [
  { label: 'Profile', icon: 'pi pi-user' },
  { label: 'Settings', icon: 'pi pi-cog' },
  { separator: true },
  { label: 'Sign out', icon: 'pi pi-sign-out' },
]

function toggleUserMenu(event: Event) {
  userMenu.value?.toggle(event)
}
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-800 bg-surface-950/95 px-4 backdrop-blur"
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

    <!-- Search -->
    <div class="mx-auto hidden w-full max-w-md sm:block">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Search stocks, ETFs..."
          class="w-full"
        />
      </IconField>
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
      />
      <Button icon="pi pi-bell" text rounded severity="secondary" aria-label="Notifications" />
      <button class="ml-1 rounded-full" aria-label="User menu" @click="toggleUserMenu">
        <Avatar icon="pi pi-user" shape="circle" />
      </button>
      <Menu ref="userMenu" :model="userMenuItems" popup />
    </div>
  </header>
</template>
