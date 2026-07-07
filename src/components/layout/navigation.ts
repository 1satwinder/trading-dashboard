/**
 * Shared navigation config, consumed by both AppSidebar (desktop/tablet) and
 * AppBottomNav (mobile) so the two stay in sync.
 */
export interface NavItem {
  label: string
  icon: string
  to: string
  /** Match the route exactly (used for the index route `/`). */
  exact?: boolean
}

export const navItems: NavItem[] = [
  { label: 'Watchlist', icon: 'pi pi-star', to: '/', exact: true },
  { label: 'Portfolio', icon: 'pi pi-chart-pie', to: '/portfolio' },
  { label: 'Chart', icon: 'pi pi-chart-line', to: '/chart' },
  { label: 'Markets', icon: 'pi pi-globe', to: '/markets' },
  { label: 'News', icon: 'pi pi-book', to: '/news' },
]

export const settingsItem: NavItem = {
  label: 'Settings',
  icon: 'pi pi-cog',
  to: '/settings',
}
