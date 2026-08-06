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

- **Status:** Superseded by ADR-016 (real candles now served from Alpaca via the BFF)
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
  exposure is called out at deploy (Phase 12). The in-memory cache resets per process; a
  shared cache is only relevant once deployed serverless.

## ADR-016 — Real chart candles from Alpaca IEX via the BFF

- **Status:** Accepted (supersedes ADR-014, Phase 6)
- **Context:** ADR-014 shipped the Chart page on **synthetic** candles because Finnhub's
  `/stock/candle` is premium (free key → `403`). With the BFF in place (ADR-015), we can
  now hide provider keys server-side, so real candles are viable without exposing anything
  to the browser. Alpaca provides free historical bars (`GET /v2/stocks/{symbol}/bars`).
- **Decision:** Add a server-side Alpaca client (`server/alpaca.ts`) and a
  `GET /api/candles?symbol=&timeframe=` route. It fetches the **free `iex` feed** with
  `APCA-API-KEY-ID`/`APCA-API-SECRET-KEY` (from `ALPACA_API_KEY_ID` / `ALPACA_API_SECRET_KEY`,
  server-only), owns the timeframe → `{timeframe, limit, lookback}` mapping, requests
  `sort=desc` + an explicit `start` (Alpaca defaults `start` to the start of *today*, which
  would starve daily/weekly ranges) and reverses bars to oldest→newest, mapping
  `{t,o,h,l,c,v}` → `Candle` (epoch **seconds**). Results are cached (intraday ~30–60s,
  daily/weekly ~5m). The client `marketData.fetchCandles` becomes a thin `/api/candles`
  call and the synthetic generator is deleted. The TTL cache + provider-error type are
  factored into shared `server/cache.ts` + `server/errors.ts` (used by Finnhub too).
- **Consequences:** The Chart page runs on real market data with keys hidden and the store /
  `PriceChart` untouched (service seam held). Trade-offs of the free tier: `iex` is thinner
  than `sip` and the latest bar is ~15 min delayed; off-hours/invalid symbols may return few
  or no bars (the chart's empty/loading states already cover this). Alpaca **trading**
  (orders/positions) remains a later phase; the live WebSocket is still frontend-direct.

## ADR-017 — Alpaca account + positions via the BFF (read-only)

- **Status:** Accepted (Phase 7)
- **Context:** Portfolio (Phase 8) needs real holdings + account metrics. Rather than build
  it on mock data and rewire later, we fetch the real Alpaca data first. Account/positions
  live on Alpaca's **Trading API** (`paper-api.alpaca.markets`) — a different host from the
  market-data API (`data.alpaca.markets`) already used for candles — but share the same
  key/secret. No order placement yet (that's a write; Phase 9).
- **Decision:** Extend `server/alpaca.ts` with a second base URL (`ALPACA_TRADING_URL`,
  default `paper-api.alpaca.markets`) and a shared `alpacaRequest()` helper (auth headers +
  `ProviderError` mapping, reused by candles). Add `GET /api/account` → `fetchAccount()` and
  `GET /api/positions` → `fetchPositions()`. Alpaca returns numbers as strings, so the BFF
  parses them and maps: account → `PortfolioSummary` (`totalValue`=equity, `buyingPower`,
  `dayChange`=equity−`last_equity`, `dayChangePercent`); positions → `Position[]` (qty, side,
  avg entry, current price, market value, cost basis, unrealised P/L + intraday P/L). Cached
  ~5s. Client `marketData.fetchPortfolioSummary` now hits `/api/account` (mock deleted) and a
  new `fetchPositions` hits `/api/positions`; `usePortfolioStore` gains `positions` +
  `loadPositions()`. The existing Watchlist StatCards become real with no UI change.
- **Consequences:** Portfolio metrics are real and keys stay server-side; the Portfolio page
  (Phase 8) builds directly on `positions`. `dayChange` follows Alpaca's `last_equity`
  (previous trading day 16:00 ET), so it can read 0 outside market hours.
- **Follow-up (Phase 8):** added `GET /api/portfolio/history` → `fetchPortfolioHistory(range)`
  (`GET /v2/account/portfolio/history`), mapping the parallel `timestamp`/`equity` arrays to a
  `PortfolioHistory` series for the performance chart. A UI range (1W–ALL) maps to Alpaca's
  `period`/`timeframe`; leading pre-funding zero-equity points are dropped so the line starts
  at real money; cached ~30s. **Still deferred:** place/cancel + close-position (Phase 9) and
  account configurations (not needed now).

## ADR-018 — Alpaca paper trading (orders) via the BFF

- **Status:** Accepted (Phase 9)
- **Context:** The chart's order ticket was UI-only. Placing orders is the app's first
  **write** path, and Alpaca's trading API is both key-bearing and not browser-CORS-friendly,
  so it must stay server-side (ADR-009). Orders also change account equity and positions,
  which the BFF caches.
- **Decision:** Add four routes on the existing Trading host: `POST /api/orders`,
  `GET /api/orders`, `GET /api/orders/:id`, `DELETE /api/orders/:id`. Supporting changes:
  - `alpacaRequest()` grows `method`/`body` support and handles Alpaca's `204` (cancel).
  - **Error passthrough:** `403` (insufficient buying power) and `422` (bad params, unknown
    asset) keep their status and carry Alpaca's own `message` instead of being flattened into
    a generic `502`, because they're user-actionable. The client `api()` helper likewise
    prefers the BFF's `{ error }` text, so "insufficient buying power" reaches the toast.
    `401` still becomes `502` (that's a server misconfiguration, not a user error).
  - **Cache invalidation:** `server/cache.ts` gains `invalidate(...prefixes)`; every write
    drops `orders:`, `account`, `positions` and `history:` so a fill shows up immediately
    rather than after the 5s account TTL.
  - **Validation before spending an upstream call:** the route rejects a missing symbol,
    non-positive qty, unknown side/type/TIF, and a `limit`/`stop` order without its price.
  - **Ticket vs response types:** orders placed elsewhere (e.g. Alpaca's dashboard) can carry
    types/TIFs we don't offer, so `OrderType`/`OrderTimeInForce` cover Alpaca's full equity
    sets for *responses*, while `TicketOrderType`/`TicketTimeInForce` (`market|limit|stop`,
    `day|gtc`) constrain what we *place*.
  - **Polling, not streaming:** `useOrdersStore` re-polls every ~5s but only while an order is
    still working. Alpaca's trade-updates stream needs server-side auth and the
    WebSocket-behind-BFF item is still open from Phase 6, so it's deliberately out of scope.
  - UI: `OrderPanel` gains a time-in-force select and a review-and-confirm dialog; a new
    `OrdersCard` on the Portfolio page lists orders with status tags and cancels open ones.
- **Consequences:** Real paper orders work end to end with keys server-side, and fills flow
  into the portfolio without a manual refresh. Trade-offs: a `day` market order placed outside
  regular trading hours sits at `accepted` rather than filling, and polling means order state
  can lag by up to ~5s. **Security note for Phase 12:** the BFF has no auth, so a *deployed*
  instance would let anyone trade the shared paper account (ADR-012) — acceptable for local
  dev, but deploying needs at least a rate limit or a shared secret. **Deferred:**
  bracket/OCO/OTO classes, `PATCH` replace-order, close-position, cancel-all,
  options/crypto, and fractional/notional orders.

## ADR-019 — Orders get their own page; News dropped from scope

- **Status:** Accepted (Phase 9, follow-up)
- **Context:** Phase 9 first shipped the orders list as a card below Holdings on the Portfolio
  page. In practice that page then had **two large tables stacked**, which read as cluttered
  and left neither as the obvious primary content. The two also answer different questions:
  holdings are a *current-state snapshot* you glance at, orders are a *time-ordered activity
  log* you scan and act on. Meanwhile the nav had five primary items, one of which (`News`)
  was still an empty placeholder.
- **Decision:** Give orders a top-level route (`/orders`) and nav tab, and **remove News**
  entirely — nav item, route, stub view, and its roadmap/feature entries — freeing the slot so
  the nav item count stays at five (no mobile tab-bar layout change; that bar is flex-based
  with no cap). Nav order becomes Watchlist, Portfolio, Orders, Chart, Markets, keeping the two
  account pages adjacent. Because the page has room the card never had, it also gains
  **status filter tabs** (All / Open / Filled / Canceled) with live counts; the buckets are
  mutually exclusive and exhaustive (open → still working, filled → complete fill, canceled →
  every other terminal state) so the counts sum to All. Filtering is client-side over the
  already-polled list, so switching tabs is instant and costs no extra upstream calls.
  `OrdersCard` was split into `OrdersView` (owns the store, filter, and cancel/toast flow) and
  a presentational `OrdersTable` (rows in, `cancel` out). The order-polling lifecycle moved
  from `PortfolioView` to `OrdersView`, and polling now refreshes **silently** (`load(status,
  { silent: true })`) so it doesn't toggle the table's loading state every 5s.
- **Loading state:** we deliberately do **not** bind PrimeVue's `DataTable :loading`. Because
  cached BFF reads return in a few milliseconds, the `true → false` flip can orphan the
  overlay's leave-transition and strand a `p-datatable-mask` (with `pointer-events: auto`)
  over the table, silently swallowing clicks on the cancel buttons. The page renders a
  `ProgressSpinner` for the initial load instead.
- **Consequences:** Portfolio is back to a single table and reads cleaner; orders get room for
  filters and future columns. Two trade-offs: polling now only runs while the Orders page is
  open, so a fill that happens while you're elsewhere shows up on next visit rather than live
  (acceptable — the portfolio reloads after any write anyway); and News is no longer planned,
  so Phase 10 is Markets only. Finnhub's news endpoints simply go unused.

## ADR-020 — Markets page on US-listed proxies (Alpaca only)

- **Status:** Accepted (Phase 10)
- **Context:** The Markets page needs three things — benchmark index cards, movers tables and a
  sector heatmap — for **US and Canadian** markets. Two of those have no free data source:
  - **Index levels.** `^GSPC` / `^IXIC` / `^GSPTSE` are premium on Finnhub, and Alpaca covers
    only US stocks and ETFs. There is no free quote for an index itself.
  - **The TSX.** Finnhub's free tier is **US-only** — `RY.TO` returns `Symbol not supported`,
    and Canadian data is a paid international add-on. Alpaca doesn't list Canadian venues at all.

  Finnhub also has no screener endpoint, so despite the earlier roadmap note that Phase 10 would
  "consume Finnhub data", it turned out Finnhub can serve **none** of this page.
- **Decision:** Build the page entirely on **Alpaca's free Basic plan**, approximating the two
  gaps deliberately rather than paying for data or adding an unofficial provider:
  - **Indices → ETF proxies.** `SPY` (S&P 500), `QQQ` (Nasdaq 100), `DIA` (Dow 30),
    `IWM` (Russell 2000), `EWC` (Canada). The card shows the benchmark name with the proxy
    ticker beside it, so it never claims to be the index itself.
  - **Canada → US listings.** A curated universe of ~28 Canadian large caps by their **NYSE**
    listing (`RY`, `TD`, `ENB`, `CNQ`, `CNI`, `CP`, `SHOP`, `AEM`, …). Prices are USD and track
    the TSX lines closely, and — the deciding factor — every row stays **tradable in the paper
    account**, so clicking through to the chart and placing an order still works end to end.
    Real TSX symbols would be dead ends.
  - **Sectors.** US tiles are the 11 SPDR Select Sector ETFs. Canada has no US-listed sector
    ETFs, so its tiles are the equal-weighted mean of the curated universe grouped by sector —
    derived from the snapshot the movers table already fetched, at no extra upstream cost.
- **Honesty in the UI:** `MarketMovers.source` distinguishes `screener` (a real whole-market
  scan) from `universe` (the curated Canadian list), and the card subtitle says which. Sector
  tiles show either the backing ETF or an "N holdings" count. A curated list never reads as a
  full-market scan.
- **Filtering the screener:** Alpaca's movers/most-actives rank the raw tape, which is topped by
  instruments no trading app would surface — live samples included `ATTO +4544%`, `MUA.RT` at
  $0.004 and `FTHAW` (a warrant) at $0.63. Ranked lists were also swamped by **geared
  single-stock ETFs**, which is structural rather than incidental: a 2x fund mechanically
  out-moves whatever it tracks, so left alone the board fills with derivatives of the same few
  stocks. So we over-fetch the screener's maximum (`top=50`) and filter down: price ≥ $5,
  |change| ≤ 100% (a bigger day is almost always a reverse split, not a move), then a
  `GET /v2/assets/{symbol}` lookup (cached 24h — names are static) to drop non-tradable symbols,
  odd exchanges, warrants/rights/units, and any name that looks like both a fund *and* a geared
  one. That lookup does double duty: the screener returns symbols only, so it's also where
  company names come from. Plain 1x funds are kept — they're ordinary instruments.
- **Requests:** everything is batched. `GET /v2/stocks/snapshots?symbols=…` prices a whole list
  in one call (`dailyBar` vs `prevDailyBar` for the day's move), and one multi-symbol
  `/v2/stocks/bars` call covers all five index sparklines. `/v2/clock` drives a market-status
  pill and gates polling, which runs every 60s **only while the market is open** — prices don't
  move overnight, so polling then would just burn quota. TTLs: clock/indices 30s, movers and
  sectors 60s, assets 24h.
- **Consequences:** The whole page runs on one provider and the free tier, with no new keys.
  Prices carry the same IEX caveat as the chart (ADR-016): `prevDailyBar` is consolidated but
  intraday values are IEX-only, so they can lag the composite slightly. The curated Canadian
  universe is **hand-maintained** — it won't track index membership changes, and its
  "gainers/losers" are only the ends of ~28 names, not a market scan. Real TSX coverage stays
  out of scope until there's a data source that justifies it. Shared Alpaca transport moved to
  `server/alpacaClient.ts` so `alpaca.ts` and `markets.ts` can both use it.

## ADR-021 — Deploy to Netlify: Functions BFF, WS stays frontend-direct, auth gap accepted

- **Status:** Accepted (Phase 12)
- **Context:** The BFF (`server/`) was a standalone `@hono/node-server` process, fine for
  local dev but not directly deployable to Netlify, which runs static assets + serverless
  functions rather than a long-lived Node process. Two open items were already flagged for
  this phase: the live WebSocket is still frontend-direct (ADR-015), and the BFF has no auth
  (ADR-018), which matters once `/api/orders` is reachable by anyone.
- **Decision:**
  - **BFF → Netlify Function.** Extracted the Hono app + all routes out of `server/index.ts`
    into a runtime-agnostic `server/app.ts` (just the `Hono` instance, no `serve()`/`dotenv`).
    `server/index.ts` keeps the local-dev entry point (`@hono/node-server`, unchanged
    behavior); a new `netlify/functions/api.ts` mounts the same app via `hono/netlify`'s
    `handle()` for production. `netlify.toml` redirects `/api/*` to the function (mirroring
    the Vite dev proxy) and adds an SPA fallback (`/* → /index.html`) since
    `src/router/index.ts` uses `createWebHistory`.
  - **Git-based continuous deployment.** The repo is on GitHub; Netlify's dashboard is
    connected directly to it, so every push to `main` triggers a build + deploy with no CLI
    or agent step. No Netlify MCP server was available, so the one-time GitHub-App
    authorization and env var setup were done by hand in Netlify's UI.
  - **WS stays frontend-direct, kept as-is.** `VITE_FINNHUB_API_KEY` still ships in the
    client bundle in production. Netlify Functions can't hold a persistent WebSocket open,
    so proxying it server-side would need a different runtime (a small always-on process
    elsewhere) — out of scope for this deploy. Accepted because it's a **read-only
    market-data key** with no trading power; exposure only risks API quota, not money.
  - **BFF auth gap accepted, not fixed.** `/api/orders` (place/cancel) and account/positions
    remain unauthenticated in production, same as local dev. It's a **paper** account
    (fake money, ADR-012), so the acceptable-risk case from ADR-018 was taken as-is rather
    than adding a shared secret or rate limit.
- **Consequences:** The frontend/BFF split needed no rearchitecting — only an extra thin
  entry point — because the service-layer seam (ADR-010) and the shared `server/app.ts`
  kept provider logic in one place. Two honest, documented gaps ship to production: the
  Finnhub WS key is publicly visible in the bundle, and the shared paper account is
  reachable by anyone with the URL. Both are called out here rather than left implicit;
  revisiting either (WS-behind-a-proxy, a shared-secret header, or rate limiting) remains
  straightforward future work if the project's risk profile changes.

---

### Open decisions (not yet resolved)

- Dedicated Home/Dashboard landing page vs landing on Watchlist.
- Consistent search placeholder text.
- Logo placement (sidebar vs top bar).
