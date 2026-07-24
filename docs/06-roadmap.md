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
- [x] `marketData` service: real Finnhub symbol search + quotes (behind the service layer).
      _(`searchSymbols` / `fetchQuote` / `fetchQuotes` call Finnhub frontend-direct
      via `VITE_FINNHUB_API_KEY` in `.env.local`; portfolio summary stays mock until
      Alpaca. Intraday candles aren't on the free tier, so sparklines are approximated
      from each quote's OHLC.)_
- [x] Top-bar symbol search (`AutoComplete`) → add to watchlist.
      _(Debounced `AutoComplete` in `AppTopbar` → `useSearchStore`; selecting a result
      adds it via `useWatchlistStore.add` with a PrimeVue toast confirmation.)_
- [x] Watchlist persistence in `localStorage`; live quotes replace mock data.
      _(`useWatchlistStore` persists entries under `xtrading-watchlist`, seeded on first
      visit; quotes fetched on top with add/remove/refresh.)_
- [x] Loading / empty / error states.
      _(DataTable loading, empty-state prompt, error `Message`, and per-symbol remove.)_
- [x] Streaming watchlist via Finnhub WebSocket.
      _(`marketStream` service wraps one shared `wss://ws.finnhub.io` socket — reconciles
      subscribe/unsubscribe against the watchlist and reconnects with backoff. The store
      buffers trades and flushes the latest price per symbol every 400ms, recomputing
      change % from the previous close; `LivePrice` flashes green/red on each tick and the
      header shows a Live/Connecting/Offline status pill. Sits behind the same service seam,
      so it moves to the BFF in Phase 7.)_

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

- [x] Light theme + persisted theme toggle.
- [ ] Loading/empty/error states; skeletons.
- [ ] Accessibility pass (keyboard nav, contrast, ARIA).
- [ ] Responsive QA on real devices.

## Phase 10 — Deploy

- [ ] Deploy frontend + BFF (e.g. Vercel/Netlify); configure secrets/env.
- [ ] Write the project README (screenshots, live demo, setup).
