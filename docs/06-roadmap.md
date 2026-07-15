# 06 — Roadmap

A phased plan from design → polished **full-stack** portfolio piece. Build the UI on
**mock data first**, then integrate **real market data** (frontend-direct spike), then
add a **backend-for-frontend (BFF)** to hide keys and enable **Alpaca paper trading**.
See `04-architecture.md` for the data-source evolution.

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

- [x] Responsive `AppSidebar` ↔ `AppBottomNav`.
- [x] `AppTopbar` (logo, search, bell, user menu).
- [x] `useUiStore` + `useBreakpoint` composable.
- [x] Routing skeleton for all pages.

## Phase 3 — Core components & Watchlist

- [x] `PriceTag`, `Sparkline`, `StatCard`.
- [x] Watchlist page with PrimeVue `DataTable` + mock data.
      _(Mock data + async `marketData` service → `watchlist`/`portfolio` stores →
      view. Stat cards for portfolio summary; sortable table with avatar, price,
      colored change %, and trend sparkline. Sparkline column hidden on mobile.)_

## Phase 4 — Symbol search + live watchlist (real market data, frontend-direct)

> Interim stage: call the market-data provider directly from the browser **in local
> dev only** (key exposed — never deployed). Watchlist persisted in `localStorage`.

- [x] Choose market-data provider: **Finnhub** (ADR-009).
- [ ] `marketData` service: real Finnhub symbol search + quotes (behind the service layer).
- [ ] Top-bar symbol search (`AutoComplete`) → add to watchlist.
- [ ] Watchlist persistence in `localStorage`; live quotes replace mock data.
- [ ] Loading / empty / error states.

## Phase 5 — Portfolio & Chart

- [ ] Portfolio: allocation donut, holdings table, performance chart (mock until Alpaca).
- [ ] Chart: `lightweight-charts` candlestick + timeframe tabs, from real candle data.
- [ ] Order panel UI (wired to live trading in Phase 8).

## Phase 6 — Markets & News

- [ ] Markets: index cards, movers tables, sector heatmap.
- [ ] News: feed of article cards.

## Phase 7 — Backend-for-frontend (BFF)

> Once trading begins, a backend is required (secret keys, CORS, caching).

- [ ] Stand up BFF (TS serverless functions recommended) with `/api/*` routes.
- [ ] Move **all** provider/Alpaca keys server-side; add response caching.
- [ ] Point the frontend service layer at the BFF (remove frontend-direct calls).

## Phase 8 — Alpaca paper trading

- [ ] Alpaca client in the BFF: account, positions, place/cancel orders, order status.
- [ ] Wire the order panel → real paper orders; portfolio → real positions.
- [ ] Uses a single shared paper account, no user auth (ADR-012).

## Phase 9 — Polish

- [ ] Light theme + theme toggle.
- [ ] Loading/empty/error states; skeletons.
- [ ] Accessibility pass (keyboard nav, contrast, ARIA).
- [ ] Responsive QA on real devices.

## Phase 10 — Deploy

- [ ] Deploy frontend + BFF (e.g. Vercel/Netlify); configure secrets/env.
- [ ] Write the project README (screenshots, live demo, setup).
