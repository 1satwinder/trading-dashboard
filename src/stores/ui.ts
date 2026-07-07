import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * UI/layout state shared across the app shell.
 * Kept intentionally small; grows as the layout gains features (theme toggle,
 * mobile search overlay, etc.).
 */
export const useUiStore = defineStore('ui', () => {
  /** Sidebar shows icons only when collapsed (desktop/tablet). */
  const sidebarCollapsed = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(value: boolean) {
    sidebarCollapsed.value = value
  }

  return { sidebarCollapsed, toggleSidebar, setSidebarCollapsed }
})
