<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { navItems } from './navigation'
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 flex border-t border-surface-800 bg-surface-950/95 backdrop-blur"
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
        :class="(item.exact ? isExactActive : isActive) ? 'text-primary' : 'text-surface-400'"
        @click="navigate"
      >
        <i :class="item.icon" class="text-lg" />
        {{ item.label }}
      </a>
    </RouterLink>
  </nav>
</template>
