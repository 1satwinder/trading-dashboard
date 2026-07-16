import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'xtrading-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
}

/**
 * UI/layout state shared across the app shell.
 * Kept intentionally small; grows as the layout gains features (theme toggle,
 * mobile search overlay, etc.).
 */
export const useUiStore = defineStore('ui', () => {
  /** Sidebar shows icons only when collapsed (desktop/tablet). */
  const sidebarCollapsed = ref(false)
  const theme = ref<Theme>(getInitialTheme())
  const isDark = computed(() => theme.value === 'dark')

  function applyTheme() {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('app-dark', isDark.value)
    document.documentElement.style.colorScheme = theme.value
  }

  function setTheme(value: Theme) {
    theme.value = value
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, value)
    }
    applyTheme()
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(value: boolean) {
    sidebarCollapsed.value = value
  }

  applyTheme()

  return {
    sidebarCollapsed,
    theme,
    isDark,
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    toggleTheme,
  }
})
