<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { navItems } from './navigation'
</script>

<template>
  <!-- `pb-[env(...)]` keeps the labels clear of the iOS home indicator. -->
  <nav
    class="fixed inset-x-0 bottom-0 z-40 flex border-t border-surface-200 bg-surface-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-surface-800 dark:bg-surface-950/95"
    aria-label="Main"
  >
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      v-slot="{ href, navigate, isActive, isExactActive }"
      :to="item.to"
      custom
    >
      <a
        :href="href"
        class="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors"
        :class="
          (item.exact ? isExactActive : isActive)
            ? 'text-primary'
            : 'text-surface-500 dark:text-surface-400'
        "
        :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : undefined"
        @click="navigate"
      >
        <i :class="item.icon" class="text-lg" aria-hidden="true" />
        {{ item.label }}
      </a>
    </RouterLink>
  </nav>
</template>
