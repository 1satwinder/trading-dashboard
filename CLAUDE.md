# CLAUDE.md

Guidance for AI agents (and humans) working in this repository.

## Project

**xtrading** — a responsive stock trading dashboard built as a **portfolio project**.
Goal: a polished, professional fintech UI that works on desktop and mobile, with clean,
typed, well-architected front-end code. Prioritize UX polish over feature breadth.

It is evolving into a **full-stack** app: real market data + symbol search, a persisted
watchlist, and **paper trading via Alpaca**. Data strategy is **mock-first**, then
frontend-direct market data (local-dev spike), then a **backend-for-frontend (BFF)**.

**Critical rule:** Alpaca (trading) keys are secret and its API isn't browser-CORS
-friendly → **trading is server-side only, never called from the browser**. Market-data
keys must also move server-side before deploying. See `docs/04-architecture.md`.

## Tech stack

- **Vue 3** (Composition API, `<script setup>`) + **TypeScript**
- **Vite** (build), **Pinia** (state), **Vue Router** (routing)
- **PrimeVue 4** (Aura preset, styled mode) for components
- **Tailwind CSS v4** (`@tailwindcss/vite`) for layout/utilities
- **tailwindcss-primeui** — the bridge exposing PrimeVue tokens as Tailwind utilities
- **lightweight-charts** v5 for price charts (candlestick + volume); `lucide-vue-next` / `primeicons` for icons
- **Inter** font via `@fontsource-variable/inter`

Node: `^22.18.0 || >=24.12.0`.

## Commands

```bash
npm run dev          # web (Vite :5173) + BFF (Hono :8787) together via run-p
npm run dev:web      # Vite dev server only
npm run dev:api      # BFF only (tsx watch server/index.ts; loads .env.local)
npm run build        # type-check + production build
npm run preview      # preview the production build
npm run type-check   # vue-tsc --build (covers src/ + server/)
npm run lint         # oxlint + eslint (autofix)
npm run format       # prettier
npm run test:unit    # vitest
```

The BFF needs `FINNHUB_API_KEY` and `ALPACA_API_KEY_ID` / `ALPACA_API_SECRET_KEY` in
`.env.local` (server-side); the WebSocket still uses `VITE_FINNHUB_API_KEY` (see
`.env.example`).

Prefer `npm run type-check` for ground-truth TS errors (the in-editor TS server can
show stale errors right after installing a package).

## Architecture (see docs for detail)

```
src/
├── components/   layout/ (shell, SymbolSearch), common/ (PriceTag, Sparkline, StatCard, LivePrice), feature dirs
├── views/        route-level pages (Watchlist, Portfolio, Chart, Markets, News, Settings)
├── stores/       Pinia stores (useUiStore, useWatchlistStore, useSearchStore, useChartStore, usePortfolioStore, …)
├── services/     data access layer: marketData.ts (thin /api/* client: search + quotes + candles + account/positions), marketStream.ts (Finnhub WebSocket: live trades)
├── composables/  useBreakpoint, formatters, …
├── theme/        preset.ts — customized PrimeVue Aura preset
├── types/        shared TS types
├── router/       Vue Router config
└── main.ts, App.vue

server/           # backend-for-frontend (Hono) — Phase 6
├── index.ts      # Hono app + node-server: /api/health, /api/search, /api/quotes, /api/candles
├── finnhub.ts    # server-side Finnhub client + mapping (search + quotes; owns FINNHUB_API_KEY)
├── alpaca.ts     # server-side Alpaca client (chart candles, free iex feed; owns ALPACA_* keys)
├── cache.ts      # shared in-memory TTL cache
└── errors.ts     # shared ProviderError (status + message)
```

Data flow: **View → Pinia store → service layer → BFF (`/api/*`) → provider**.
Keep all provider/backend details behind `services/` (client) + `server/` (BFF) so the
data source can evolve without touching views. Search + quotes (Finnhub) and chart candles
(Alpaca IEX) now go through the **Hono BFF** (`server/`), which owns the provider keys; Vite
proxies `/api` → the BFF in dev. External providers: **Alpaca** (chart candles now +
paper trading later, server-side only) + **Finnhub** (symbol search/quotes/news + live WS).
Single shared paper account, no auth. See ADR-009/010/012/015/016.

Real-time: the watchlist streams live prices over **one shared Finnhub WebSocket**
(`marketStream`). `useWatchlistStore` owns the `connect()`/`disconnect()` lifecycle,
buffers ticks and flushes the latest price per symbol every ~400ms (recomputing
change % from `previousClose`); `marketStream` reconciles subscriptions and reconnects
with backoff. **Still frontend-direct** (uses `VITE_FINNHUB_API_KEY`) — Phase 6 moved only
REST server-side; the WS is hardened at deploy. See ADR-013/015.

`@/` is aliased to `src/`.

## Design system & color tokens (important)

Dark-first. There is **one source of truth per concern** — do not create parallel palettes.

- **Component chrome + brand** → PrimeVue/Aura tokens, customized in `src/theme/preset.ts`
  (indigo `primary` `#4F8CFF`, near-black `surface` ramp, soft-white text). Use via the
  Tailwind bridge: `bg-surface-900`, `border-surface-700`, `text-primary`,
  `text-muted-color`, and PrimeVue `severity="success"/"danger"` for generic UI state.
- **Trading meaning** → domain tokens in `@theme` (`src/assets/main.css`). Use the
  generated utilities `text-buy` / `text-sell` / `text-profit` / `text-loss` /
  `text-up` / `bg-down`, **never** raw `text-green-500`/`text-red-500`. `up`/`down` are
  the source of truth; buy/sell/profit/loss are aliases of them.
- **Layout** → plain Tailwind utilities.
- **App chrome** → `--xt-bg` / `--xt-text` in `base.css` (only for the pre-mount `<body>`
  paint; kept in sync with `surface.950`).

Reserve green/red strictly for price/performance — never as generic accents.

Numbers (prices, P/L): use Tailwind's `tabular-nums` so digits don't jitter.

### Gotchas

- **CSS layer order matters.** `main.ts` sets PrimeVue `cssLayer.order: 'theme, base,
  primevue'` so Tailwind utilities can override PrimeVue component styles without
  `!important`. Don't remove this.
- **Dark mode** is driven by `.app-dark` on `<html>` (`darkModeSelector`), aligned with
  Tailwind's `dark:` variant via `@custom-variant dark` in `main.css`.
- The Inter family name is `'Inter Variable'` (listed first in `base.css`).
- CSS-only side-effect imports use explicit `.css` paths (e.g.
  `@fontsource-variable/inter/index.css`) to satisfy TypeScript.

## Conventions

- TypeScript everywhere; `<script setup lang="ts">`.
- Responsive: left sidebar (desktop) ↔ bottom tab bar (mobile); breakpoints
  desktop ≥1024 / tablet 768–1023 / mobile <768.
- Keep the docs current: when a meaningful decision changes, append an ADR to
  `docs/07-decisions.md` and update the relevant doc.
- Run `npm run type-check` and `npm run lint` before considering a change done.

## Documentation

Detailed docs live in [`docs/`](./docs/):

- [Docs index](./docs/README.md)
- [Overview](./docs/01-overview.md) — vision, goals, scope
- [Tech stack](./docs/02-tech-stack.md)
- [Design system](./docs/03-design-system.md) — colors, tokens, the bridge, typography
- [Architecture](./docs/04-architecture.md) — structure, routing, stores, components
- [Features](./docs/05-features.md) — pages / information architecture
- [Roadmap](./docs/06-roadmap.md) — phased plan and status
- [Decisions](./docs/07-decisions.md) — ADR log

UI mockups (reference designs) are in [`UI mockups/`](./UI%20mockups/).

## Current status

Phases 1–4 complete: project setup, responsive layout shell, the Watchlist page, and
**real market data** — Finnhub symbol search (top-bar `AutoComplete`) + a live watchlist
persisted in `localStorage`, with **real-time prices streamed over Finnhub's WebSocket**
(`marketStream`). A persisted light/dark theme toggle (Polish, Phase 11) is also done.

Phase 5 (Chart) core is done — `lightweight-charts` v5 candlestick + volume with 1D–5Y
timeframe tabs (`ChartView` + `PriceChart` + `useChartStore`), now on **real candles**
from Alpaca (see below).

Phase 6 (BFF) — mostly done: a standalone **Hono** server in `server/` owns the provider
keys and serves `/api/search` + `/api/quotes` (Finnhub) and `/api/candles` (Alpaca, free
`iex` feed) with a shared in-memory TTL cache; `marketData.ts` is a thin `/api/*` client
and Vite proxies `/api` → the BFF. The synthetic candle generator is gone (ADR-016).
Only remaining Phase 6 item: moving the trade **WebSocket** server-side — still
frontend-direct via `VITE_FINNHUB_API_KEY`, revisited at deploy (see ADR-015).

Phase 7 (Alpaca account + positions) — done, read-only: `server/alpaca.ts` also hits
Alpaca's **Trading** host (`paper-api.alpaca.markets`, `ALPACA_TRADING_URL`) via a shared
`alpacaRequest()` and serves `/api/account` + `/api/positions`. The Watchlist StatCards now
show **real** equity / buying power / day P/L (mock `fetchPortfolioSummary` deleted);
`usePortfolioStore` also exposes `positions` + `loadPositions()` for the Phase 8 page. Same
key/secret as candles, two hosts. No order placement yet (ADR-017).

**Next:** Portfolio page on real data (Phase 8), Alpaca paper trading/orders (Phase 9),
Markets & News (Phase 10); plus the deferred WebSocket-behind-BFF item. See
`docs/06-roadmap.md` for authoritative status.
