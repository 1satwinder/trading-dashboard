# 05 — Features & Information Architecture

## Pages

| Page | Purpose | Key UI elements |
| --- | --- | --- |
| **Dashboard / Home** | At-a-glance overview | Portfolio value card, mini watchlist, market movers |
| **Watchlist** | Symbols the user follows | Sortable table (desktop) / cards (mobile): symbol, price, % change, sparkline |
| **Portfolio** | Holdings & performance | Total value + day change, allocation donut, performance chart, holdings table, P/L |
| **Orders** | Paper order activity | Status filter tabs (All/Open/Filled/Canceled) with counts, orders table, cancel an open order |
| **Chart** | Detailed view for one symbol | Candlestick chart, timeframe tabs (1D/1W/1M/1Y), order panel (real Alpaca **paper** Buy/Sell), key stats |
| **Markets** | Discover / browse | Market-status pill, five index cards, US/Canada tabs, gainers / losers / most-active tables, sector heatmap |
| **Settings** | Preferences | Theme toggle, display options |

Orders live on their own page rather than as a second table under Holdings: holdings are a
current-state snapshot, orders are a time-ordered activity log, and stacking two large
tables made the Portfolio page read as cluttered (ADR-019). **News is out of scope** — see
the same ADR.

## Key feature flows

- **Symbol search** — top-bar autocomplete (PrimeVue `AutoComplete`) querying the
  market-data provider's search endpoint; selecting a result opens that symbol's chart
  (`/chart/:symbol`), while a star button on each row toggles it in/out of the watchlist
  without navigating (ADR-022).
- **Watchlist** — add/remove searched symbols; persisted (interim `localStorage`,
  later backend + DB); live quotes from the provider.
- **Paper trading** — from the chart's order panel, review and place a (paper) order via
  Alpaca through the BFF; track status (and cancel) on the Orders page, with fills reflected
  in the portfolio.
- **Markets browsing** — benchmark cards, movers and sectors for the US or Canada, refreshing
  while the market is open; any row or card opens that symbol's chart. No free feed covers
  index levels or the TSX, so indices are **ETF proxies** (SPY/QQQ/DIA/IWM/EWC) and Canada is
  Canadian large caps by their **NYSE listing** — which also keeps every row tradable in the
  paper account. The UI labels both rather than implying otherwise (ADR-020).

## Global UI

- **Top bar:** brand logo, centered search, notifications bell, user avatar/menu.
- **Navigation:** left sidebar (desktop) ↔ bottom tab bar (mobile).
- **Search:** symbol autocomplete (PrimeVue `AutoComplete`).

## Feature backlog (rough priority)

1. ~~Responsive layout shell (sidebar + topbar + bottom nav).~~ ✅
2. ~~`PriceTag`, `Sparkline`, `StatCard` + data table.~~ ✅
3. ~~Watchlist page with mock data.~~ ✅
4. **Symbol search** (real provider) + **watchlist persistence** (`localStorage`).
5. **Live market data** for the watchlist (real quotes).
6. Portfolio page (allocation + holdings + P/L).
7. Chart page (candlestick + timeframe) from real candle data.
8. ~~Markets page (indices + movers + sectors).~~ ✅
9. **Backend-for-frontend (BFF)**: hide keys, cache, proxy providers.
10. **Alpaca paper trading**: order placement + status + positions via BFF.
11. Settings + theme toggle (light theme variant).

## Open questions / decisions pending

- Dedicated **Home/Dashboard** landing page, or land directly on Watchlist?
- Final, **consistent search placeholder** text across pages.
- Logo placement: inside sidebar vs in the top bar (current mockups: in sidebar).
