<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { navItems, settingsItem } from './navigation'

const ui = useUiStore()

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'
const linkActive = 'bg-primary/15 text-primary'
const linkInactive =
  'text-surface-600 hover:bg-surface-100 hover:text-color dark:text-surface-300 dark:hover:bg-surface-800'
</script>

<template>
  <aside
    class="flex flex-col border-r border-surface-200 bg-surface-0 transition-[width] duration-200 dark:border-surface-800 dark:bg-surface-950"
    :class="ui.sidebarCollapsed ? 'w-16' : 'w-56'"
  >
    <!-- Brand -->
    <div class="flex h-16 items-center gap-2 px-4">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <i class="pi pi-chart-bar text-lg" aria-hidden="true" />
      </span>
      <span v-if="!ui.sidebarCollapsed" class="text-lg font-bold tracking-tight text-color">
        xtrading
      </span>
    </div>

    <!--
      Collapsed, the labels are hidden visually but kept in the DOM (`sr-only`)
      rather than removed — otherwise each link's only accessible name would be
      its icon font glyph.
    -->
    <nav class="flex flex-1 flex-col gap-1 px-2 py-3" aria-label="Main">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        v-slot="{ href, navigate, isActive, isExactActive }"
        :to="item.to"
        custom
      >
        <a
          :href="href"
          :title="ui.sidebarCollapsed ? item.label : undefined"
          :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : undefined"
          :class="[linkBase, (item.exact ? isExactActive : isActive) ? linkActive : linkInactive]"
          @click="navigate"
        >
          <i :class="item.icon" class="text-lg" aria-hidden="true" />
          <span :class="ui.sidebarCollapsed ? 'sr-only' : undefined">{{ item.label }}</span>
        </a>
      </RouterLink>
    </nav>

    <!-- Settings, pinned to the bottom -->
    <div class="border-t border-surface-200 px-2 py-3 dark:border-surface-800">
      <RouterLink v-slot="{ href, navigate, isActive }" :to="settingsItem.to" custom>
        <a
          :href="href"
          :title="ui.sidebarCollapsed ? settingsItem.label : undefined"
          :aria-current="isActive ? 'page' : undefined"
          :class="[linkBase, isActive ? linkActive : linkInactive]"
          @click="navigate"
        >
          <i :class="settingsItem.icon" class="text-lg" aria-hidden="true" />
          <span :class="ui.sidebarCollapsed ? 'sr-only' : undefined">{{ settingsItem.label }}</span>
        </a>
      </RouterLink>
    </div>
  </aside>
</template>
