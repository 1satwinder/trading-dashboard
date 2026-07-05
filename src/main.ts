import '@fontsource-variable/inter/index.css'
import './assets/main.css'
import 'primeicons/primeicons.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'

import App from './App.vue'
import router from './router'
// Aura customized with the xtrading brand (indigo primary + near-black surfaces).
// Its dark tokens style PrimeVue components like button, input, etc.
import { XtradingPreset } from './theme/preset'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: XtradingPreset,
    options: {
      // Dark-first: `.app-dark` on <html> activates PrimeVue's dark tokens and
      // is kept in sync with Tailwind's `dark:` variant (see main.css).
      darkModeSelector: '.app-dark',
      // Place the `primevue` layer between Tailwind's base and utilities so
      // Tailwind utility classes can override PrimeVue component styles.
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue',
      },
    },
  },
})

app.mount('#app')
