# 02 — Tech Stack

## Summary

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Vue 3** (`<script setup>`, Composition API) | Modern, reactive, great DX |
| Language | **TypeScript** | Type safety, better tooling, portfolio signal |
| Build tool | **Vite** | Fast dev server + builds, first-class Vue support |
| State management | **Pinia** | Official Vue store, simple + typed |
| Routing | **Vue Router** | Standard SPA routing for the pages |
| UI components | **PrimeVue** (Aura dark preset, styled mode) | Rich data tables, menus, inputs out of the box |
| Styling / layout | **Tailwind CSS** + `tailwindcss-primeui` | Utility-first layout + responsive, shared tokens |
| Charts | **lightweight-charts** (TradingView) | Purpose-built financial candlestick charts |
| Icons | **lucide-vue-next** | Clean line icons incl. finance/chart icons |

## Notes & conventions

- **PrimeVue + Tailwind division of labor:** let PrimeVue own component internals
  (tables, menus, inputs); use Tailwind for layout, spacing, and responsive
  utilities (`md:`, `lg:`). Use the `tailwindcss-primeui` plugin so both share the
  same color tokens and avoid CSS conflicts.
- **Theming:** PrimeVue **styled mode** with the **Aura dark** preset (or a custom
  preset). Brand accent + semantic up/down colors defined as design tokens
  (see `03-design-system.md`).
- **Charts:** `lightweight-charts` for candlestick/price charts; consider a small
  custom `Sparkline` (SVG) for inline mini-charts in tables/cards.

## Tooling (recommended)

- **Package manager:** npm (or pnpm).
- **Linting/formatting:** ESLint + Prettier (with `eslint-plugin-vue`).
- **Type checking:** `vue-tsc`.
- **Testing (later):** Vitest (unit) + Vue Test Utils; optionally Playwright (e2e).

## Data providers & backend

The app integrates two kinds of external service, plus (eventually) our own backend.

### Trading — Alpaca (paper)

- **Alpaca Paper Trading API** for orders, order status, positions, and account.
  Free real-time paper account; a strong portfolio demonstration.
- Keys are **secret** and the API is **not browser-CORS-friendly** → Alpaca is only
  ever called **server-side** (see the BFF in `04-architecture.md`). No exceptions.
- Note: Alpaca has market data (bars/quotes) but **no symbol search**, so a
  search-capable market-data provider is still required.

### Market data + symbol search — Finnhub

> **Decided:** Finnhub (ADR-009). Chosen over Alpha Vantage (free tier ~25 req/day is
> too tight) and Twelve Data.

- **Finnhub** for symbol search (`/search`), quotes, candles, and news; ~60 req/min free
  tier, browser CORS, and a WebSocket for real-time updates later.
- Kept behind the service layer / BFF so it can be swapped if needed.

### Backend-for-frontend (BFF) — planned

- A thin proxy that holds all API keys, **caches** market data (to survive tight
  free tiers), and brokers Alpaca trading. Introduced once trading begins.
- **Decided stack:** TypeScript **serverless functions** (Vercel/Netlify) — one language
  across the stack, keys stay server-side, nothing to operate (ADR-010).
- **Account model:** single shared Alpaca **paper** account, no user auth (ADR-012).

### Service-layer principle

- All data access stays behind `src/services/` so the provider — and the
  frontend-direct → BFF transition — can change without touching views or stores.
