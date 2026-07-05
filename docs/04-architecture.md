# 04 — Architecture

> This describes the intended structure. It will evolve once scaffolding begins.

## High-level

- **Single Page Application (SPA)** built with Vite.
- **Vue Router** for page navigation.
- **Pinia** stores for state; a **service layer** abstracts data access (mock → real API).
- **Component-driven**: a responsive layout shell + reusable presentational components.

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
├── services/            # data access (marketDataService, etc.)
├── composables/         # useBreakpoint, useFormatCurrency, etc.
├── types/               # shared TypeScript types (Symbol, Quote, Holding, ...)
├── router/              # Vue Router config
└── App.vue / main.ts
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
| `useWatchlistStore` | Watchlist symbols + quotes |
| `usePortfolioStore` | Holdings, cash, derived P/L |
| `useMarketStore` | Indices, movers, sector data |

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
View → Pinia store → Service layer → (mock JSON | real API)
                ↑ derived getters (P/L, totals)
```

Start with mock JSON in the service layer; swap to a real provider later without
touching views/components.
