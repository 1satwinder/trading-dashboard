import { computed, readonly, ref } from 'vue'

/**
 * Reactive viewport breakpoints, aligned with docs/03-design-system.md:
 *   mobile  < 768px
 *   tablet  768–1023px
 *   desktop ≥ 1024px
 *
 * Implemented as a module-level singleton so the whole app shares one `resize`
 * listener and one reactive width value.
 */
const MOBILE_MAX = 768
const DESKTOP_MIN = 1024

const width = ref(typeof window !== 'undefined' ? window.innerWidth : DESKTOP_MIN)

let initialized = false
function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('resize', () => {
    width.value = window.innerWidth
  })
}

export function useBreakpoint() {
  init()

  const isMobile = computed(() => width.value < MOBILE_MAX)
  const isTablet = computed(() => width.value >= MOBILE_MAX && width.value < DESKTOP_MIN)
  const isDesktop = computed(() => width.value >= DESKTOP_MIN)

  return { width: readonly(width), isMobile, isTablet, isDesktop }
}
