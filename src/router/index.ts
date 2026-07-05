import { createRouter, createWebHistory } from 'vue-router'
import WatchlistView from '../views/WatchlistView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'watchlist',
      component: WatchlistView,
    },
    {
      path: '/chart',
      name: 'chart',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/ChartView.vue'),
    },
  ],
})

export default router
