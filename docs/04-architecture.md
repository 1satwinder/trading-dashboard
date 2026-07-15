# 04 — Architecture

> This describes the intended structure. It will evolve once scaffolding begins.

## High-level

- **Single Page Application (SPA)** built with Vite.
- **Vue Router** for page navigation.
- **Pinia** stores for state; a **service layer** abstracts data access
  (mock → frontend-direct → backend-for-frontend).
- **Component-driven**: a responsive layout shell + reusable presentational components.
- **Full-stack target**: a thin **backend-for-frontend (BFF)** integrates external
  providers (Alpaca for trading, a market-data provider for quotes/search/news).

## Proposed folder structure

```
src/
├── assets/              # static assets, global styles
├── components/
│   ├── layout/          # AppSidebar, AppBottomNav, AppTopbar, SearchBar, UserMenu
│   ├── common/          # PriceTag, Sparkline, StatCard, DataTable wrappers
│   ├── watchlist/       # SymbolRow, SymbolCard
│   ├── portfolio/       # AllocationDonut, HoldingsTable
│   ├── chart/           # PriceChart, OrderPanel, TimeframeTabs
│   ├── markets/         # IndexCard, MoversTable, SectorHeatmap
│   └── news/            # NewsCard
├── views/               # route-level pages (Watchlist, Portfolio, Chart, Markets, News, Settings)
├── stores/              # Pinia stores
├── services/            # data-access boundary
│   ├── marketData.ts    # quotes/search/candles/news (mock → provider → BFF)
│   └── trading.ts       # Alpaca via BFF (orders, positions, account) — later
├── composables/         # useBreakpoint, useFormatCurrency, etc.
├── types/               # shared TypeScript types (Symbol, Quote, Holding, Order, ...)
├── router/              # Vue Router config
└── App.vue / main.ts
```

Once the backend exists, it lives outside `src/` (deployed alongside the SPA):

```
server/                  # backend-for-frontend (BFF) — planned
├── routes/              # /api/search, /api/quote, /api/candles, /api/orders, ...
├── providers/           # Alpaca + market-data clients (hold secret keys)
└── cache/               # response caching to survive tight provider rate limits
```

## Routing (pages)

| Path | View | Notes |
| --- | --- | --- |
| `/` | Dashboard/Watchlist | Default landing (decision: dedicated Home vs Watchlist) |
| `/watchlist` | Watchlist | Followed symbols |
| `/portfolio` | Portfolio | Holdings + allocation + performance |
| `/chart/:symbol` | Chart | Single-symbol chart + order panel |
| `/markets` | Markets | Indices, movers, sectors |
| `/news` | News | Market news feed |
| `/settings` | Settings | Theme, preferences |

## Pinia stores (initial)

| Store | Responsibility |
| --- | --- |
| `useUiStore` | Theme, sidebar collapsed/expanded, active breakpoint |
| `useWatchlistStore` | Watchlist symbols + quotes (persisted; interim `localStorage`) |
| `useSearchStore` | Symbol search query + results |
| `usePortfolioStore` | Holdings, cash, derived P/L (mock → Alpaca positions) |
| `useMarketStore` | Indices, movers, sector data |
| `useTradingStore` | Order tickets, placement, and order status (via BFF) — later |

> A `useUiStore` for layout state is what makes the responsive sidebar ↔ bottom-nav
> toggle clean and centralized.

## Key reusable components

- `PriceTag` — formats a number, colors it green/red, adds an up/down arrow. Used everywhere.
- `Sparkline` — tiny inline SVG trend chart for tables/cards.
- `StatCard` — labeled metric (portfolio value, day change).
- `SymbolRow` / `SymbolCard` — table row on desktop, card on mobile.
- `PriceChart` — the large candlestick chart (lightweight-charts).

## Data flow

```
View → Pinia store → Service layer → (mock JSON | frontend-direct | BFF)
                ↑ derived getters (P/L, totals)
```

The service layer is the seam that lets the data source evolve in three stages
**without touching views or components**.

## External integration: why a backend-for-frontend

Two hard constraints drive the architecture:

1. **Secrets can't live in the browser.** Alpaca trading keys can place/cancel orders
   and read the account — even on a paper account. Anything shipped to the browser is
   public (Network tab, JS bundle). Market-data keys leak the same way.
2. **CORS + rate limits.** Alpaca's trading API is not built for browser CORS (direct
   calls fail). Free market-data tiers are small (e.g. Alpha Vantage ≈ 25 req/day), so
   responses must be **cached** — which only a server can do reliably/shared.

### Rule of thumb

| Concern | Where it runs |
| --- | --- |
| Trading (Alpaca): orders, positions, account | **Backend only** (never the browser) |
| Market data / symbol search | Browser OK for a **local-dev spike**; **BFF** for anything deployed |
| Watchlist (saved symbols) | Client-side `localStorage` first; backend + DB later |

### Evolution

**Stage 1 — mock (current).** Service returns static/mock JSON.

**Stage 2 — frontend-direct spike (interim, local dev only).**
```
Browser (service layer) ──▶ Market-data provider (symbol search, quotes)
Watchlist ──▶ localStorage
```
Fast to build; **key is exposed and quota is tiny — do not deploy this**, and never
put an Alpaca key here.

**Stage 3 — backend-for-frontend (target).**
```
Browser ──▶ /api/* (our BFF) ──▶ Market-data provider   (keys hidden, cached)
                              └─▶ Alpaca paper trading   (keys hidden, server-side)
Watchlist ──▶ (interim) localStorage  →  (later) BFF + DB
```
The BFF holds all secrets, caches market data, and is the only thing that talks to
Alpaca. The frontend only ever calls our own `/api/*`.
