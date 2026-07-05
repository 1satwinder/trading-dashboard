# 06 — Roadmap

A phased plan from design → polished portfolio piece. Build with **mock data first**;
nail the UI before wiring a real API.

## Phase 0 — Design (current)

- [x] Define vision, scope, tech stack.
- [x] Create UI mockups (desktop + mobile + key pages).
- [x] Document decisions in `docs/`.
- [ ] Finalize open design questions (home page, search text, logo placement).

## Phase 1 — Project setup

- [x] Scaffold Vite + Vue 3 + TS project.
- [x] Add Pinia, Vue Router, PrimeVue (Aura dark), Tailwind + `tailwindcss-primeui`.
- [x] Configure ESLint + Prettier + `vue-tsc`.
- [x] Set up design tokens (colors, typography) from `03-design-system.md`.
      _(Custom Aura preset in `src/theme/preset.ts`: indigo primary + near-black
      surfaces + soft-white text. Trading-domain tokens (buy/sell/profit/loss) in
      Tailwind `@theme`. Inter loaded via `@fontsource-variable/inter`.)_

## Phase 2 — Layout shell

- [ ] Responsive `AppSidebar` ↔ `AppBottomNav`.
- [ ] `AppTopbar` (logo, search, bell, user menu).
- [ ] `useUiStore` + `useBreakpoint` composable.
- [ ] Routing skeleton for all pages.

## Phase 3 — Core components & Watchlist

- [ ] `PriceTag`, `Sparkline`, `StatCard`.
- [ ] Watchlist page with PrimeVue `DataTable` + mock data.

## Phase 4 — Portfolio & Chart

- [ ] Portfolio: allocation donut, holdings table, performance chart.
- [ ] Chart: `lightweight-charts` candlestick + timeframe tabs + order panel.

## Phase 5 — Markets & News

- [ ] Markets: index cards, movers tables, sector heatmap.
- [ ] News: feed of article cards.

## Phase 6 — Polish

- [ ] Light theme + theme toggle.
- [ ] Loading/empty/error states; skeletons.
- [ ] Accessibility pass (keyboard nav, contrast, ARIA).
- [ ] Responsive QA on real devices.

## Phase 7 — Data & deploy

- [ ] Integrate real market-data API behind the service layer.
- [ ] Simulated order flow updating the portfolio.
- [ ] Deploy (e.g. Vercel/Netlify/GitHub Pages) + write the project README.
