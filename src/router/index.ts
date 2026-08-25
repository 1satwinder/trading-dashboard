import { createRouter, createWebHistory } from 'vue-router'
import WatchlistView from '@/views/WatchlistView.vue'

/** Human-readable page name, used for `document.title` and the route announcer. */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const APP_NAME = 'xtrading'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'watchlist',
      component: WatchlistView,
      meta: { title: 'Watchlist' },
    },
    {
      path: '/portfolio',
      name: 'portfolio',
      component: () => import('@/views/PortfolioView.vue'),
      meta: { title: 'Portfolio' },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/OrdersView.vue'),
      meta: { title: 'Orders' },
    },
    {
      path: '/chart/:symbol?',
      name: 'chart',
      component: () => import('@/views/ChartView.vue'),
      meta: { title: 'Chart' },
    },
    {
      path: '/markets',
      name: 'markets',
      component: () => import('@/views/MarketsView.vue'),
      meta: { title: 'Markets' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: 'Settings' },
    },
  ],
})

/**
 * A single-page app keeps the `index.html` title forever unless something
 * updates it, which leaves every tab, bookmark and history entry reading
 * "xtrading". The chart route leads with its symbol, since that's what
 * distinguishes one chart tab from another.
 */
router.afterEach((to) => {
  const symbol = Array.isArray(to.params.symbol) ? to.params.symbol[0] : to.params.symbol
  const parts = [symbol?.toUpperCase(), to.meta.title, APP_NAME].filter(Boolean)
  document.title = parts.join(' · ')
})

export default router
