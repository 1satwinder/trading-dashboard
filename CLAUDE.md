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
├── components/   layout/ (shell, SymbolSearch), common/ (PriceTag, Sparkline, StatCard, LivePrice), feature dirs (chart/, orders/, portfolio/, markets/)
├── views/        route-level pages (Watchlist, Portfolio, Orders, Chart, Markets, Settings)
├── stores/       Pinia stores (useUiStore, useWatchlistStore, useSearchStore, useChartStore, usePortfolioStore, useOrdersStore, useMarketsStore, …)
├── services/     data access layer: marketData.ts (thin /api/* client: search + quotes + candles + markets + account/positions/history + orders), marketStream.ts (Finnhub WebSocket: live trades)
├── composables/  useBreakpoint (formatters live in utils/format.ts)
├── theme/        preset.ts — customized PrimeVue Aura preset
├── types/        shared TS types
├── router/       Vue Router config
└── main.ts, App.vue

server/             # backend-for-frontend (Hono) — Phase 6
├── app.ts          # shared Hono app: /api/health, /api/search, /api/quotes, /api/candles, /api/stats,
│                   #   /api/markets/*, /api/account, /api/positions, /api/portfolio/history,
│                   #   /api/orders, /api/auth/{login,logout,session}
├── index.ts        # local-dev entry point (@hono/node-server + dotenv)
├── auth.ts         # passcode → signed session cookie + requireAuth on the order writes (ADR-024)
├── finnhub.ts      # server-side Finnhub client + mapping (search + quotes; owns FINNHUB_API_KEY)
├── alpacaClient.ts # shared Alpaca transport: hosts, credentials, alpacaRequest(); owns ALPACA_* keys
├── alpaca.ts       # chart candles (data host) + account/positions/history/orders (trading host)
├── markets.ts      # Markets page: ETF index proxies, screener + filtering, sectors, clock (ADR-020)
├── cache.ts        # shared in-memory TTL cache
└── errors.ts       # shared ProviderError (status + message)
```

Data flow: **View → Pinia store → service layer → BFF (`/api/*`) → provider**.
Keep all provider/backend details behind `services/` (client) + `server/` (BFF) so the
data source can evolve without touching views. Search + quotes (Finnhub), chart candles and
the Markets page (Alpaca IEX) all go through the **Hono BFF** (`server/`), which owns the
provider keys; Vite proxies `/api` → the BFF in dev. External providers: **Alpaca** (chart
candles, markets, and account/positions/history/paper orders — server-side only) +
**Finnhub** (symbol search/quotes + live WS). Single shared paper account, no user accounts:
placing and cancelling orders need a passcode session cookie, every read is public.
See ADR-009/010/012/015/016/020/024.

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
- **Don't bind `:loading` on `DataTable` for fast/cached fetches.** BFF responses are cached
  and near-instant; a `true → false` flip within a few ms can orphan PrimeVue's overlay
  leave-transition, leaving a `p-datatable-mask` with `pointer-events: auto` permanently on
  top of the table (it swallows row clicks). `OrdersView` shows a `ProgressSpinner` for the
  initial load instead, and background polling refreshes silently.

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
`usePortfolioStore` also exposes `positions` + `loadPositions()`. Same key/secret as candles,
two hosts. No order placement yet (ADR-017).

Phase 8 (Portfolio page) — done: `PortfolioView` renders a summary header (total value +
open P/L), an SVG `AllocationDonut` (holdings by market value + cash), a `PortfolioChart`
(lightweight-charts area) with 1W–ALL range tabs backed by `/api/portfolio/history`
(`fetchPortfolioHistory` → Alpaca `GET /v2/account/portfolio/history`), and a holdings
`DataTable`. Allocation slices + open-P/L totals are derived in `usePortfolioStore`.

Phase 9 (Alpaca paper trading) — done: the BFF serves `POST /api/orders`, `GET /api/orders`,
`GET /api/orders/:id` and `DELETE /api/orders/:id` (its first **write** path).
`alpacaRequest()` is write-capable, Alpaca's `403`/`422` messages pass through to the UI with
their status, and writes `invalidate()` the account/positions/history/orders caches so fills
land immediately. `OrderPanel` gained a time-in-force select + review-and-confirm dialog and
submits through `useOrdersStore`, polling every ~5s while any order is working (no
trade-updates stream — ADR-018). The two writes are now the only guarded routes (see Auth
below).

Orders live on their **own page** (`/orders`, `OrdersView` + presentational `OrdersTable`)
with All/Open/Filled/Canceled filter tabs — they started as a card under Holdings, but two
stacked tables made Portfolio cluttered. **News was dropped** (nav item, route, and stub view
deleted); Orders took its nav slot, so Phase 10 is Markets only. See ADR-019.

Phase 10 (Markets) — done, and **Alpaca-only**: Finnhub's free tier is US-only with no
screener, so it serves none of this page. `server/markets.ts` + `/api/markets/{clock,indices,
movers,sectors}` back a `MarketsView` of a market-status pill, five `IndexCard`s, a US/Canada
`SelectButton`, gainers/losers/most-active `MoversTable`s and a `SectorHeatmap`;
`useMarketsStore` refreshes every 60s **only while the market is open**. Two gaps in free data
are approximated on purpose (ADR-020): **indices are ETF proxies** (SPY/QQQ/DIA/IWM/EWC) since
index levels aren't quotable, and **Canada is NYSE dual-listings** since no free feed covers
the TSX — which also keeps every row tradable in the paper account. `MarketMovers.source`
marks curated lists so they never read as a full-market scan. Alpaca's raw screener is topped
by penny stocks, warrants and geared single-stock ETFs, so movers are over-fetched (`top=50`)
and filtered on price, move size and a 24h-cached `/v2/assets` lookup. Shared Alpaca transport
now lives in `server/alpacaClient.ts`.

Auth (Polish) — done, deliberately minimal: there are no user accounts, just one owner
passcode. `POST /api/auth/login` compares it against `APP_PASSCODE` (timing-safe) and issues
a 7-day HS256 JWT as an `HttpOnly` cookie signed with `SESSION_SECRET`; `requireAuth` in
`server/auth.ts` 401s **only** `POST /api/orders` and `DELETE /api/orders/:id`. Every read
(market data, account, positions, history, order list) stays public so the deployed demo is
fully browsable. Client side: `useAuthStore` mirrors the cookie's state (checked once on boot
in `App.vue`), `SignInDialog` collects the passcode, `OrderPanel` shows "Sign in to trade" and
`OrdersTable` hides cancel when signed out, and a `401` on any write (`AuthRequiredError`)
flips the store back to signed out and reopens the prompt. Netlify Identity and hosted
providers were rejected — one shared Alpaca account makes per-user sign-up meaningless, and
Identity's server helpers would force `netlify dev` locally. See ADR-024.

**Next:** finish Polish (Phase 11: skeletons, a11y pass, responsive QA) and the project
README; plus the deferred WebSocket-behind-BFF item and the unmetered-provider-quota gap on
the public read endpoints. See `docs/06-roadmap.md` for authoritative status.
