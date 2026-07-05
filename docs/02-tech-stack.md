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

## Candidate data sources (later phases)

> Start with **mock/static JSON**. Wire a real API only after the UI is solid.

- Finnhub, Alpha Vantage, Twelve Data, or Polygon.io (free tiers, rate-limited).
- Abstract data access behind a service layer so the provider can be swapped.
