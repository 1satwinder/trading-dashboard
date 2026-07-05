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

## Global UI

- **Top bar:** brand logo, centered search, notifications bell, user avatar/menu.
- **Navigation:** left sidebar (desktop) ↔ bottom tab bar (mobile).
- **Search:** symbol autocomplete (PrimeVue `AutoComplete` later).

## Feature backlog (rough priority)

1. Responsive layout shell (sidebar + topbar + bottom nav).
2. `PriceTag` + a reusable data table.
3. Watchlist page with mock data.
4. Portfolio page (allocation + holdings + P/L).
5. Chart page (candlestick + timeframe).
6. Markets page (indices + movers + sectors).
7. News page.
8. Settings + theme toggle (light theme variant).
9. Real market-data API integration.
10. Simulated order flow (Buy/Sell → portfolio updates).

## Open questions / decisions pending

- Dedicated **Home/Dashboard** landing page, or land directly on Watchlist?
- Final, **consistent search placeholder** text across pages.
- Logo placement: inside sidebar vs in the top bar (current mockups: in sidebar).
