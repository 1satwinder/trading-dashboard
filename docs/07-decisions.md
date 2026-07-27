# 07 — Decision Log (ADRs)

Lightweight Architecture Decision Records. Append a new entry whenever a meaningful
decision is made. Keep them short.

---

## ADR-001 — Front-end framework: Vue 3

- **Status:** Accepted
- **Context:** Need a modern reactive framework for a portfolio SPA.
- **Decision:** Use Vue 3 with the Composition API and `<script setup>`.
- **Consequences:** Pairs with Pinia + Vue Router; great DX and TS support.

## ADR-002 — Language: TypeScript

- **Status:** Accepted
- **Context:** Want type safety and a stronger portfolio signal.
- **Decision:** Use TypeScript throughout.
- **Consequences:** Slightly more setup; better tooling and fewer runtime bugs.

## ADR-003 — State management: Pinia

- **Status:** Accepted
- **Decision:** Use Pinia (official Vue store) for app state.
- **Consequences:** Typed, modular stores; simple DevTools integration.

## ADR-004 — UI: PrimeVue + Tailwind CSS

- **Status:** Accepted
- **Context:** Want rich components (tables, menus) plus flexible responsive layout.
- **Decision:** PrimeVue (Aura dark, styled mode) for components; Tailwind +
  `tailwindcss-primeui` for layout/responsive and shared tokens.
- **Consequences:** Clear division of labor; avoids CSS conflicts.

## ADR-005 — Theme: dark-first

- **Status:** Accepted
- **Context:** Trading apps are typically dark; green/red pop on dark backgrounds.
- **Decision:** Build dark-first; add light theme as a later toggle.
- **Consequences:** Design tokens defined for dark; light variant deferred to the Polish
  phase (since delivered — persisted light/dark toggle).

## ADR-006 — Charts: lightweight-charts

- **Status:** Accepted
- **Decision:** Use TradingView's `lightweight-charts` for price/candlestick charts;
  custom SVG `Sparkline` for inline mini-charts.
- **Consequences:** Purpose-built financial charts; small bundle.

## ADR-007 — Data strategy: mock-first

- **Status:** Accepted
- **Context:** UI should be solid before depending on a rate-limited external API.
- **Decision:** Start with mock/static JSON behind a service layer; integrate a real
  provider in a later phase.
- **Consequences:** Provider can be swapped without touching views/components.

## ADR-008 — Scope: full-stack app with real data + paper trading

- **Status:** Accepted
- **Context:** The project began as a front-end showcase on mock data. Goal now is to
  demonstrate full-stack skills with real market data and real (paper) order flow.
- **Decision:** Expand scope to a full-stack app: live market data + symbol search, a
  persisted watchlist, and **paper trading via Alpaca**. Real money stays out of scope.
- **Consequences:** Requires external providers and (eventually) our own backend;
  roadmap re-planned into Phases 4–11.

## ADR-009 — Data providers

- **Status:** Accepted
- **Context:** Need trading + market data. Alpaca has no symbol search; Alpha Vantage's
  free tier is ~25 req/day (tight). Finnhub has a friendlier free tier (~60/min) with
  search, quotes, candles, news, and CORS.
- **Decision:** **Alpaca (paper)** for trading; **Finnhub** for market data + symbol
  search.
- **Consequences:** Two integrations (Finnhub + Alpaca). Caching still worthwhile;
  provider stays behind the service layer / BFF in case it changes.

## ADR-010 — Integration architecture: backend-for-frontend (BFF)

- **Status:** Accepted (direction), with an interim frontend-direct step
- **Context:** Alpaca keys are secret and its API isn't browser-CORS-friendly; market
  provider keys leak in the browser and free tiers need caching.
- **Decision:** **Trading always goes through our backend.** Market data may be called
  **frontend-direct as a local-dev spike only**; production routes everything through a
  thin **BFF** built as **TypeScript serverless functions (Vercel/Netlify)** that hides
  keys and caches.
- **Consequences:** Frontend calls only `/api/*` in the target state; the service layer
  isolates the frontend-direct → BFF transition.

## ADR-011 — Watchlist persistence

- **Status:** Accepted
- **Context:** Watchlist is user data but needs no external API to start.
- **Decision:** Persist in **`localStorage`** first (no backend); migrate to a backend +
  DB later for multi-device/multi-user.
- **Consequences:** Fast start; a later migration path when the BFF/DB exist.

## ADR-012 — Account model: single shared paper account

- **Status:** Accepted
- **Context:** Demonstrating paper trading doesn't require multi-user infrastructure.
- **Decision:** Use a **single shared Alpaca paper account** (no user auth) for the demo.
- **Consequences:** No auth/user system needed now; per-user accounts + auth remain a
  possible future extension (would likely use Alpaca Broker API).

## ADR-013 — Real-time quotes via Finnhub WebSocket

- **Status:** Accepted (interim frontend-direct, like ADR-010)
- **Context:** The watchlist showed static REST quotes. Live prices need a push feed;
  polling `/quote` per symbol would burn the free-tier quota. Finnhub offers a trade
  WebSocket (`wss://ws.finnhub.io`).
- **Decision:** Stream trades over a **single shared WebSocket** behind a new
  `marketStream` service (mirroring `marketData`). The store **buffers ticks and flushes
  the latest price per symbol every ~400ms**, recomputing change % from `previousClose`.
  The socket reconnects with exponential backoff and reconciles subscriptions as the
  watchlist changes. Called **frontend-direct in local dev only**; it moves behind the
  BFF (proxied WS/SSE) in Phase 6, same as REST.
- **Consequences:** Smooth live updates without hammering the REST quota; the buffer keeps
  re-renders cheap. Consumers depend only on a provider-agnostic `Trade` type, so the
  BFF transition won't touch stores or components. Ticks only arrive during market hours.

## ADR-014 — Chart data: synthetic candles now, real bars via the BFF later

- **Status:** Accepted (interim mock, like ADR-007)
- **Context:** The Chart page (Phase 5) needs OHLCV candles at several intervals.
  **Finnhub's `/stock/candle` is a premium endpoint** — a free key returns `403` — so
  there is no frontend-direct path for candles like there is for quotes/search.
- **Decision:** Generate **deterministic synthetic candles** on the client for now
  (`marketData.fetchCandles`, a seeded random walk keyed by symbol + timeframe, stable
  across reloads). Timeframe tabs are `{range, resolution}` presets (`CHART_TIMEFRAMES`).
  Keep it behind the service seam so **Phase 6 swaps in real bars — Alpaca IEX
  (`/v2/stocks/{symbol}/bars`, free) via the BFF** — without touching the store or the
  `PriceChart` component. Charting library: **TradingView `lightweight-charts` v5**
  (candlestick + overlay volume histogram; no built-in timeframe selector, so tabs are
  ours).
- **Consequences:** Chart UX is fully buildable now with no backend, keys, or market-hours
  dependency. Real candles are a drop-in later. Alpaca market data stays server-side
  (secret keys, CORS), consistent with ADR-010.

## ADR-015 — Concrete BFF: standalone Hono `/api`, in-memory cache, WS stays frontend-direct

- **Status:** Accepted (realizes ADR-010, Phase 6)
- **Context:** ADR-010 committed to a backend-for-frontend to hide keys and centralize
  the data layer. Phase 6 makes it concrete. Symbol search + quotes were still
  frontend-direct (exposed `VITE_FINNHUB_API_KEY`); we want them behind a server before
  layering on Portfolio and Alpaca paper trading.
- **Decision:** Stand up a **standalone Hono server in `server/`** (`@hono/node-server`,
  `tsx` in dev on `PORT` 8787) exposing `GET /api/health`, `/api/search?q=`, and
  `/api/quotes?symbols=`. The provider client + response mapping moved out of
  `src/services/marketData.ts` into `server/finnhub.ts`; the client service is now a thin
  `fetch('/api/*')` wrapper. **Vite proxies `/api` → the BFF** in dev, so the browser makes
  same-origin calls with no CORS and never sees the REST key. A small **in-memory TTL
  cache** (search ~1h, quotes ~10s) protects Finnhub's free-tier quota. Shared shapes
  (`Quote`, `SymbolSearchResult`) are imported type-only from `src/types/market.ts` so the
  contract stays single-source. **Scope is deliberately narrow:** candles stay mock and the
  **live WebSocket stays frontend-direct** (still carries `VITE_FINNHUB_API_KEY`).
- **Consequences:** The Finnhub REST key is server-side; stores/views were untouched thanks
  to the service seam. Two honest gaps remain, deferred by design: real candles (Alpaca IEX
  bars via the BFF) and **WS key-hiding** (proxied WS/SSE), both revisited later — the WS
  exposure is called out at deploy (Phase 11). The in-memory cache resets per process; a
  shared cache is only relevant once deployed serverless.

---

### Open decisions (not yet resolved)

- Dedicated Home/Dashboard landing page vs landing on Watchlist.
- Consistent search placeholder text.
- Logo placement (sidebar vs top bar).
