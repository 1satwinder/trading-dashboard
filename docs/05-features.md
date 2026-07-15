# 05 — Features & Information Architecture

## Pages

| Page | Purpose | Key UI elements |
| --- | --- | --- |
| **Dashboard / Home** | At-a-glance overview | Portfolio value card, mini watchlist, market movers, news teaser |
| **Watchlist** | Symbols the user follows | Sortable table (desktop) / cards (mobile): symbol, price, % change, sparkline |
| **Portfolio** | Holdings & performance | Total value + day change, allocation donut, performance chart, holdings table, P/L |
| **Chart** | Detailed view for one symbol | Candlestick chart, timeframe tabs (1D/1W/1M/1Y), order panel (simulated Buy/Sell), key stats |
| **Markets** | Discover / browse | Index cards, top gainers/losers, sector heatmap |
| **News** | Market news feed | Article cards, filter by symbol/category |
| **Settings** | Preferences | Theme toggle, display options |

## Key feature flows

- **Symbol search** — top-bar autocomplete (PrimeVue `AutoComplete`) querying the
  market-data provider's search endpoint; results link to the chart / add to watchlist.
- **Watchlist** — add/remove searched symbols; persisted (interim `localStorage`,
  later backend + DB); live quotes from the provider.
- **Paper trading** — from the chart/order panel, place a (paper) order via Alpaca
  through the BFF; reflect order status and resulting positions in the portfolio.

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
8. Markets page (indices + movers + sectors).
9. News page.
10. **Backend-for-frontend (BFF)**: hide keys, cache, proxy providers.
11. **Alpaca paper trading**: order placement + status + positions via BFF.
12. Settings + theme toggle (light theme variant).

## Open questions / decisions pending

- Dedicated **Home/Dashboard** landing page, or land directly on Watchlist?
- Final, **consistent search placeholder** text across pages.
- Logo placement: inside sidebar vs in the top bar (current mockups: in sidebar).
